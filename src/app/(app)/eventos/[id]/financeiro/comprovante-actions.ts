"use server";

// Comprovante e confirmação de pagamento.
//
// A regra que rege as duas: o valor que vale é o que ELA confirmou. O que
// a leitura extraiu fica guardado à parte, em jsonb, para auditoria — e
// para medir a qualidade da leitura quando ela for automática.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoComprovante = { error: string } | { success: true };

export async function salvarComprovante(
  eventId: string,
  transactionId: string,
  comprovante: { path: string; nome: string; dados: Record<string, unknown> }
): Promise<ResultadoComprovante> {
  const supabase = createClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      comprovante_path: comprovante.path,
      comprovante_nome: comprovante.nome,
      comprovante_dados: comprovante.dados,
      comprovante_em: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível anexar o comprovante." };
  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true };
}

/**
 * Marca pago com o valor que ela confirmou.
 *
 * Se o valor confirmado for MENOR que a parcela, o pagamento é parcial:
 * a parcela recebe o valor pago e o restante vira uma nova parcela em
 * aberto. Sem isso, um pagamento parcial some da fila e o saldo
 * desaparece — que é exatamente o erro que a planilha dela comete.
 */
export async function confirmarPagamento(
  eventId: string,
  transactionId: string,
  confirmado: { valor: number; data: string; forma: string }
): Promise<ResultadoComprovante> {
  const supabase = createClient();

  const { data: original } = await supabase
    .from("transactions")
    .select(
      "id, value, description, due_date, type, category, conta, supplier_id, objetivo_id, origem_pagamento, tipo_lancamento"
    )
    .eq("id", transactionId)
    .eq("event_id", eventId)
    .single();

  if (!original) return { error: "Lançamento não encontrado." };

  const previsto = Number(original.value);
  const pago = Number(confirmado.valor);
  if (!Number.isFinite(pago) || pago <= 0) {
    return { error: "Informe um valor válido." };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      value: pago,
      paid: true,
      paid_at: confirmado.data,
      payment_method: confirmado.forma,
    })
    .eq("id", transactionId);

  if (error) return { error: "Não foi possível confirmar o pagamento." };

  // pagamento parcial: o que faltou continua devendo, com o mesmo dono
  const falta = Number((previsto - pago).toFixed(2));
  if (falta > 0.009) {
    await supabase.from("transactions").insert({
      event_id: eventId,
      type: original.type,
      value: falta,
      due_date: original.due_date,
      paid: false,
      description: `${original.description ?? "Parcela"} — saldo`,
      category: original.category,
      conta: original.conta,
      supplier_id: original.supplier_id,
      objetivo_id: original.objetivo_id,
      origem_pagamento: original.origem_pagamento,
      tipo_lancamento: "saldo",
    });
  }

  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true };
}

/** Uma URL assinada para abrir o comprovante guardado (bucket privado). */
export async function urlDoComprovante(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("comprovantes")
    .createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}
