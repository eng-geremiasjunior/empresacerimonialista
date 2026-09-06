"use server";

// A saída do portal.
//
// Dois destinos porque um e-mail é UMA sessão só no navegador. Quem entra
// por /portal/entrar carrega a marca app_metadata.portal e, ao sair, volta
// para a porta da cliente. Mas a cerimonialista pode abrir o portal com a
// PRÓPRIA conta — para conferir o que a cliente vê — e essa conta não tem
// a marca: mandá-la para /portal/entrar seria trancá-la na porta errada.
// Ela volta para o /login dela.
//
// A marca é lida ANTES do signOut: depois dele não há mais usuário para
// perguntar.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sairDoPortal() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ehPortal = user?.app_metadata?.portal === true;

  await supabase.auth.signOut();
  redirect(ehPortal ? "/portal/entrar" : "/login");
}
