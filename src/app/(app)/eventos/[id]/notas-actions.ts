"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NotaEvento = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
};

export async function criarNota(
  eventId: string,
  content: string
): Promise<{ error?: string }> {
  const texto = content.trim();
  if (!texto) return { error: "Escreva algo na nota" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase.from("event_notes").insert({
    event_id: eventId,
    author_id: user.id,
    content: texto,
  });

  // Tabela ausente (migração 028 pendente).
  if (error?.code === "42P01" || error?.code === "PGRST205") {
    return { error: "Notas indisponíveis — aplique a migração 028." };
  }
  if (error) return { error: "Não foi possível salvar a nota" };

  revalidatePath(`/eventos/${eventId}`);
  return {};
}

export async function excluirNota(
  eventId: string,
  notaId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("event_notes")
    .delete()
    .eq("id", notaId);
  if (error) return { error: "Não foi possível excluir a nota" };
  revalidatePath(`/eventos/${eventId}`);
  return {};
}
