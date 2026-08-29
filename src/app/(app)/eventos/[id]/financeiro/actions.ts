"use server";

import { addDays, addMonths, format } from "date-fns";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { desmascararDinheiro } from "@/lib/format";
import { hojeBR } from "@/lib/tempo";

export type FinanceiroFormState = { error: string } | { ok: true } | null;

function revalidate(eventId: string) {
  // A frase da sidebar ("N parcelas a cobrar") nasce no layout raiz.
  revalidatePath("/", "layout");
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
  const hoje = hojeBR();
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
      // Receita do contrato: sempre da conta assessoria.
      conta: "assessoria",
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
      conta: "assessoria",
    });
  }

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) {
    return {
      error:
        "Não foi possível gerar as parcelas agora. Tente de novo em alguns instantes.",
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
  const value = desmascararDinheiro(String(formData.get("value") ?? "")) ?? NaN;
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
    // Conta e fornecedor andam juntos (CHECK da 063): com fornecedor o
    // lançamento é da conta dele; sem, é da assessoria.
    conta: supplierId ? "fornecedor" : "assessoria",
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
  // O `.select("id")` não é enfeite: quando a RLS filtra a linha, o
  // PostgREST devolve error=null e zero linhas. Sem ele a ação respondia
  // {ok:true}, a tela revalidava e o valor voltava em aberto — sucesso na
  // mensagem, nada no banco.
  const { data, error } = await supabase
    .from("transactions")
    .update({
      paid: true,
      paid_at: new Date(`${paidAt}T12:00:00`).toISOString(),
      payment_method: method || null,
    })
    .eq("id", transactionId)
    .eq("event_id", eventId)
    .select("id");

  if (error) {
    console.error("[vela:financeiro] marcarPago:", error.message);
    return { error: "Não foi possível marcar como pago." };
  }
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para alterar este lançamento." };
  }

  revalidate(eventId);
  return { ok: true };
}

// As duas abaixo são `form action`, então devolvem void — e por isso
// nem liam o `error`. Engoliam gatilho, constraint e recusa da RLS, e
// mostravam a tela recarregada como se tivesse dado certo. Sem canal de
// retorno, o jeito honesto é lançar: o error.tsx da área logada mostra o
// aviso, e a alternativa era o valor voltar sozinho sem explicação.
export async function desmarcarPago(eventId: string, transactionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({ paid: false, paid_at: null, payment_method: null })
    .eq("id", transactionId)
    .eq("event_id", eventId)
    .select("id");
  if (error) {
    console.error("[vela:financeiro] desmarcarPago:", error.message);
    throw new Error("Não foi possível desmarcar o pagamento.");
  }
  if (!data || data.length === 0) {
    throw new Error("Você não tem permissão para alterar este lançamento.");
  }
  revalidate(eventId);
}

export async function excluirTransacao(eventId: string, transactionId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("event_id", eventId)
    .select("id");
  if (error) {
    console.error("[vela:financeiro] excluirTransacao:", error.message);
    throw new Error("Não foi possível excluir o lançamento.");
  }
  if (!data || data.length === 0) {
    throw new Error("Você não tem permissão para excluir este lançamento.");
  }
  revalidate(eventId);
}

// ------------------------------------------------------------
// Pendências financeiras (074): fechar o ciclo da automação
// ------------------------------------------------------------
// A tarefa concluída abriu um rascunho; aqui ele vira lançamento real, ou
// é dado por revisado/descartado. Valor, fornecedor e data vêm da
// cerimonialista — a automação nunca inventa dinheiro.

export async function resolverPendenciaComLancamento(
  eventId: string,
  pendenciaId: string,
  _prev: FinanceiroFormState,
  formData: FormData
): Promise<FinanceiroFormState> {
  const description = String(formData.get("description") ?? "").trim();
  const value = desmascararDinheiro(String(formData.get("value") ?? "")) ?? NaN;
  const dueDate = String(formData.get("due_date") ?? "");
  const supplierId = String(formData.get("supplier_id") ?? "");
  const paid = String(formData.get("paid") ?? "") === "true";

  if (!description) return { error: "Informe a descrição." };
  if (!Number.isFinite(value) || value <= 0) {
    return { error: "Informe um valor válido." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { error: "Informe a data de vencimento." };
  }

  const supabase = createClient();

  const { data: criada, error: erroTx } = await supabase
    .from("transactions")
    .insert({
      event_id: eventId,
      type: "despesa",
      description,
      category: "outro",
      value,
      due_date: dueDate,
      paid,
      paid_at: paid ? new Date().toISOString() : null,
      supplier_id: supplierId || null,
      // Mesma regra da 063: com fornecedor é conta dele; sem, assessoria.
      conta: supplierId ? "fornecedor" : "assessoria",
    })
    .select("id")
    .single();

  if (erroTx || !criada) {
    return { error: "Não foi possível lançar. Tente novamente." };
  }

  // Fecha o ciclo: a pendência aponta para o lançamento que a resolveu.
  const { error: erroPend } = await supabase
    .from("financeiro_pendencia")
    .update({
      status: "resolvida",
      transaction_id: criada.id,
      resolvida_em: new Date().toISOString(),
    })
    .eq("id", pendenciaId)
    .eq("event_id", eventId);

  if (erroPend) {
    return { error: "Lançamento criado, mas a pendência não fechou." };
  }

  revalidate(eventId);
  return { ok: true };
}

// Revisão de custo não gera lançamento: a cerimonialista confere e dá por
// resolvida. Descartar serve para o que não se aplica.
export async function fecharPendencia(
  eventId: string,
  pendenciaId: string,
  status: "resolvida" | "descartada"
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("financeiro_pendencia")
    .update({ status, resolvida_em: new Date().toISOString() })
    .eq("id", pendenciaId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar a pendência." };
  revalidate(eventId);
  return {};
}
