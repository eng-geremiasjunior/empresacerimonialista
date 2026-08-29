// Quem decide o quê — o rótulo, não o dado.
//
// No banco o valor continua sendo 'noivos' (CHECK das 064/066), e não é
// só vocabulário: o portal da cliente enxerga exatamente as decisões com
// responsavel in ('noivos','ambos') — é regra de acesso. Renomear a
// coluna é uma migração à parte, para quando existir cliente que não é
// um casal em volume.
//
// O que muda por tipo de evento é como a tela CHAMA esse papel: numa
// debutante quem decide é a família, numa formatura a comissão, num show
// o produtor. Antes desta função a tradução vivia duplicada em dois
// componentes do Planejamento e simplesmente não existia na Organização,
// que escrevia "Noivos" em qualquer tipo de evento.

import type { EventType } from "@/lib/types";

const CLIENTE_POR_TIPO: Partial<Record<EventType, string>> = {
  casamento: "noivos",
  bodas: "casal",
  debutante: "família",
  formatura: "comissão",
  show: "produtor",
  corporativo: "empresa",
};

/** Como esta cerimonialista chama o cliente deste evento. */
export function rotuloCliente(tipoEvento?: string | null): string {
  return CLIENTE_POR_TIPO[tipoEvento as EventType] ?? "cliente";
}

/** O responsável de uma decisão/tarefa, em minúsculas (corre dentro de frase). */
export function rotuloResponsavel(
  resp: string | null | undefined,
  tipoEvento?: string | null
): string {
  if (resp === "noivos") return rotuloCliente(tipoEvento);
  return resp ?? "";
}

/** O mesmo, capitalizado — para botão, <option> e cabeçalho. */
export function rotuloResponsavelTitulo(
  resp: string | null | undefined,
  tipoEvento?: string | null
): string {
  const r = rotuloResponsavel(resp, tipoEvento);
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : "";
}
