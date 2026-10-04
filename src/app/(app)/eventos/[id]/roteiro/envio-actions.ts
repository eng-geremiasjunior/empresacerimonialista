"use server";

// "Mandar o roteiro para todos" (04/10/2026): grava em roteiro_links quando
// o link foi mandado a cada fornecedor (199), para o "enviado" aparecer em
// qualquer aparelho e para toda a equipe. Sem a 199 aplicada, devolve
// semColuna e a tela segue lembrando só no aparelho, como antes.

import { createClient } from "@/lib/supabase/server";

export async function marcarRoteiroEnviado(
  eventId: string,
  supplierId: string
): Promise<{ ok: true; em: string } | { semColuna: true } | { error: string }> {
  const supabase = createClient();
  const em = new Date().toISOString();
  const { data, error } = await supabase
    .from("roteiro_links")
    .update({ roteiro_enviado_em: em })
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId)
    .select("supplier_id");
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") return { semColuna: true };
    console.error("[eorganizei:roteiro-enviado]", error.code, error.message);
    return { error: "Não foi possível marcar como enviado." };
  }
  // RLS que filtra em silêncio não pode virar "enviado" na tela
  if (!data || data.length === 0) return { error: "Não foi possível marcar como enviado." };
  return { ok: true, em };
}
