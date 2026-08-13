"use server";

// A flag de senha provisória vive em app_metadata, que só o service role
// altera. Se ela morasse em user_metadata, a própria cliente poderia
// declarar-se "já trocou a senha" sem ter trocado — e o middleware pararia
// de exigir a troca.

import { createClient } from "@/lib/supabase/server";
import { limparSenhaProvisoria } from "@/lib/portal-admin";

export async function concluirTrocaDeSenha(): Promise<
  { success: true } | { error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada. Entre de novo." };
  if (user.app_metadata?.portal !== true) {
    return { error: "Este acesso não é do portal." };
  }

  const r = await limparSenhaProvisoria(user.id);
  if (r.error) return { error: "Não foi possível concluir. Tente de novo." };
  return { success: true };
}
