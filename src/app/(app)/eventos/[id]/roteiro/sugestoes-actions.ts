"use server";

// A fila de sugestões da cliente.
//
// Aceitar APLICA: mudar o horário do momento, ou criar o momento novo.
// Recusar exige motivo — a cliente vê a resposta no portal dela, e
// "recusada" sem explicação é pior que não ter pedido.
//
// Enquanto a sugestão está pendente ou recusada, ela não encosta em
// roteiro_items — logo, nunca aparece no link do fornecedor.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoSugestao = { error: string } | { success: true };

export async function aceitarSugestao(
  eventId: string,
  sugestaoId: string
): Promise<ResultadoSugestao> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: s } = await supabase
    .from("roteiro_sugestao")
    .select("id, tipo, roteiro_item_id, horario_sugerido, titulo_sugerido, estado")
    .eq("id", sugestaoId)
    .eq("event_id", eventId)
    .single();

  if (!s) return { error: "Sugestão não encontrada." };
  if (s.estado !== "pendente") return { error: "Essa sugestão já foi respondida." };

  if (s.tipo === "horario") {
    if (!s.roteiro_item_id || !s.horario_sugerido) {
      return { error: "A sugestão não tem horário." };
    }
    const { error } = await supabase
      .from("roteiro_items")
      .update({ time: s.horario_sugerido })
      .eq("id", s.roteiro_item_id)
      .eq("event_id", eventId);
    if (error) return { error: "Não foi possível mudar o horário." };
  } else {
    const { error } = await supabase.from("roteiro_items").insert({
      event_id: eventId,
      time: s.horario_sugerido,
      title: s.titulo_sugerido,
      status: "pendente",
      status_novo: "planejado",
    });
    if (error) return { error: "Não foi possível criar o momento." };
  }

  await supabase
    .from("roteiro_sugestao")
    .update({
      estado: "aceita",
      decidida_por: user?.id ?? null,
      decidida_em: new Date().toISOString(),
    })
    .eq("id", sugestaoId);

  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath(`/portal/${eventId}/cronograma`);
  return { success: true };
}

export async function recusarSugestao(
  eventId: string,
  sugestaoId: string,
  motivo: string
): Promise<ResultadoSugestao> {
  if (!motivo.trim()) {
    return { error: "Escreva o motivo — ela vai ler no portal." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("roteiro_sugestao")
    .update({
      estado: "recusada",
      motivo_recusa: motivo.trim().slice(0, 600),
      decidida_por: user?.id ?? null,
      decidida_em: new Date().toISOString(),
    })
    .eq("id", sugestaoId)
    .eq("event_id", eventId)
    .eq("estado", "pendente");

  if (error) return { error: "Não foi possível responder." };
  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath(`/portal/${eventId}/cronograma`);
  return { success: true };
}
