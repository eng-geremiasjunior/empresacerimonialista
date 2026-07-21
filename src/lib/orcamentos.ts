// Orçamentos (Etapa 3) — tipos, rótulos, formatação e helpers usados na
// listagem, no formulário e na visualização.

import { formatBRL } from "@/lib/modelos-precificacao";

export type OrcamentoStatus =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "recusado"
  | "expirado";

export type Orcamento = {
  id: string;
  empresa_id: string;
  contato_nome: string;
  contato_telefone: string | null;
  contato_email: string | null;
  tipo_evento: string;
  data_evento: string | null;
  local_evento: string | null;
  cidade_evento: string | null;
  numero_convidados: number | null;
  data_criacao: string;
  validade_dias: number;
  data_validade: string;
  valor_total: number;
  status: OrcamentoStatus;
  hash_publico: string;
  evento_gerado_id: string | null;
  created_at: string;
};

export type OrcamentoItem = {
  id: string;
  orcamento_id: string;
  modelo_precificacao_id: string | null;
  nome: string;
  descricao: string | null;
  tipo_calculo: "fixo" | "por_convidado" | "manual";
  valor_unitario: number | null;
  quantidade_convidados_aplicada: number | null;
  taxa_fixa: number;
  valor_calculado: number;
  ordem: number;
};

// Item ainda não persistido (montagem no formulário).
export type ItemDraft = Omit<OrcamentoItem, "id" | "orcamento_id"> & {
  draftId: string;
};

export const ORCAMENTO_STATUS_LABELS: Record<OrcamentoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
};

// Badges dessaturados, mesmo padrão do resto do sistema.
export const ORCAMENTO_STATUS_BADGE: Record<
  OrcamentoStatus,
  { pill: string; dot: string }
> = {
  rascunho: { pill: "bg-stone-100 text-stone-600", dot: "bg-stone-400" },
  enviado: { pill: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  aprovado: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  recusado: { pill: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  expirado: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
};

export const VALIDADE_OPCOES = [7, 14, 30, 60, 90] as const;

export { formatBRL };

export function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function validadeVencida(o: Pick<Orcamento, "data_validade">): boolean {
  return o.data_validade < new Date().toISOString().slice(0, 10);
}

// Linha descritiva de um item (card do formulário e visualização).
export function descricaoCalculoItem(
  item: Pick<
    OrcamentoItem,
    "tipo_calculo" | "valor_unitario" | "quantidade_convidados_aplicada" | "taxa_fixa"
  >
): string {
  if (item.tipo_calculo === "por_convidado") {
    const base = `${formatBRL(Number(item.valor_unitario) || 0)}/convidado × ${
      item.quantidade_convidados_aplicada ?? 0
    }`;
    const taxa = Number(item.taxa_fixa) || 0;
    return taxa > 0 ? `${base} + ${formatBRL(taxa)} taxa` : base;
  }
  if (item.tipo_calculo === "fixo") return "Valor fixo";
  return "Valor manual";
}
