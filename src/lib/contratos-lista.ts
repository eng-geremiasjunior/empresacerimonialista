// A área de Contratos — as regras, sem tela.
//
// Molde de fornecedores-lista.ts: a UI não decide visão, ordenação nem
// frase — pergunta aqui. Parte PURA (zero Supabase); a leitura em lote
// mora em src/lib/supabase/contratos-tela.ts.
//
// O ciclo de um contrato de fornecedor de evento (ele morre no dia da
// festa — não existe vigência nem renovação, de propósito):
//   sem contrato → cobrança em aberto → recebido (espera conferência)
//   → conferido/descartado (histórico).

import type {
  EscolhasAplicacao,
} from "@/app/(app)/eventos/[id]/fornecedores/extracao-actions";
import type { PropostaExtracao } from "@/lib/contrato-extracao-core";

/* ---------------- modelo ---------------- */

export type ExtracaoResumo = {
  id: string;
  status: "proposta" | "conferida" | "descartada";
  payload: PropostaExtracao;
  aplicado: EscolhasAplicacao | null;
  conferidaEm: string | null;
  descartadaEm: string | null;
};

export type ContratoLinha = {
  solicitacaoId: string;
  eventId: string;
  eventoNome: string;
  eventoData: string;
  supplierId: string;
  fornecedorNome: string;
  statusSolicitacao:
    | "pendente"
    | "enviada"
    | "reenviada"
    | "respondida"
    | "expirada";
  tentativas: number;
  prazoAte: string | null;
  enviadaEm: string | null;
  respondidaEm: string | null;
  arquivo: {
    path: string;
    nome: string;
    origem: "fornecedor" | "cerimonialista";
    ehPdf: boolean;
  } | null;
  extracao: ExtracaoResumo | null;
  /** o item mais cedo deste fornecedor no roteiro (destino do horário) */
  itemRoteiroTitulo: string | null;
};

/** Fornecedor de evento vivo que cobra contrato e ainda não tem pedido. */
export type SemContratoLinha = {
  supplierId: string;
  fornecedorNome: string;
  eventId: string;
  eventoNome: string;
  eventoData: string;
};

export type VisaoContratos =
  | "conferencia"
  | "cobrancas"
  | "sem_contrato"
  | "conferidos";

export const VISAO_LABELS: Record<VisaoContratos, string> = {
  conferencia: "Esperando conferência",
  cobrancas: "Cobranças em aberto",
  sem_contrato: "Sem contrato",
  conferidos: "Conferidos",
};

/** A próxima decisão primeiro. */
export const ORDEM_VISOES: VisaoContratos[] = [
  "conferencia",
  "cobrancas",
  "sem_contrato",
  "conferidos",
];

export type FiltrosContratos = { q: string; visao: VisaoContratos };

/* ---------------- classificação ---------------- */

/**
 * Recebido sem leitura fechada → conferência (INCLUI não-PDF: o arquivo
 * chegou e espera decisão — ler, lançar à mão ou tirar da fila).
 * Pedido vivo ou expirado → cobrança. Leitura fechada → histórico.
 */
export function visaoDe(l: ContratoLinha): VisaoContratos {
  if (l.statusSolicitacao === "respondida") {
    return l.extracao && l.extracao.status !== "proposta"
      ? "conferidos"
      : "conferencia";
  }
  return "cobrancas";
}

/* ---------------- tempo, não status ---------------- */

const dias = (deIso: string, ateIso: string): number =>
  Math.round(
    (new Date(ateIso.slice(0, 10) + "T00:00:00").getTime() -
      new Date(deIso.slice(0, 10) + "T00:00:00").getTime()) /
      86_400_000
  );

const haDias = (n: number): string =>
  n <= 0 ? "hoje" : n === 1 ? "há 1 dia" : `há ${n} dias`;

/** "recebido há 3 dias · enviado pelo fornecedor" */
export function fraseDaEspera(l: ContratoLinha, hoje: string): string {
  const quando = l.respondidaEm ? haDias(dias(l.respondidaEm, hoje)) : "";
  const quem =
    l.arquivo?.origem === "cerimonialista"
      ? "anexado por você"
      : "enviado pelo fornecedor";
  return ["recebido " + quando, quem].filter(Boolean).join(" · ");
}

/** "enviada há 5 dias · 2ª cobrança" / "prazo venceu há 2 dias" */
export function fraseDaCobranca(l: ContratoLinha, hoje: string): string {
  if (l.statusSolicitacao === "pendente") return "na fila de envio";
  const partes: string[] = [];
  if (l.enviadaEm) partes.push(`enviada ${haDias(dias(l.enviadaEm, hoje))}`);
  if (l.tentativas > 1) partes.push(`${l.tentativas}ª cobrança`);
  if (l.statusSolicitacao === "expirada") {
    partes.push("sem resposta após as cobranças — ligar");
  } else if (l.prazoAte && l.prazoAte.slice(0, 10) < hoje) {
    partes.push(`prazo venceu ${haDias(dias(l.prazoAte, hoje))}`);
  }
  return partes.join(" · ") || "aguardando resposta";
}

/* ---------------- o resumo do contrato ---------------- */

const brl = (v: number): string =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const plural = (n: number, um: string, muitos: string): string =>
  `${n} ${n === 1 ? um : muitos}`;

/** "R$ 15.000,00 · 3 parcelas · 4 quantidades · 12:00" — o que foi LIDO. */
export function resumoDoContrato(e: ExtracaoResumo): string {
  const p = e.payload;
  const partes: string[] = [];
  if (p.valor_total != null) partes.push(brl(p.valor_total));
  if (p.parcelas.length > 0)
    partes.push(plural(p.parcelas.length, "parcela", "parcelas"));
  if (p.quantidades.length > 0)
    partes.push(plural(p.quantidades.length, "quantidade", "quantidades"));
  if (p.horarios.length > 0) partes.push(p.horarios[0].hora);
  return partes.join(" · ") || "nada extraído";
}

/**
 * O que dela virou dado — a auditoria em uma frase.
 * "aplicou 2 de 3 parcelas · 4 quantidades · horário" | "nada aplicado"
 */
export function resumoDoAplicado(e: ExtracaoResumo): string {
  if (e.status === "descartada" || !e.aplicado) return "nada aplicado";
  const a = e.aplicado;
  const partes: string[] = [];
  if (a.parcelas.length > 0) {
    const total = e.payload.parcelas.length;
    partes.push(
      total > a.parcelas.length
        ? `${a.parcelas.length} de ${total} parcelas`
        : plural(a.parcelas.length, "parcela", "parcelas")
    );
  }
  if (a.quantidades.length > 0)
    partes.push(plural(a.quantidades.length, "quantidade", "quantidades"));
  if (a.horario) partes.push(`horário ${a.horario.hora}`);
  return partes.length > 0 ? "aplicou " + partes.join(" · ") : "nada aplicado";
}

/* ---------------- filtro, contagem, ordenação ---------------- */

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function casaBusca(q: string, ...campos: (string | null)[]): boolean {
  if (!q.trim()) return true;
  const alvo = normalizar(campos.filter(Boolean).join(" "));
  return normalizar(q)
    .split(/\s+/)
    .every((t) => alvo.includes(t));
}

export function filtrarLinhas(
  linhas: ContratoLinha[],
  f: FiltrosContratos
): ContratoLinha[] {
  return linhas.filter(
    (l) =>
      visaoDe(l) === f.visao &&
      casaBusca(f.q, l.fornecedorNome, l.eventoNome, l.arquivo?.nome ?? null)
  );
}

export function filtrarSemContrato(
  linhas: SemContratoLinha[],
  q: string
): SemContratoLinha[] {
  return linhas.filter((l) => casaBusca(q, l.fornecedorNome, l.eventoNome));
}

export function contarVisoes(
  linhas: ContratoLinha[],
  semContrato: SemContratoLinha[]
): Record<VisaoContratos, number> {
  const c: Record<VisaoContratos, number> = {
    conferencia: 0,
    cobrancas: 0,
    sem_contrato: semContrato.length,
    conferidos: 0,
  };
  for (const l of linhas) c[visaoDe(l)] += 1;
  return c;
}

/** Fila mais antiga primeiro; cobranças pelo prazo; histórico recente primeiro. */
export function ordenar(
  linhas: ContratoLinha[],
  visao: VisaoContratos
): ContratoLinha[] {
  const asc = (a: string | null, b: string | null) =>
    (a ?? "9999").localeCompare(b ?? "9999");
  const lista = [...linhas];
  if (visao === "conferencia") {
    lista.sort((a, b) => asc(a.respondidaEm, b.respondidaEm));
  } else if (visao === "cobrancas") {
    lista.sort((a, b) => asc(a.prazoAte, b.prazoAte));
  } else {
    lista.sort((a, b) =>
      asc(
        b.extracao?.conferidaEm ?? b.extracao?.descartadaEm ?? null,
        a.extracao?.conferidaEm ?? a.extracao?.descartadaEm ?? null
      )
    );
  }
  return lista;
}

export function ordenarSemContrato(
  linhas: SemContratoLinha[]
): SemContratoLinha[] {
  return [...linhas].sort((a, b) => a.eventoData.localeCompare(b.eventoData));
}
