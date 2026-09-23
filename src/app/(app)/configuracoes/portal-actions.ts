"use server";

// O convite automático para o portal (173): liga ou desliga. A política
// empresas_owner (021) é a guarda: só a dona escreve na empresa dela.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function alternarConviteAutomatico(ligado: boolean): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { data } = await supabase.rpc("meu_cargo").maybeSingle();
  const c = data as { empresa_id: string; cargo: string } | null;
  if (!c || c.cargo !== "proprietaria") return { error: "Só a proprietária muda isso." };
  const { error } = await supabase
    .from("empresas")
    .update({ convidar_portal_no_aceite: ligado })
    .eq("id", c.empresa_id);
  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/configuracoes");
  return { success: true };
}
