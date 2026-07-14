"use server";

import { addDays, addMonths, format } from "date-fns";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FinanceiroFormState = { error: string } | { ok: true } | null;

function revalidate(eventId: string) {
  revalidatePath(`/eventos/${eventId}`, "layout");
  revalidatePath("/financeiro");
  revalidatePath("/eventos/dashboard");
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Gera as parcelas do contrato: entrada (se nova) + N parcelas com
// vencimentos mensais ou quinzenais a partir da primeira data.
export async function gerarParcelas(
  eventId: string,
  _prev: FinanceiroFormState,
  formData: FormData
): Promise<FinanceiroFormState> {
  const total = Number(String(formData.get("total") ?? "").replace(",", "."));
  const entrada = Number(
    String(formData.get("entrada") ?? "0").replace(",", ".") || "0"
  );
  const entradaJaRegistrada =
    String(formData.get("entrada_registrada") ?? "") === "1";
  const n = Number(formData.get("parcelas") ?? 0);
  const primeira = String(formData.get("primeira_data") ?? "");
  const intervalo = String(formData.get("intervalo") ?? "mensal");

  if (!Number.isFinite(total) || total <= 0) {
    return { error: "Informe o valor total do contrato." };
  }
  if (!Number.isFinite(entrada) || entrada < 0 || entrada > total) {
    return { error: "Entrada inválida (deve ser entre 0 e o total)." };
  }
  if (!Number.isInteger(n) || n < 1 || n > 36) {
    return { error: "Número de parcelas deve ser entre 1 e 36." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(primeira)) {
    return { error: "Informe a data da primeira parcela." };
  }

  const supabase = createClient();
  const hoje = format(new Date(), "yyyy-MM-dd");
  const restante = round2(total - entrada);
  const valorParcela = round2(restante / n);
  const ultimaParcela = round2(restante - valorParcela * (n - 1));

  const rows: Record<string, unknown>[] = [];

  // Entrada nova (ainda não registrada) → receita já paga.
  if (entrada > 0 && !entradaJaRegistrada) {
    rows.push({
      event_id: eventId,
      type: "receita",
      category: "entrada",
      description: "Entrada",
      value: entrada,
      due_date: hoje,
      paid: true,
      paid_at: new Date().toISOString(),
    });
  }

  const base = new Date(`${primeira}T00:00:00`);
  for (let i = 0; i < n; i++) {
    const due =
      intervalo === "quinzenal" ? addDays(base, i * 14) : addMonths(base, i);
    rows.push({
      event_id: eventId,
      type: "receita",
      category: "contrato",
      description: `Parcela ${i + 1} de ${n}`,
      value: i === n - 1 ? ultimaParcela : valorParcela,
      due_date: format(due, "yyyy-MM-dd"),
      paid: false,
      installment_number: i + 1,
      installment_total: n,
    });
  }

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) {
    return {
      error:
        "Não foi possível gerar as parcelas. Se o banco não foi atualizado, execute a migração 017_financeiro.sql.",
    };
  }

  // Mantém o valor do contrato do evento em sincronia com o total informado.
  await supabase
    .from("events")
    .update({ contract_value: total })
    .eq("id", eventId);

  revalidate(eventId);
  return { ok: true };
}

// Lançamento avulso: parcela extra (receita) ou despesa.
export async function criarTransacao(
  eventId: string,
  _prev: FinanceiroFormState,
  formData: FormData
): Promise<FinanceiroFormState> {
  const tipo = String(formData.get("tipo") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "outro");
  const value = Number(String(formData.get("value") ?? "").replace(",", "."));
  const dueDate = String(formData.get("due_date") ?? "");
  const paid = String(formData.get("paid") ?? "") === "true";
  const supplierId = String(formData.get("supplier_id") ?? "");

  if (tipo !== "receita" && tipo !== "despesa") {
    return { error: "Tipo inválido." };
  }
  if (!description) return { error: "Informe a descrição." };
  if (!Number.isFinite(value) || value <= 0) {
    return { error: "Informe um valor válido." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { error: "Informe a data de vencimento." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("transactions").insert({
    event_id: eventId,
    type: tipo,
    description,
    category,
    value,
    due_date: dueDate,
    paid,
    paid_at: paid ? new Date().toISOString() : null,
    supplier_id: supplierId || null,
  });

  if (error) {
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidate(eventId);
  return { ok: true };
}

export async function marcarPago(
  eventId: string,
  transactionId: string,
  _prev: FinanceiroFormState,
  formData: FormData
): Promise<FinanceiroFormState> {
  const paidAt = String(formData.get("paid_at") ?? "");
  const method = String(formData.get("payment_method") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
    return { error: "Informe a data do pagamento." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      paid: true,
      paid_at: new Date(`${paidAt}T12:00:00`).toISOString(),
      payment_method: method || null,
    })
    .eq("id", transactionId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível marcar como pago." };

  revalidate(eventId);
  return { ok: true };
}

export async function desmarcarPago(eventId: string, transactionId: string) {
  const supabase = createClient();
  await supabase
    .from("transactions")
    .update({ paid: false, paid_at: null, payment_method: null })
    .eq("id", transactionId)
    .eq("event_id", eventId);
  revalidate(eventId);
}

export async function excluirTransacao(eventId: string, transactionId: string) {
  const supabase = createClient();
  await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("event_id", eventId);
  revalidate(eventId);
}
