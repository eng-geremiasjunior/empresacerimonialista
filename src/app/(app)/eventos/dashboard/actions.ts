"use server";

// "Pular e ir para o painel" e "Dispensar" dos passos: preferência da
// pessoa, guardada no user_metadata dela (updateUser junta as chaves, não
// apaga as outras).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function marcar(chave: "onboarding_dispensado" | "passos_dispensados") {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ data: { [chave]: true } });
  if (error) console.error("[vela:primeiro-acesso]", chave, error.message);
  revalidatePath("/eventos/dashboard");
}

export async function pularBoasVindas() {
  await marcar("onboarding_dispensado");
}

export async function dispensarPassos() {
  await marcar("passos_dispensados");
}
