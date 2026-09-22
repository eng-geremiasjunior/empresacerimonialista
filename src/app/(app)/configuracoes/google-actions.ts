"use server";

// Desconectar o Google Agenda (168): apaga a agenda "eOrganizei" da conta
// dela, revoga a chave no Google e apaga a conexão aqui. O que não der
// para fazer do lado do Google não impede a saída — ela pediu para sair,
// e sai; a agenda que sobrar lá ela apaga à mão.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decifrar } from "@/lib/google/cifra";
import { renovarAcesso, revogar } from "@/lib/google/oauth";
import { apagarAgenda } from "@/lib/google/agenda";
import { servicoGoogle } from "@/lib/google/servico";

export async function desconectarGoogle(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const db = servicoGoogle();
  const { data } = await db
    .from("google_agenda_conexao")
    .select("refresh_token_cifrado, calendario_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const c = data as { refresh_token_cifrado: string; calendario_id: string | null } | null;
  if (!c) return { ok: true };

  try {
    const chave = decifrar(c.refresh_token_cifrado);
    const acesso = await renovarAcesso(chave);
    if (acesso.ok && c.calendario_id) {
      try {
        await apagarAgenda(acesso.accessToken, c.calendario_id);
      } catch (e) {
        console.error("[vela:google] apagar agenda ao desconectar:", (e instanceof Error ? e.message : String(e)).slice(0, 120));
      }
    }
    await revogar(chave);
  } catch (e) {
    console.error("[vela:google] desconectar:", (e instanceof Error ? e.message : String(e)).slice(0, 120));
  }

  const { error } = await db.from("google_agenda_conexao").delete().eq("user_id", user.id);
  if (error) return { error: "Não foi possível desconectar agora. Tente de novo em instantes." };
  // o que estava na fila só para ela não tem mais destino
  await db.from("google_agenda_fila").delete().eq("apenas_user_id", user.id);

  revalidatePath("/configuracoes");
  return { ok: true };
}
