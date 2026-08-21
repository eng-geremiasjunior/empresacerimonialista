"use client";

// O lado do navegador do aviso: um interruptor, uma RPC.
//
// membros_equipe só aceita UPDATE da dona da empresa (024), então a
// pessoa não consegue mexer na própria linha direto — a 116 abriu uma
// função security definer com escopo de uma linha, do mesmo jeito que a
// 090 fez para nome e WhatsApp.

import { createClient } from "@/lib/supabase/client";

export type RespostaAviso = { ativo: boolean } | { error: string };

export async function definirAvisoWhatsapp(
  ativo: boolean
): Promise<RespostaAviso> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("definir_aviso_whatsapp", {
    p_ativo: ativo,
  });

  if (error) {
    // a RPC recusa em português quando falta número ou a sessão caiu;
    // vale mostrar a frase dela, não uma genérica
    return { error: error.message || "Não foi possível salvar." };
  }

  const linha = (data as { ativo: boolean }[] | null)?.[0];
  return { ativo: linha?.ativo ?? ativo };
}
