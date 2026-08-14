"use server";

// O arquivo em si sobe direto do navegador para o bucket (policy da
// 092 guarda quem pode escrever na pasta do evento). Aqui só registramos
// a linha e cuidamos da remoção — que precisa tirar as duas coisas.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoInspiracao = { error: string } | { success: true };

export async function registrarInspiracao(
  eventoId: string,
  storagePath: string,
  assunto: string,
  legenda: string
): Promise<ResultadoInspiracao> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("evento_inspiracao").insert({
    event_id: eventoId,
    storage_path: storagePath,
    assunto: assunto || "geral",
    legenda: legenda.trim() ? legenda.trim().slice(0, 200) : null,
    criado_por: user?.id ?? null,
  });

  if (error) return { error: "Não foi possível guardar a imagem." };
  revalidatePath(`/portal/${eventoId}/inspiracoes`);
  return { success: true };
}

export async function removerInspiracao(
  eventoId: string,
  id: string,
  storagePath: string
): Promise<ResultadoInspiracao> {
  const supabase = createClient();

  const { error } = await supabase
    .from("evento_inspiracao")
    .delete()
    .eq("id", id)
    .eq("event_id", eventoId);
  if (error) return { error: "Não foi possível remover." };

  // o arquivo depois da linha: se falhar, sobra um órfão no bucket em
  // vez de uma imagem que a tela mostra e não consegue abrir
  await supabase.storage.from("inspiracoes").remove([storagePath]);

  revalidatePath(`/portal/${eventoId}/inspiracoes`);
  return { success: true };
}
