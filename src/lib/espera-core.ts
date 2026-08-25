// A caixa de espera da Central — as regras, sem tela.
//
// A Central sabe cobrar; esta é a metade que tranquiliza: tudo que a
// cerimonialista pediu e ainda não voltou, atravessando eventos. A
// função não é mostrar tudo que está pendente — é separar o que está
// sob controle do que exige atenção humana.
//
// Nenhum estado novo: as faixas são LEITURA derivada dos campos que a
// 108/109/114 já gravam. Tudo puro, testável sem banco.

import {
  MAX_TENTATIVAS,
  type StatusSolicitacao,
  type TipoSolicitacao,
} from "@/lib/solicitacoes-core";
import { plural } from "@/lib/format";

/** O que uma linha da espera precisa saber (já lido do banco). */
export type SolicitacaoEspera = {
  id: string;
  supplierId: string;
  fornecedorNome: string;
  /** o fornecedor tem como ser alcançado? (whatsapp/telefone/e-mail) */
  fornecedorTemCanal: boolean;
  eventId: string;
  eventoNome: string | null;
  eventoData: string | null;
  /** events.status — concluído/cancelado saem da espera (o cron os ignora) */
  eventoStatus: string;
  responsavelMembroId: string | null;
  responsavelNome: string | null;
  tipo: TipoSolicitacao;
  titulo: string;
  status: StatusSolicitacao;
  prazoAte: string | null;
  tentativas: number;
  enviadaEm: string | null;
  reenviadaEm: string | null;
  roteiroItemId: string | null;
  /** batida viva a que está anexada, se houver */
  batidaStatus: "na_fila" | "segurada" | "enviada" | "cancelada" | null;
  batidaSeguradaEm: string | null;
  /** do link do fornecedor (fornecedor_acesso) — POR LINK, não por item */
  linkUltimaAbertura: string | null;
  /** tarefa-par da escalada (via task_id), quando existe e está pendente */
  tarefaPendenteId: string | null;
};

export type FaixaEspera =
  | "sai_hoje"
  | "com_o_sistema"
  | "atencao"
  | "precisa_de_voce";

export type LinhaEspera = {
  solicitacao: SolicitacaoEspera;
  faixa: FaixaEspera;
  /** frase curta, em tempo — nunca em status */
  rotulo: string;
  /** o sinal de peso especial, quando dá para afirmar */
  abriuENaoRespondeu: boolean;
  /** dias completos desde o 1º envio (espera honesta total); null sem envio */
  esperaDias: number | null;
};

const DIA = 86_400_000;

function dias(deIso: string, agoraIso: string): number {
  return Math.max(0, Math.floor((Date.parse(agoraIso) - Date.parse(deIso)) / DIA));
}


export function haDias(n: number): string {
  if (n === 0) return "hoje";
  return `há ${n} ${plural(n, "dia", "dias")}`;
}

/** As eternas da 109: o fluxo real produz `reenviada`; `enviada` com
 *  tentativas no teto só existe pela importação — e o sistema nunca mais
 *  vai agir sobre elas. */
export function importadaEsgotada(s: SolicitacaoEspera): boolean {
  return (
    s.status === "enviada" && s.tentativas >= MAX_TENTATIVAS && !s.prazoAte
  );
}

/** `horario` cujo item saiu do roteiro: cobrar seria cobrar um momento
 *  que não existe. */
export function horarioOrfa(s: SolicitacaoEspera): boolean {
  return s.tipo === "horario" && s.roteiroItemId === null;
}

/** O que dá para AFIRMAR com a abertura por link: ele entrou na página
 *  depois do último envio e o pedido segue sem resposta. */
export function abriuDepoisDoEnvio(
  s: SolicitacaoEspera
): boolean {
  if (!s.linkUltimaAbertura) return false;
  const marco = s.reenviadaEm ?? s.enviadaEm;
  if (!marco) return false;
  return Date.parse(s.linkUltimaAbertura) > Date.parse(marco);
}

export function classificarEspera(
  s: SolicitacaoEspera,
  agoraIso: string
): LinhaEspera | null {
  // fora da população: resolvidas, canceladas, eventos que acabaram
  if (s.status === "respondida" || s.status === "cancelada") return null;
  if (s.eventoStatus === "concluido" || s.eventoStatus === "cancelado") {
    return null;
  }

  const abriu = abriuDepoisDoEnvio(s);
  const espera = s.enviadaEm ? dias(s.enviadaEm, agoraIso) : null;

  // ---- precisa de você: o sistema parou; o próximo passo é humano ----
  if (s.status === "expirada") {
    return {
      solicitacao: s,
      faixa: "precisa_de_voce",
      rotulo: `sem resposta após ${s.tentativas} ${plural(s.tentativas, "cobrança", "cobranças")} — ligar`,
      abriuENaoRespondeu: abriu,
      esperaDias: espera,
    };
  }
  if (importadaEsgotada(s)) {
    const desde = s.enviadaEm ? s.enviadaEm.slice(0, 10) : null;
    const [, m, d] = (desde ?? "--").split("-");
    return {
      solicitacao: s,
      faixa: "precisa_de_voce",
      rotulo: desde
        ? `importada do canal antigo · sem resposta desde ${d}/${m}`
        : "importada do canal antigo · sem resposta",
      abriuENaoRespondeu: abriu,
      esperaDias: espera,
    };
  }

  // ---- pendente: ainda nem saiu — o dono aqui é a fila ----
  if (s.status === "pendente") {
    if (s.batidaStatus === "na_fila") {
      return {
        solicitacao: s,
        faixa: "sai_hoje",
        rotulo: "na fila de hoje",
        abriuENaoRespondeu: false,
        esperaDias: null,
      };
    }
    if (s.batidaStatus === "segurada") {
      const n = s.batidaSeguradaEm ? dias(s.batidaSeguradaEm, agoraIso) : 0;
      return {
        solicitacao: s,
        faixa: "atencao",
        rotulo: `você segurou ${haDias(n)}`,
        abriuENaoRespondeu: false,
        esperaDias: null,
      };
    }
    if (!s.fornecedorTemCanal) {
      // o cron pula fornecedor sem canal para sempre — sem aviso, nunca sai
      return {
        solicitacao: s,
        faixa: "atencao",
        rotulo: "sem canal de contato — cadastre WhatsApp ou e-mail",
        abriuENaoRespondeu: false,
        esperaDias: null,
      };
    }
    return {
      solicitacao: s,
      faixa: "com_o_sistema",
      rotulo: "entra na fila amanhã",
      abriuENaoRespondeu: false,
      esperaDias: null,
    };
  }

  // ---- vivas (enviada/reenviada) ----
  const cobranca =
    s.tentativas >= 2 ? `cobrado ${s.tentativas}× · ` : "";
  const esperaTxt =
    espera !== null ? `esperando ${haDias(espera)}` : "aguardando";

  if (horarioOrfa(s)) {
    return {
      solicitacao: s,
      faixa: "atencao",
      rotulo: "o item saiu do roteiro — revisar o pedido",
      abriuENaoRespondeu: abriu,
      esperaDias: espera,
    };
  }

  if (abriu) {
    const marco = s.linkUltimaAbertura!;
    const nAbriu = dias(marco, agoraIso);
    return {
      solicitacao: s,
      faixa: "atencao",
      rotulo: `abriu o link ${haDias(nAbriu)} e não respondeu`,
      abriuENaoRespondeu: true,
      esperaDias: espera,
    };
  }

  const prazoPerto =
    s.prazoAte !== null &&
    Date.parse(s.prazoAte) - Date.parse(agoraIso) <= 72 * 3_600_000;

  if (s.tentativas >= MAX_TENTATIVAS || prazoPerto) {
    return {
      solicitacao: s,
      faixa: "atencao",
      rotulo: `${cobranca}${esperaTxt}`,
      abriuENaoRespondeu: false,
      esperaDias: espera,
    };
  }

  return {
    solicitacao: s,
    faixa: "com_o_sistema",
    rotulo: `${cobranca}${esperaTxt}`,
    abriuENaoRespondeu: false,
    esperaDias: espera,
  };
}

// ------------------------------------------------------------- ordenação

const PESO_FAIXA: Record<FaixaEspera, number> = {
  precisa_de_voce: 0,
  atencao: 1,
  com_o_sistema: 2,
  sai_hoje: 3,
};

/** Faixa primeiro; dentro dela, quem abriu-e-ignorou; depois, quem
 *  espera há mais tempo. A data do evento NUNCA ordena. */
export function ordenarEspera(linhas: LinhaEspera[]): LinhaEspera[] {
  return [...linhas].sort((a, b) => {
    const f = PESO_FAIXA[a.faixa] - PESO_FAIXA[b.faixa];
    if (f !== 0) return f;
    if (a.abriuENaoRespondeu !== b.abriuENaoRespondeu) {
      return a.abriuENaoRespondeu ? -1 : 1;
    }
    return (b.esperaDias ?? -1) - (a.esperaDias ?? -1);
  });
}

// ------------------------------------------------------------ agrupamento

export type GrupoEspera = {
  supplierId: string;
  fornecedorNome: string;
  /** a pior faixa entre as linhas do grupo */
  faixa: FaixaEspera;
  /** a espera mais velha do grupo */
  esperaDias: number | null;
  abriuENaoRespondeu: boolean;
  linhas: LinhaEspera[];
  /** o que o Cobrar de novo pode anexar (vivas menos órfãs) */
  anexaveisIds: string[];
  /** batida enviada há menos de 3 dias → aviso antes do toque */
  ultimaCobrancaDias: number | null;
};

export function agruparPorFornecedor(
  linhas: LinhaEspera[],
  batidasEnviadas: { supplierId: string; enviadaEm: string | null }[],
  agoraIso: string
): GrupoEspera[] {
  const grupos = new Map<string, GrupoEspera>();

  for (const l of linhas) {
    if (l.faixa === "sai_hoje") continue; // domínio da fila
    const s = l.solicitacao;
    const g = grupos.get(s.supplierId) ?? {
      supplierId: s.supplierId,
      fornecedorNome: s.fornecedorNome,
      faixa: l.faixa,
      esperaDias: l.esperaDias,
      abriuENaoRespondeu: false,
      linhas: [],
      anexaveisIds: [],
      ultimaCobrancaDias: null,
    };
    g.linhas.push(l);
    if (PESO_FAIXA[l.faixa] < PESO_FAIXA[g.faixa]) g.faixa = l.faixa;
    if ((l.esperaDias ?? -1) > (g.esperaDias ?? -1)) g.esperaDias = l.esperaDias;
    if (l.abriuENaoRespondeu) g.abriuENaoRespondeu = true;
    const anexavel =
      (s.status === "enviada" || s.status === "reenviada" || s.status === "pendente") &&
      !horarioOrfa(s);
    if (anexavel) g.anexaveisIds.push(s.id);
    grupos.set(s.supplierId, g);
  }

  for (const b of batidasEnviadas) {
    const g = grupos.get(b.supplierId);
    if (g && b.enviadaEm) {
      const n = dias(b.enviadaEm, agoraIso);
      if (g.ultimaCobrancaDias === null || n < g.ultimaCobrancaDias) {
        g.ultimaCobrancaDias = n;
      }
    }
  }

  return [...grupos.values()].sort((a, b) => {
    const f = PESO_FAIXA[a.faixa] - PESO_FAIXA[b.faixa];
    if (f !== 0) return f;
    if (a.abriuENaoRespondeu !== b.abriuENaoRespondeu) {
      return a.abriuENaoRespondeu ? -1 : 1;
    }
    return (b.esperaDias ?? -1) - (a.esperaDias ?? -1);
  });
}

// --------------------------------------------------------------- resumo

export type ResumoEspera = {
  comOSistema: number;
  atencao: number;
  precisaDeVoce: number;
  saiHoje: number;
};

/** As contagens da linha do Copiloto — derivadas das MESMAS linhas da
 *  lista, nunca de uma query paralela. */
export function resumoEspera(linhas: LinhaEspera[]): ResumoEspera {
  const r: ResumoEspera = { comOSistema: 0, atencao: 0, precisaDeVoce: 0, saiHoje: 0 };
  for (const l of linhas) {
    if (l.faixa === "com_o_sistema") r.comOSistema++;
    else if (l.faixa === "atencao") r.atencao++;
    else if (l.faixa === "precisa_de_voce") r.precisaDeVoce++;
    else r.saiHoje++;
  }
  return r;
}

/**
 * A frase do Copiloto. Sem o contador de ansiedade: o que está sob
 * controle não vira número — vira silêncio ("em dia").
 */
export function fraseDoCopiloto(r: ResumoEspera): string | null {
  const partes: string[] = [];
  if (r.atencao > 0) {
    partes.push(`${r.atencao} esperando demais`);
  }
  if (r.precisaDeVoce > 0) {
    partes.push(
      `${r.precisaDeVoce} ${plural(r.precisaDeVoce, "precisa", "precisam")} de você`
    );
  }
  if (partes.length > 0) return `Fornecedores: ${partes.join(" · ")}.`;
  if (r.comOSistema > 0 || r.saiHoje > 0) return "Fornecedores em dia.";
  return null; // nada pedido = nada a dizer
}
