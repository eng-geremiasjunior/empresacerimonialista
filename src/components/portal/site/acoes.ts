"use server";

// O que o "Nosso site" pergunta ao servidor além das actions da página.
//
// podeMexerNosPresentes: o nível de quem está logado deixa mudar os itens
// de presente? É a mesma régua que a 191 aplica na gravação
// (portal_pode_fazer 'gestao'): sem ela, o editor só mostra a lista e
// nunca tenta gravar o que o banco recusaria. Só volta true ou false.

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function podeMexerNosPresentes(eventoId: string): Promise<boolean> {
  if (typeof eventoId !== "string" || !UUID.test(eventoId)) return false;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_pode_fazer", {
    p_event_id: eventoId,
    p_area: "gestao",
  });
  if (error) {
    console.error("[eorganizei:portal] nível do site:", error.code);
    return false;
  }
  return data === true;
}
