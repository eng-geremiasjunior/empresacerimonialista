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

/** Como a tela chama o número de pessoas deste evento. */
export function rotuloPublico(tipo?: string | null): string {
  return tem(tipo, "listaNominal") ? "convidados" : "público esperado";
}
