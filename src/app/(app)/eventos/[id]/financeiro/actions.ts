"use server";

// As três ações de conserto do Financeiro do evento: desfazer um
// pagamento, excluir um lançamento e fechar uma pendência da automação.
//
// O resto do que a tela escreve mora em tela-actions.ts (o modal),
// comprovante-actions.ts (pagar e anexar) e lancamento-actions.ts (verba,
// fechamento e conciliação).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FinanceiroFormState = { error: string } | { ok: true } | null;

function revalidate(eventId: string) {
  // A frase da sidebar ("N parcelas a cobrar") nasce no layout raiz.
  revalidatePath("/", "layout");
  revalidatePath(`/eventos/${eventId}`, "layout");
  revalidatePath("/financeiro");
  revalidatePath("/eventos/dashboard");
}

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
