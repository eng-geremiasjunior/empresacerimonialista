"use server";

// A parte do casal no site: mensagem, história e o que vestir. Vai por
// RPC (128) porque o portal não escreve na tabela — a RPC limita as
// colunas ao que é deles. Nada disso fica público na hora: a
// cerimonialista publica quando estiver pronto.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoSite = { ok?: boolean; error?: string };

export async function salvarSiteCasal(
  eventoId: string,
  dados: { mensagem: string; historia: string; dressCode: string }
): Promise<ResultadoSite> {
  const supabase = createClient();
  const { error } = await supabase.rpc("portal_salvar_site", {
    p_event_id: eventoId,
    p_mensagem: dados.mensagem,
    p_historia: dados.historia,
    p_dress_code: dados.dressCode,
  });

  if (error) {
    console.error("[vela:portal] site:", error.code, error.message);
    if (error.code === "PGRST202") {
      return { error: "O site do casamento ainda não está disponível." };
    }
    if (error.code === "P0001" && error.message.includes("longo")) {
      return { error: "Algum texto passou do tamanho — encurte um pouco." };
    }
    return { error: "Não foi possível salvar agora." };
  }
  revalidatePath(`/portal/${eventoId}/site`);
  return { ok: true };
}
