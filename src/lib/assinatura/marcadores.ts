// As anotações que o teste com cartão deixa em `assinaturas.observacao`
// (21/09/2026). Módulo PURO: é lido pela action de cancelar, pelo webhook,
// pelas rotinas diárias e pela régua de e-mails — quem escreve e quem lê
// precisam do mesmo texto.

/** Ela pediu para desagendar a cobrança e a operadora não confirmou; a rotina diária insiste. */
export const CANCELAMENTO_PENDENTE = "cancelamento da cobrança do teste pendente na operadora";

/** A primeira cobrança do teste foi recusada (o webhook anotou). */
export const COBRANCA_RECUSADA = "cobrança do teste recusada em";

export function cancelamentoPendente(observacao: string | null | undefined): boolean {
  return (observacao ?? "").startsWith(CANCELAMENTO_PENDENTE);
}

export function cobrancaRecusada(observacao: string | null | undefined): boolean {
  return (observacao ?? "").startsWith(COBRANCA_RECUSADA);
}
