// Modelos de Precificação (Orçamentos, Etapa 2) — tipos, formatação e
// cálculo compartilhados entre tabela, modal e (na Etapa 3) a montagem
// de orçamentos. Categorias: mesmos slugs/labels de Fornecedores, só por
// consistência visual — sem vínculo de dados.

import {
  CATEGORIAS_OPERACIONAIS,
  CATEGORIAS_APOIO,
} from "@/lib/fornecedores-shared";

export type TipoCalculo = "fixo" | "por_convidado";

export type ModeloPrecificacao = {
  id: string;
  empresa_id: string;
  nome: string;
  tipo_calculo: TipoCalculo;
  valor_fixo: number | null;
  valor_por_convidado: number | null;
  taxa_fixa_adicional: number;
  descricao: string | null;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
  usado_em_orcamentos: number; // contagem em orcamento_itens (trava o Excluir)
};

// Dropdown do modal: operacionais + apoio + Outro (mesma ordem de Fornecedores).
export const CATEGORIAS_MODELO: { slug: string; label: string }[] = [
  ...Object.entries(CATEGORIAS_OPERACIONAIS),
  ...Object.entries(CATEGORIAS_APOIO),
  ["outro", "Outro"] as [string, string],
].map(([slug, label]) => ({ slug, label }));

export const TIPO_CALCULO_LABELS: Record<TipoCalculo, string> = {
  fixo: "Valor fixo",
  por_convidado: "Por convidado",
};

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: v % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// Coluna "Valor" da tabela:
//   fixo          -> "R$ 5.000"
//   por convidado -> "R$ 80/convidado + R$ 500 taxa" (taxa só se > 0)
export function valorResumo(m: ModeloPrecificacao): string {
  if (m.tipo_calculo === "fixo") {
    return m.valor_fixo != null ? formatBRL(Number(m.valor_fixo)) : "—";
  }
  if (m.valor_por_convidado == null) return "—";
  const base = `${formatBRL(Number(m.valor_por_convidado))}/convidado`;
  const taxa = Number(m.taxa_fixa_adicional) || 0;
  return taxa > 0 ? `${base} + ${formatBRL(taxa)} taxa` : base;
}

// Valor calculado de um modelo para N convidados (usado no preview do
// modal e, na Etapa 3, na montagem do orçamento).
export function calcularValorModelo(
  m: Pick<
    ModeloPrecificacao,
    "tipo_calculo" | "valor_fixo" | "valor_por_convidado" | "taxa_fixa_adicional"
  >,
  convidados: number
): number {
  if (m.tipo_calculo === "fixo") return Number(m.valor_fixo) || 0;
  return (
    (Number(m.valor_por_convidado) || 0) * convidados +
    (Number(m.taxa_fixa_adicional) || 0)
  );
}
