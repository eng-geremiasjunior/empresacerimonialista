// Constantes e helpers da tela de Planejamento (handoff Celebra Pro).
// Os valores de cor/tipografia são LITERAIS do README do handoff — a tela
// só existe no tema neutro, então os hexes vivem aqui, não em tokens.

import type { CSSProperties } from "react";

export const C = {
  canvas: "#E4E5E7",
  card: "#FFFFFF",
  cardSec: "#FCFCFC",
  zona: "#EFF1F2",
  zona2: "#F3F4F5",
  bordaForte: "#A9AEB3",
  bordaMedia: "#C3C7CB",
  bordaSutil: "#DCDFE1",
  divisoria: "#EDEEEF",
  divisoria2: "#F0F1F2",
  tinta: "#23262A",
  corpo: "#3C4145",
  secundario: "#5B6167",
  meta: "#8A9096",
  fantasma: "#9AA0A6",
  ameixa: "#6E3F5F",
  ameixaEscura: "#4A2A40",
  ameixaClara: "#B98FAC",
  tint: "#F2F0F2",
  tint2: "#EBE6EA",
  atrasadaFg: "#96605A",
  atrasadaBg: "#F1EAE8",
  pendenteFg: "#8A7448",
  pendenteBg: "#F1EEE6",
  decididaFg: "#5B6167",
  decididaBg: "#EFF0F1",
  inativo: "#C3C7CB",
  avisoBg: "#F2F1EE",
} as const;

// Famílias (carregadas no layout raiz via next/font)
export const F_TITLE = "var(--font-title), system-ui, sans-serif";
export const F_UI = "var(--font-ui), system-ui, sans-serif";
export const F_MONO = "var(--font-mono), ui-monospace, monospace";

// Rótulo mono uppercase 10px (rótulo de campo / cabeçalho de grupo)
export const monoLabel: CSSProperties = {
  fontFamily: F_MONO,
  fontSize: 10,
  lineHeight: "14px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: C.secundario,
};

export function tituloStyle(px: number, lh: number): CSSProperties {
  return {
    fontFamily: F_TITLE,
    fontWeight: 600,
    fontSize: px,
    lineHeight: `${lh}px`,
    letterSpacing: "-0.02em",
    color: C.tinta,
  };
}

// ---- formatação ----

export function brl(v: number | null | undefined): string {
  if (v === null || v === undefined) return "R$ 0";
  const n = Number(v);
  const semCentavos = Math.abs(n % 1) < 0.005;
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: semCentavos ? 0 : 2,
    maximumFractionDigits: semCentavos ? 0 : 2,
  });
}

export function dataBr(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// Tempo sempre RELATIVO (handoff §7.1): nunca marco fixo.
export function prazoRelativo(iso: string | null): string | null {
  if (!iso) return null;
  const hoje = new Date(new Date().toDateString()).getTime();
  const alvo = new Date(`${iso}T00:00:00`).getTime();
  const dias = Math.round((alvo - hoje) / 86_400_000);
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "falta 1 dia";
  if (dias > 1) return `faltam ${dias} dias`;
  if (dias === -1) return "venceu ontem";
  return `venceu há ${-dias} dias`;
}

/** "há 2 dias" — quando algo aconteceu, também sempre relativo */
export function tempoAtras(iso: string | null): string | null {
  if (!iso) return null;
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return min <= 1 ? "agora há pouco" : `há ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return horas === 1 ? "há 1 hora" : `há ${horas} horas`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

export function prazoVencido(iso: string | null): boolean {
  if (!iso) return false;
  return (
    new Date(`${iso}T00:00:00`).getTime() <
    new Date(new Date().toDateString()).getTime()
  );
}

// Estado visual da decisão (o handoff distingue atrasada de pendente pelo
// prazo; "bloqueada" NÃO existe no produto — o sistema sugere ordem, não
// trava).
export type EstadoVisual = "atrasada" | "pendente" | "decidida" | "na";

export function estadoVisual(d: {
  estado: string;
  prazoPrevisto: string | null;
}): EstadoVisual {
  if (d.estado === "nao_se_aplica") return "na";
  if (d.estado === "decidida") return "decidida";
  return prazoVencido(d.prazoPrevisto) ? "atrasada" : "pendente";
}

export const DOT_COR: Record<EstadoVisual, string> = {
  atrasada: C.atrasadaFg,
  pendente: C.pendenteFg,
  decidida: C.decididaFg,
  na: C.inativo,
};

export const PILULA: Record<
  Exclude<EstadoVisual, "na">,
  { bg: string; fg: string; rotulo: string }
> = {
  atrasada: { bg: C.atrasadaBg, fg: C.atrasadaFg, rotulo: "atrasada" },
  pendente: { bg: C.pendenteBg, fg: C.pendenteFg, rotulo: "pendente" },
  decidida: { bg: C.decididaBg, fg: C.decididaFg, rotulo: "decidida" },
};

// Arquétipos (eixos ESCALA × CENÁRIO, 083): as opções vêm de
// metodo_arquetipo do tipo do evento — nenhum espelho do seed aqui.
export type OpcaoArquetipo = { valor: string; rotulo: string };
export type Arquetipos = { escala: OpcaoArquetipo[]; cenario: OpcaoArquetipo[] };

export function rotuloArquetipo(
  valor: string | null,
  opcoes: OpcaoArquetipo[]
): string | null {
  if (!valor) return null;
  const achado = opcoes.find((a) => a.valor === valor)?.rotulo;
  if (achado) return achado;
  // token sem opção no método (valor antigo, seed ainda não rodou):
  // humaniza em vez de mostrar o cru
  const texto = valor.replace(/_/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Id curto exibível (#a1b2) — os ids reais são uuid.
export function idCurto(uuid: string): string {
  return `#${uuid.slice(-4)}`;
}

// Rótulo do tipo de campo, para o formato `NOME · TIPO` do handoff.
export const TIPO_ROTULO: Record<string, string> = {
  texto: "texto",
  numero: "número",
  moeda: "moeda",
  sim_nao: "sim/não",
  escolha: "escolha",
  data: "data",
  hora: "hora",
  anexo: "anexo",
  fornecedor: "fornecedor",
};
