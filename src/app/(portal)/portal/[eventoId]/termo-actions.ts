"use server";

// O termo do responsável (175): a confirmação passa por uma função do
// banco que só marca a linha de acesso da PRÓPRIA pessoa, num evento de
// debutante, e nunca a da debutante. A cliente não escreve em
// evento_acesso direto (086).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmarResponsavel(
  eventoId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_confirmar_responsavel", {
    p_event_id: eventoId,
  });
  if (error || data !== true) {
    return { error: "Não foi possível confirmar agora. Tente de novo." };
  }
  revalidatePath(`/portal/${eventoId}`, "layout");
  return { ok: true };
}
