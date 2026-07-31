"use server";

// Verba alocada por fornecedor dentro do evento (063).
//
// O valor alocado é digitado pela cerimonialista aqui — não vem do
// Orçamento automaticamente (decisão explícita por ora). O detalhamento
// em itens é opcional: sem itens, vale o total digitado; com itens, o
// total do fornecedor passa a ser a soma deles.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type VerbaFormState = { error: string } | { ok: true } | null;

export type ItemVerba = {
  descricao: string;
  valorEstimadoInicial: number | null;
  valorNegociado: number | null;
};

function revalidate(eventId: string) {
  revalidatePath(`/eventos/${eventId}/financeiro`);
  revalidatePath(`/eventos/${eventId}`, "layout");
}

function numeroOuNulo(bruto: FormDataEntryValue | null): number | null {
  const s = String(bruto ?? "").trim().replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Cria ou atualiza a verba do fornecedor no evento. Os itens são
// substituídos por completo: a tela manda a lista inteira, então apagar
// e reinserir mantém banco e tela iguais sem diffs parciais.
export async function salvarVerbaFornecedor(
  eventId: string,
  itens: ItemVerba[],
  _prev: VerbaFormState,
  formData: FormData
): Promise<VerbaFormState> {
  const supplierId = String(formData.get("supplier_id") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim();
  const estimado = numeroOuNulo(formData.get("valor_estimado_inicial"));
  let alocado = numeroOuNulo(formData.get("valor_alocado"));

  if (!supplierId) return { error: "Escolha o fornecedor." };

  const validos = itens.filter((i) => i.descricao.trim());

  // Com detalhamento, o total do fornecedor é a soma dos itens — senão a
  // tela mostraria um total que não bate com o que está listado dentro.
  if (validos.length > 0) {
    alocado = validos.reduce((s, i) => s + (i.valorNegociado ?? 0), 0);
  }

  if (alocado === null || alocado <= 0) {
    return { error: "Informe o valor alocado." };
  }

  const supabase = createClient();

  const { data: salvo, error } = await supabase
    .from("evento_fornecedor_orcamento")
    .upsert(
      {
        event_id: eventId,
        supplier_id: supplierId,
        valor_estimado_inicial: estimado,
        valor_alocado: alocado,
        observacao: observacao || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,supplier_id" }
    )
    .select("id")
    .single();

  if (error || !salvo) {
    return {
      error:
        "Não foi possível salvar a verba. Se o banco não foi atualizado, execute a migração 063_financeiro_duas_contas.sql.",
    };
  }

  const orcamentoId = (salvo as { id: string }).id;

  await supabase
    .from("evento_fornecedor_item")
    .delete()
    .eq("evento_fornecedor_orcamento_id", orcamentoId);

  if (validos.length > 0) {
    const { error: erroItens } = await supabase
      .from("evento_fornecedor_item")
      .insert(
        validos.map((i) => ({
          evento_fornecedor_orcamento_id: orcamentoId,
          descricao: i.descricao.trim(),
          valor_estimado_inicial: i.valorEstimadoInicial,
          valor_negociado: i.valorNegociado,
        }))
      );
    if (erroItens) return { error: "Verba salva, mas os itens falharam." };
  }

  revalidate(eventId);
  return { ok: true };
}

export async function excluirVerbaFornecedor(
  eventId: string,
  orcamentoId: string
): Promise<{ error: string } | { ok: true }> {
  const supabase = createClient();

  // Os itens caem por cascade; as parcelas já lançadas ficam, porque são
  // dinheiro que de fato foi movimentado.
  const { error } = await supabase
    .from("evento_fornecedor_orcamento")
    .delete()
    .eq("id", orcamentoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível remover a verba." };
  revalidate(eventId);
  return { ok: true };
}
