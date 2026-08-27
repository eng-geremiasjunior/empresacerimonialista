"use server";

// Criar a colação como evento próprio (formatura com colação e baile
// separados). A RPC (125) copia cliente e empresa do principal, liga por
// evento_pai_id e semeia o roteiro do protocolo da colação na âncora
// nova. Idempotente: se já existe, devolve a existente.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoColacao = { ok?: boolean; id?: string; error?: string };

export async function criarColacao(
  eventId: string,
  date: string,
  time: string | null,
  location: string | null
): Promise<ResultadoColacao> {
  if (!date) return { error: "Informe a data da colação." };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("criar_evento_colacao", {
    p_pai_id: eventId,
    p_date: date,
    p_time: time || null,
    p_location: location?.trim() || null,
  });

  if (error || !data) {
    console.error("[vela:colacao]", error?.code, error?.message);
    if (error?.code === "PGRST202") {
      return { error: "A colação em evento próprio ainda não está disponível." };
    }
    return { error: "Não foi possível criar o evento da colação." };
  }

  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/eventos");
  return { ok: true, id: data as string };
}
