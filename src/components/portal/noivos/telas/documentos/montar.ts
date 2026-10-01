// Documentos (desenho v4, README §12): de dados do banco para as três
// listas da tela. Parte pura — o servidor chama; o navegador só importa
// os tipos e os formatadores de data.
//
//   · CONTRATOS E COMPROVANTES — o contrato de prestação que o portal já
//     vê (evento_documento, 163: só `contrato_prestacao`; o termo, com
//     valor e CPF, nunca) e os comprovantes que a família subiu nas
//     parcelas (178). Nenhum valor em dinheiro sai daqui.
//   · DECISÕES ESPERANDO VOCÊS — as opções que a cerimonialista publicou
//     (curadoria, 092/177) e o guia de estilo mandado para aprovar (096).
//   · HISTÓRICO DE APROVAÇÕES — o que já foi aprovado, com a hora do
//     servidor. "Por quem" só onde o banco grava: o guia (096) guarda o
//     nome; a escolha da curadoria guarda só a hora.

import type { Escolha } from "@/lib/supabase/portal-escolhas";
import type { EventoHistorico, SituacaoGuia } from "@/lib/guia-shared";
import { hojeBR, horaMinutoBR } from "@/lib/tempo";

export type DocumentoDaTela = {
  chave: string;
  nome: string;
  info: string;
  icone: "contract" | "receipt_long";
  /** assinado = contrato aceito junto da proposta; arquivo = só o arquivo */
  status: "assinado" | "arquivo";
  href: string;
};

export type PendenteDaTela = {
  /** "cur:<curadoria>" ou "guia:<guia>" */
  chave: string;
  tipo: "curadoria" | "guia";
  /** a curadoria ou o guia */
  alvoId: string;
  /** curadoria de uma opção só: aprovar = escolher esta */
  opcaoId: string | null;
  titulo: string;
  texto: string | null;
  /** o que vai para o histórico quando aprovar */
  rotuloAprovado: string;
  /** onde ver o que está sendo aprovado (trecho depois de /portal/<id>) */
  seg: "escolhas" | "guia-estilo";
  /** "vence em 3 dias" — só quando o prazo aperta */
  prazo: string | null;
  /** o guia: "mudança pedida ontem", "mudou em 28/09" */
  nota: string | null;
};

export type AprovacaoDaTela = {
  chave: string;
  titulo: string;
  /** primeiro nome de quem aprovou; null quando o banco não grava */
  por: string | null;
  /** "dd/mm/aaaa hh:mm", em Brasília */
  quando: string;
};

export type ContratoBruto = { id: string; orcamento_aceite_id: string | null; created_at: string };

export type ComprovanteBruto = {
  parcelaId: string;
  fornecedor: string;
  descricao: string;
  pagoEm: string | null;
  url: string;
};

export type GuiaBruto = {
  id: string;
  nome: string;
  sensacao: string | null;
  situacao: SituacaoGuia;
  cores: string[];
  historico: EventoHistorico[];
};

// ---------------------------------------------------------------- datas

/** "yyyy-mm-dd" → "dd/mm/aaaa" (sem passar por Date: data pura não tem fuso). */
export function dataCurtaBR(ymd: string): string {
  const [a, m, d] = ymd.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Instante → "dd/mm/aaaa hh:mm", em Brasília (servidor e navegador iguais). */
export function dataHoraBR(quando: string | Date): string {
  const d = typeof quando === "string" ? new Date(quando) : quando;
  return `${dataCurtaBR(hojeBR(d))} ${horaMinutoBR(d)}`;
}

function diasEntre(de: string, ate: string): number {
  const a = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10));
  const b = Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Falar em tempo, e só quando aperta (uma semana). */
function prazoQueAperta(prazo: string | null, hoje: string): string | null {
  if (!prazo) return null;
  const d = diasEntre(hoje, prazo);
  if (d < 0) return "passou do prazo";
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  if (d <= 7) return `vence em ${d} dias`;
  return null;
}

/** "hoje", "ontem" ou "em dd/mm" — um instante, contado em Brasília. */
function quandoFoi(iso: string, hoje: string): string {
  const dia = hojeBR(new Date(iso));
  const d = diasEntre(dia, hoje);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  return `em ${dataCurtaBR(dia).slice(0, 5)}`;
}

function primeiroNome(s: string | null | undefined): string | null {
  const n = (s ?? "").trim().split(/\s+/)[0] ?? "";
  return n || null;
}

/** "A, B ou C" / "A, B, C e mais 2" */
function listaDeNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? "";
  if (nomes.length <= 3) return `${nomes.slice(0, -1).join(", ")} ou ${nomes[nomes.length - 1]}`;
  return `${nomes.slice(0, 3).join(", ")} e mais ${nomes.length - 3}`;
}

// ---------------------------------------------------------------- montar

export function montarDocumentos({
  contratos,
  comprovantes,
  marcaNome,
}: {
  contratos: ContratoBruto[];
  comprovantes: ComprovanteBruto[];
  marcaNome: string | null;
}): DocumentoDaTela[] {
  const nomeContrato = marcaNome ? `Contrato · ${marcaNome}` : "Contrato de prestação de serviço";
  const docs: DocumentoDaTela[] = contratos.map((c) => {
    const dia = dataCurtaBR(hojeBR(new Date(c.created_at)));
    // O contrato que a cliente aceitou junto da proposta (o aceite é a
    // assinatura dela). Sem aceite, é um arquivo que a equipe anexou.
    const aceito = !!c.orcamento_aceite_id;
    return {
      chave: `doc:${c.id}`,
      nome: nomeContrato,
      info: aceito ? `assinado em ${dia}` : `enviado em ${dia}`,
      icone: "contract",
      status: aceito ? "assinado" : "arquivo",
      href: `/api/documento/${c.id}`,
    };
  });

  const recibos = [...comprovantes].sort((a, b) => (b.pagoEm ?? "").localeCompare(a.pagoEm ?? ""));
  for (const r of recibos) {
    docs.push({
      chave: `comp:${r.parcelaId}`,
      nome: `Comprovante · ${r.fornecedor}`,
      info: [r.descricao, r.pagoEm ? `paga em ${dataCurtaBR(r.pagoEm)}` : null].filter(Boolean).join(" · "),
      icone: "receipt_long",
      status: "arquivo",
      href: r.url,
    });
  }
  return docs;
}

export function montarPendentes({
  escolhas,
  guia,
  hoje,
}: {
  escolhas: Escolha[];
  guia: GuiaBruto | null;
  hoje: string;
}): PendenteDaTela[] {
  // [prazo para ordenar, o pendente] — sem prazo vai para o fim
  const lista: [string, PendenteDaTela][] = [];

  for (const e of escolhas) {
    const c = e.curadoria;
    if (!c || c.estado !== "publicada" || e.estado === "decidido" || c.opcoes.length === 0) continue;
    const uma = c.opcoes.length === 1 ? c.opcoes[0] : null;
    lista.push([e.prazo ?? "9999-12-31", {
      chave: `cur:${c.id}`,
      tipo: "curadoria",
      alvoId: c.id,
      opcaoId: uma?.id ?? null,
      titulo: e.titulo,
      texto: uma
        ? [uma.nome, uma.descricao?.trim()].filter(Boolean).join(" — ")
        : listaDeNomes(c.opcoes.map((o) => o.nome)),
      rotuloAprovado: uma && uma.nome !== e.titulo ? `${e.titulo} · ${uma.nome}` : e.titulo,
      seg: "escolhas",
      prazo: prazoQueAperta(e.prazo, hoje),
      nota: null,
    }]);
  }

  // O guia de estilo mandado para aprovar (ou mexido depois de aprovado).
  if (guia && (guia.situacao === "aguardando" || guia.situacao === "alterado")) {
    // o histórico vem do mais novo para o mais antigo
    const ultimo = guia.historico.find((h) => h.tipo !== "montado");
    const nota =
      ultimo?.tipo === "ajuste_pedido"
        ? `mudança pedida ${quandoFoi(ultimo.quando, hoje)}`
        : ultimo?.tipo === "alterado"
          ? `mudou ${quandoFoi(ultimo.quando, hoje)}`
          : null;
    lista.push(["9999-12-31", {
      chave: `guia:${guia.id}`,
      tipo: "guia",
      alvoId: guia.id,
      opcaoId: null,
      titulo: guia.nome,
      texto: guia.sensacao?.trim() || (guia.cores.length ? guia.cores.slice(0, 4).join(", ") : null),
      rotuloAprovado: guia.nome,
      seg: "guia-estilo",
      prazo: null,
      nota,
    }]);
  }

  return lista.sort((a, b) => a[0].localeCompare(b[0])).map(([, p]) => p);
}

export function montarHistorico({
  escolhas,
  guia,
}: {
  escolhas: Escolha[];
  guia: GuiaBruto | null;
}): AprovacaoDaTela[] {
  // [instante ISO para ordenar, a aprovação]
  const itens: [string, AprovacaoDaTela][] = [];

  for (const e of escolhas) {
    const c = e.curadoria;
    if (!c || c.estado !== "escolhida" || !c.respondidaEm) continue;
    const opcao = c.opcoes.find((o) => o.id === c.escolhidaOpcaoId);
    itens.push([c.respondidaEm, {
      chave: `cur:${c.id}`,
      titulo: opcao && opcao.nome !== e.titulo ? `${e.titulo} · ${opcao.nome}` : e.titulo,
      por: null,
      quando: dataHoraBR(c.respondidaEm),
    }]);
  }

  // O guia grava "Aprovado por <nome>" (096) — o nome é o do acesso.
  if (guia) {
    for (const h of guia.historico) {
      if (h.tipo !== "aprovado") continue;
      const nome = h.texto.replace(/^aprovado por\s+/i, "").trim();
      itens.push([h.quando, {
        chave: `guia-h:${h.id}`,
        titulo: guia.nome,
        por: nome && !/^a cliente$/i.test(nome) ? primeiroNome(nome) : null,
        quando: dataHoraBR(h.quando),
      }]);
    }
  }

  // o mais novo primeiro
  return itens.sort((a, b) => Date.parse(b[0]) - Date.parse(a[0])).map(([, a]) => a);
}
