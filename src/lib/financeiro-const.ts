// Constantes do módulo Financeiro (client-safe, sem I/O).

export const DESPESA_CATEGORIES: Record<string, string> = {
  buffet: "Buffet",
  decoracao: "Decoração",
  fotografia: "Fotografia",
  som_dj: "Som/DJ",
  transporte: "Transporte",
  equipe: "Equipe",
  outro: "Outro",
};

export const PAYMENT_METHODS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  boleto: "Boleto",
};

export type TxStatus = "pago" | "pendente" | "atrasado";

export function txStatus(
  paid: boolean,
  dueDate: string | null,
  todayIso: string
): TxStatus {
  if (paid) return "pago";
  if (dueDate && dueDate < todayIso) return "atrasado";
  return "pendente";
}

export const TX_STATUS_LABELS: Record<TxStatus, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
};
