// A página do evento — Modelo A (28/09/2026).
//
// Os três cartões de fase SÃO a navegação: a fase aberta mostra só as
// abas dela, dentro do mesmo bloco. Este módulo é puro (sem React, sem
// banco): o mapa rota → fase, as abas de cada fase e as dicas do
// cabeçalho. O bloco de fases, o "Requer atenção" e a última aba
// lembrada leem daqui, então os três nunca discordam.

import type { Capacidade } from "@/lib/capacidades";
import type { FaseId } from "@/lib/supabase/resumo-evento";

export type FaseDoEvento = "planejar" | "organizar" | "executar";

/** Contadores das abas — os mesmos de sempre, mais as tarefas vencidas. */
export type TabCounters = {
  fornecedores: number;
  comunicacao: number;
  financeiro: number;
  /** blocos com resposta da cliente esperando conferência (091) */
  planejamento: number;
  /** contratos recebidos sem leitura fechada (138/140) */
  contratos: number;
  /** tarefas abertas com prazo vencido */
  tarefas: number;
};

export type AbaDaFase = {
  label: string;
  seg: string;
  counter?: keyof TabCounters;
  /** aba que só existe em tipo de evento que declara a capacidade */
  requer?: Capacidade;
};

export type DefinicaoDaFase = {
  id: FaseDoEvento;
  /** o id da mesma fase em resumo-evento.ts (pct e contagem vêm de lá) */
  faseId: FaseId;
  eyebrow: string;
  titulo: string;
  /** segmento que o cartão abre */
  rota: string;
  /** "onde estão os menus": a linha essencial para quem é novo */
  telas: string;
  abas: AbaDaFase[];
};

export const FASES: DefinicaoDaFase[] = [
  {
    id: "planejar",
    faseId: "planejamento",
    eyebrow: "1 · Planejar",
    titulo: "Planejamento",
    rota: "planejamento",
    telas: "Objetivos e decisões",
    abas: [],
  },
  {
    id: "organizar",
    faseId: "organizacao",
    eyebrow: "2 · Organizar",
    titulo: "Organização",
    rota: "organizacao",
    telas: "Tarefas · Fornecedores · Contratos · Comunicação · Financeiro",
    abas: [
      { label: "Tarefas", seg: "organizacao", counter: "tarefas" },
      { label: "Fornecedores", seg: "fornecedores", counter: "fornecedores" },
      { label: "Contratos", seg: "contratos", counter: "contratos" },
      { label: "Comunicação", seg: "comunicacao", counter: "comunicacao" },
      { label: "Financeiro", seg: "financeiro", counter: "financeiro" },
    ],
  },
  {
    id: "executar",
    faseId: "execucao",
    eyebrow: "3 · Executar",
    titulo: "Execução",
    rota: "roteiro",
    telas: "Roteiro · Operação · RSVP · Mesas",
    abas: [
      { label: "Roteiro", seg: "roteiro" },
      { label: "Operação", seg: "operacao" },
      { label: "RSVP", seg: "rsvp", requer: "listaNominal" },
      { label: "Mesas", seg: "mesas", requer: "mesas" },
      // o cortejo é execução (a ordem de entrada); só existe onde há cortejo
      { label: "Cortejo", seg: "cortejo", requer: "cortejo" },
    ],
  },
];

// Rota → fase. O que não está aqui (resumo, área do cliente, histórico,
// editar) não abre fase nenhuma.
const FASE_DO_SEGMENTO: Record<string, FaseDoEvento> = {
  planejamento: "planejar",
  organizacao: "organizar",
  tarefas: "organizar",
  fornecedores: "organizar",
  contratos: "organizar",
  comunicacao: "organizar",
  financeiro: "organizar",
  roteiro: "executar",
  operacao: "executar",
  rsvp: "executar",
  mesas: "executar",
  cortejo: "executar",
};

export function faseDoSegmento(seg: string | null | undefined): FaseDoEvento | null {
  if (!seg) return null;
  return FASE_DO_SEGMENTO[seg] ?? null;
}

/** O primeiro segmento depois de /eventos/<id> ("" no Resumo). */
export function segmentoDoCaminho(pathname: string, eventId: string): string {
  const base = `/eventos/${eventId}`;
  if (!pathname.startsWith(base)) return "";
  const resto = pathname.slice(base.length).replace(/^\/+/, "");
  return resto.split("/")[0] ?? "";
}

export function definicaoDaFase(id: FaseDoEvento): DefinicaoDaFase {
  return FASES.find((f) => f.id === id) ?? FASES[0];
}

/** Os três atalhos do cabeçalho, com o nome de quem nunca usou o sistema. */
export const LINKS_DO_CABECALHO: {
  seg: string;
  label: string;
  dica: string;
}[] = [
  {
    seg: "",
    label: "Visão geral",
    dica: "O painel do evento: o que requer atenção, o que está pronto e os atalhos.",
  },
  {
    seg: "area-do-cliente",
    label: "O que o cliente vê",
    dica: "O portal do seu cliente: o que ele enxerga e quem tem acesso.",
  },
  {
    seg: "historico",
    label: "Histórico de alterações",
    dica: "Tudo o que mudou neste evento, quando e por quem.",
  },
];

/** Chave da última aba lembrada no navegador, por evento. */
export function chaveDaUltimaAba(eventId: string): string {
  return `eorg-ultima-aba:${eventId}`;
}
