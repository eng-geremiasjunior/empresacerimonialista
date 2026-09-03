// A ponte entre a proposta do briefing e o que ela decide aplicar — a
// parte PURA (sem I/O).
//
// A proposta é sugestão, não verdade: entre ler e escrever existe a
// conferência, item a item, com o trecho do briefing ao lado. Este
// módulo só traduz a proposta em LINHAS conferíveis (rótulo na voz
// dela, valor legível, trecho, modalidade) e guarda as escolhas.
//
// Quem escreve é a action, e só pelas portas que já existem: verba do
// fornecedor, lançamento NÃO PAGO, recurso, campo do método. Dinheiro
// nunca se move sozinho — e nada nasce marcado como pago.

import { formatCurrency, plural } from "@/lib/format";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import type {
  EstadoFornecedor,
  PropostaBriefingV2,
  StatusAfirmacao,
} from "@/lib/briefing-core";

/* ------------------------------------------------------------------ */
/* 1) A proposta vira linhas conferíveis                               */
/* ------------------------------------------------------------------ */

export type GrupoConferencia =
  | "verba"
  | "fornecedores"
  | "quantidades"
  | "estilo"
  | "convidados";

/** Uma linha da conferência. A tela lê "rotulo — valor" com o trecho abaixo. */
export type ItemConferencia = {
  /** estável e previsível ("verba", "conv_teto", "forn:0", "qtd:0", "estilo") */
  id: string;
  rotulo: string;
  valor: string;
  trecho: string | null;
  status: StatusAfirmacao;
  manter: boolean;
  grupo: GrupoConferencia;
};

const ESTADO_LABEL: Record<EstadoFornecedor, string> = {
  contratado: "contratado",
  em_conversa: "em conversa",
  pendente: "ainda não fechado",
  nao_teremos: "não teremos",
};

// A modalidade do dinheiro vence quando há dinheiro; sem valor, o estado
// do fornecedor é o que se sabe.
const STATUS_POR_ESTADO: Record<EstadoFornecedor, StatusAfirmacao> = {
  contratado: "confirmado",
  em_conversa: "estimado",
  pendente: "pendente",
  nao_teremos: "pendente",
};

export const ESTILO_LABEL: Record<string, string> = {
  classico: "Clássico",
  rustico: "Rústico",
  boho: "Boho",
  moderno: "Moderno",
  minimalista: "Minimalista",
  tropical: "Tropical",
};

export const CLIMA_LABEL: Record<string, string> = {
  intimo: "íntimo",
  equilibrado: "equilibrado",
  grandioso: "grandioso",
};

const comUnidade = (n: number, unidade: string | null): string =>
  unidade ? `${n} ${unidade}` : String(n);

/** Grupo sem item não aparece — caixa vazia é ruído. */
export function itensDaProposta(
  p: PropostaBriefingV2
): { grupo: GrupoConferencia; rotulo: string; itens: ItemConferencia[] }[] {
  const grupos: {
    grupo: GrupoConferencia;
    rotulo: string;
    itens: ItemConferencia[];
  }[] = [];

  if (p.verba_total && p.verba_total.valor !== null) {
    grupos.push({
      grupo: "verba",
      rotulo: "Orçamento",
      itens: [
        {
          id: "verba",
          rotulo: "Orçamento da cliente",
          valor: `até ${formatCurrency(p.verba_total.valor)}`,
          trecho: p.verba_total.trecho,
          status: p.verba_total.status,
          manter: true,
          grupo: "verba",
        },
      ],
    });
  }

  // Convidados não vira item: o wizard já gravou o número e o teto ao
  // criar o evento. Pedir conferência de dado que já está na tela seria
  // trabalho para confirmar o que ela acabou de ver.

  if (p.fornecedores.length > 0) {
    grupos.push({
      grupo: "fornecedores",
      rotulo: "Fornecedores",
      itens: p.fornecedores.map((f, i) => {
        const estado = ESTADO_LABEL[f.estado];
        const cifra = f.valor?.valor != null ? formatCurrency(f.valor.valor) : null;
        return {
          id: `forn:${i}`,
          rotulo: f.nome
            ? `${categoriaLabel(f.categoria)} — ${f.nome}`
            : categoriaLabel(f.categoria),
          valor: cifra ? `${cifra} (${estado})` : estado,
          trecho: f.valor?.trecho ?? null,
          status: f.valor?.status ?? STATUS_POR_ESTADO[f.estado],
          manter: true,
          grupo: "fornecedores" as GrupoConferencia,
        };
      }),
    });
  }

  if (p.quantidades.length > 0) {
    grupos.push({
      grupo: "quantidades",
      rotulo: "Quantidades",
      itens: p.quantidades.map((q, i) => {
        const partes: string[] = [];
        if (q.ofertado !== null) {
          partes.push(`fornecedor oferece ${comUnidade(q.ofertado, q.unidade)}`);
        }
        if (q.desejado !== null) {
          partes.push(`a cliente quer ${comUnidade(q.desejado, q.unidade)}`);
        }
        return {
          id: `qtd:${i}`,
          rotulo: q.item,
          valor: partes.join(", "),
          trecho: q.trecho,
          // o desejo é a novidade: quando ele existe, é ele que manda
          status: (q.desejado !== null ? "desejado" : "confirmado") as StatusAfirmacao,
          manter: true,
          grupo: "quantidades" as GrupoConferencia,
        };
      }),
    });
  }

  const e = p.estilo;
  if (e.estilo || e.cores.length > 0 || e.vetos.length > 0 || e.clima) {
    const partes: string[] = [];
    if (e.estilo) partes.push(ESTILO_LABEL[e.estilo] ?? e.estilo);
    if (e.cores.length > 0) partes.push(e.cores.join(", "));
    if (e.vetos.length > 0) partes.push(e.vetos.map((v) => `sem ${v}`).join(", "));
    if (e.clima) partes.push(CLIMA_LABEL[e.clima] ?? e.clima);
    grupos.push({
      grupo: "estilo",
      rotulo: "Estilo",
      itens: [
        {
          id: "estilo",
          rotulo: "Estilo e cores",
          valor: partes.join(" · "),
          trecho: e.trecho,
          status: "desejado",
          manter: true,
          grupo: "estilo",
        },
      ],
    });
  }

  return grupos;
}

/* ------------------------------------------------------------------ */
/* 2) As escolhas dela — o que a action recebe                         */
/* ------------------------------------------------------------------ */

export type EscolhasBriefing = {
  verba?: { manter: boolean; valor: number };
  convidadosTeto?: { manter: boolean; valor: number };
  fornecedores: {
    id: string;
    manter: boolean;
    /** null = fornecedor ainda não escolhido: o item fica de fora */
    supplierId: string | null;
    categoria: string;
    nome: string | null;
    estado: EstadoFornecedor;
    valor: number | null;
    /** a parcela nasce SEMPRE não paga */
    lancarParcela: boolean;
    trecho: string | null;
  }[];
  quantidades: {
    id: string;
    manter: boolean;
    item: string;
    unidade: string | null;
    ofertado: number | null;
    desejado: number | null;
    trecho: string | null;
  }[];
  estilo?: {
    manter: boolean;
    estilo: string | null;
    cores: string[];
    vetos: string[];
    clima: string | null;
    trecho: string | null;
  };
};

/** Tudo marcado; parcela só onde há contrato E valor; fornecedor a escolher. */
export function escolhasIniciais(p: PropostaBriefingV2): EscolhasBriefing {
  const escolhas: EscolhasBriefing = {
    fornecedores: p.fornecedores.map((f, i) => ({
      id: `forn:${i}`,
      manter: true,
      supplierId: null,
      categoria: f.categoria,
      nome: f.nome,
      estado: f.estado,
      valor: f.valor?.valor ?? null,
      lancarParcela: f.estado === "contratado" && f.valor?.valor != null,
      trecho: f.valor?.trecho ?? null,
    })),
    quantidades: p.quantidades.map((q, i) => ({
      id: `qtd:${i}`,
      manter: true,
      item: q.item,
      unidade: q.unidade,
      ofertado: q.ofertado,
      desejado: q.desejado,
      trecho: q.trecho,
    })),
  };
  if (p.verba_total && p.verba_total.valor !== null) {
    escolhas.verba = { manter: true, valor: p.verba_total.valor };
  }
  // convidadosTeto existe no tipo (a aplicação sabe escrevê-lo), mas não
  // nasce marcado: quem grava o teto é o wizard, na criação.
  const e = p.estilo;
  if (e.estilo || e.cores.length > 0 || e.vetos.length > 0 || e.clima) {
    escolhas.estilo = {
      manter: true,
      estilo: e.estilo,
      cores: e.cores,
      vetos: e.vetos,
      clima: e.clima,
      trecho: e.trecho,
    };
  }
  return escolhas;
}

export function contarMarcados(escolhas: EscolhasBriefing): number {
  return (
    (escolhas.verba?.manter ? 1 : 0) +
    (escolhas.convidadosTeto?.manter ? 1 : 0) +
    escolhas.fornecedores.filter((f) => f.manter).length +
    escolhas.quantidades.filter((q) => q.manter).length +
    (escolhas.estilo?.manter ? 1 : 0)
  );
}

/** A frase honesta do que entrou — "aplicou 2 fornecedores e o estilo". */
export function resumoDoAplicado(escolhas: EscolhasBriefing): string {
  const partes: string[] = [];
  if (escolhas.verba?.manter) partes.push("o orçamento");
  if (escolhas.convidadosTeto?.manter) partes.push("o teto de convidados");
  const nf = escolhas.fornecedores.filter((f) => f.manter).length;
  if (nf > 0) partes.push(plural(nf, "fornecedor", "fornecedores"));
  const nq = escolhas.quantidades.filter((q) => q.manter).length;
  if (nq > 0) partes.push(plural(nq, "quantidade", "quantidades"));
  if (escolhas.estilo?.manter) partes.push("o estilo");
  if (partes.length === 0) return "nada aplicado";
  const ultima = partes[partes.length - 1];
  const antes = partes.slice(0, -1);
  return `aplicou ${antes.length > 0 ? `${antes.join(", ")} e ${ultima}` : ultima}`;
}
