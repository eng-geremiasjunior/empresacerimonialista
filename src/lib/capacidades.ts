// O que cada tipo de evento TEM — declarado, não espalhado em `if`.
//
// A regra que isto existe para cumprir: um tipo novo deve custar um seed
// e uma linha aqui, nunca um `if (type === "show")` dentro de cada tela.
// Quando o `if` entra na tela, o segundo aplicativo começou.
//
// O caso concreto que motivou: um show de 5.000 pessoas não tem lista
// nominal de convidados — e as telas que dependem dela quebram nessa
// escala (o autocadastro tem teto de 1.500, o croqui desenha uma cadeira
// SVG por pessoa). A saída não é escalá-las: é o tipo não as oferecer.

import type { EventType } from "@/lib/types";

export type Capacidade =
  /** lista nominal de convidados, com RSVP e acompanhantes */
  | "listaNominal"
  /** croqui do salão e distribuição por mesa */
  | "mesas"
  /** cortejo / ordem de entrada nominal */
  | "cortejo"
  /** portal da cliente e site público do evento */
  | "siteDoEvento";

const TODAS: Capacidade[] = ["listaNominal", "mesas", "cortejo", "siteDoEvento"];

// Só quem foge do padrão aparece aqui. O resto tem tudo.
const EXCECOES: Partial<Record<EventType, Capacidade[]>> = {
  show: [],
  corporativo: ["listaNominal", "mesas"],
};

export function capacidadesDoTipo(tipo?: string | null): Capacidade[] {
  const excecao = EXCECOES[tipo as EventType];
  return excecao ?? TODAS;
}

export function tem(tipo: string | null | undefined, cap: Capacidade): boolean {
  return capacidadesDoTipo(tipo).includes(cap);
}

// Só quem chama diferente aparece aqui. O resto tem convidados.
const PUBLICO_POR_TIPO: Partial<Record<EventType, string>> = {
  show: "público esperado",
  corporativo: "participantes",
};

/** Como a tela chama o número de pessoas deste evento. */
export function rotuloPublico(tipo?: string | null): string {
  return PUBLICO_POR_TIPO[tipo as EventType] ?? "convidados";
}

// O plural resolvia o título da tela e o item do menu; o corpo dela pede
// o singular ("Adicionar convidado") e o lugar ("pessoas na festa"). Sem
// estes dois, o menu de um evento corporativo dizia Participantes e a
// tela, três linhas abaixo, dizia Convidados.
// Sem entrada para show de propósito: a tela de lista é fechada para ele
// (não tem listaNominal), então um rótulo aqui seria só promessa de tela
// que devolve 404 — e "os público esperado" nem concordaria.
const PUBLICO_SINGULAR_POR_TIPO: Partial<Record<EventType, string>> = {
  corporativo: "participante",
};

/** "convidado" / "participante" — uma pessoa da lista. */
export function rotuloPublicoSingular(tipo?: string | null): string {
  return PUBLICO_SINGULAR_POR_TIPO[tipo as EventType] ?? "convidado";
}

const ONDE_POR_TIPO: Partial<Record<EventType, string>> = {
  corporativo: "no evento",
  formatura: "na formatura",
};

/** "na festa" / "no evento" — corre dentro de frase ("pessoas NA FESTA"). */
export function rotuloNoEvento(tipo?: string | null): string {
  return ONDE_POR_TIPO[tipo as EventType] ?? "na festa";
}

// Porte derivado do público: o wizard não pergunta a escala, deriva dela.
// Os tokens espelham metodo_arquetipo.codigo do seed (141).
const PORTE_POR_PUBLICO: Partial<
  Record<EventType, { ate: number; escala: string }[]>
> = {
  corporativo: [
    { ate: 100, escala: "ate_100" },
    { ate: 400, escala: "100_a_400" },
    { ate: Infinity, escala: "acima_400" },
  ],
};

/** null quando o tipo não deriva porte do público ou o número não presta. */
export function escalaPorPublico(
  tipo: string | null | undefined,
  guests: number | null | undefined
): string | null {
  const faixas = PORTE_POR_PUBLICO[tipo as EventType];
  if (!faixas || guests == null || !Number.isFinite(guests) || guests <= 0)
    return null;
  return faixas.find((f) => guests <= f.ate)?.escala ?? null;
}
