"use server";

// Compartilhar a restrição alimentar dos noivos com UM fornecedor.
//
// É um ato consciente, por fornecedor: o buffet precisa saber, o DJ não.
// Enquanto a linha não existe, o link daquele fornecedor não mostra
// nada. Desfazer tira do ar na hora.
//
// Medicamento não tem equivalente disto — não sai de tela logada.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoAlergia = { error: string } | { success: true };

/** O texto que o fornecedor vai ver — para ela conferir ANTES de mandar. */
export async function alergiaCompartilhavel(
  eventId: string
): Promise<{ texto: string | null; conferida: boolean }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("evento_campo_valor")
    .select("valor_texto, aguarda_conferencia")
    .eq("event_id", eventId)
    .eq("sensibilidade", "alergia")
    .not("valor_texto", "is", null);

  const linhas = (data ?? []) as {
    valor_texto: string;
    aguarda_conferencia: boolean;
  }[];
  if (linhas.length === 0) return { texto: null, conferida: false };

  return {
    texto: linhas.map((l) => l.valor_texto).join(" · "),
    // basta uma resposta não conferida para o link ainda não mostrar
    conferida: linhas.every((l) => !l.aguarda_conferencia),
  };
}

export async function compartilharAlergia(
  eventId: string,
  supplierId: string
): Promise<ResultadoAlergia> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("evento_alergia_compartilhada")
    .upsert(
      {
        event_id: eventId,
        supplier_id: supplierId,
        compartilhado_por: user?.id ?? null,
      },
      { onConflict: "event_id,supplier_id", ignoreDuplicates: true }
    );

  if (error) return { error: "Não foi possível compartilhar." };
  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { success: true };
}

export async function pararDeCompartilharAlergia(
  eventId: string,
  supplierId: string
): Promise<ResultadoAlergia> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_alergia_compartilhada")
    .delete()
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId);

  if (error) return { error: "Não foi possível desfazer." };
  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { success: true };
}
