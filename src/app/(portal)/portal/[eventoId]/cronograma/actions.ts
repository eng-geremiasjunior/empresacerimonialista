"use server";

// A cliente sugere; nunca edita. A RPC confere que o item é do evento
// dela (ela não lê a tabela do cronograma, então o id vem de fora e
// precisa ser validado no servidor).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoSugestao = { error: string } | { success: true };

const ERROS: Record<string, string> = {
  sem_acesso: "Não foi possível enviar.",
  item_invalido: "Esse momento não está mais no programa.",
  faltou_dado: "Escolha o horário que vocês preferem.",
  faltou_titulo: "Escreva o que vocês gostariam de incluir.",
};

export async function sugerirHorario(
  eventoId: string,
  itemId: string,
  horario: string,
  mensagem: string
): Promise<ResultadoSugestao> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("sugerir_no_cronograma", {
    p_event_id: eventoId,
    p_tipo: "horario",
    p_item_id: itemId,
    p_horario: horario,
    p_titulo: null,
    p_mensagem: mensagem || null,
  });

  const r = data as { ok: boolean; erro?: string } | null;
  if (error || !r?.ok) {
    return { error: ERROS[r?.erro ?? ""] ?? "Não foi possível enviar." };
  }
  revalidatePath(`/portal/${eventoId}/cronograma`);
  return { success: true };
}

export async function pedirMomento(
  eventoId: string,
  titulo: string,
  horario: string,
  mensagem: string
): Promise<ResultadoSugestao> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("sugerir_no_cronograma", {
    p_event_id: eventoId,
    p_tipo: "momento_novo",
    p_item_id: null,
    p_horario: horario || null,
    p_titulo: titulo,
    p_mensagem: mensagem || null,
  });

  const r = data as { ok: boolean; erro?: string } | null;
  if (error || !r?.ok) {
    return { error: ERROS[r?.erro ?? ""] ?? "Não foi possível enviar." };
  }
  revalidatePath(`/portal/${eventoId}/cronograma`);
  return { success: true };
}
