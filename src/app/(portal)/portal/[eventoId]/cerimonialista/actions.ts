"use server";

// O convite para a cerimonialista (188), do lado da noiva: o link que ela
// manda e a resposta ao pedido que chega. Só existe no evento da conta de
// família dela — as funções do banco conferem isso de novo.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoConvite = { error: string } | { token: string; expiraEm: string };

export type PedidoDaCerimonialista = { empresa: string | null; quem: string | null; em: string };
export type EstadoDoConvite = { token: string | null; pedido: PedidoDaCerimonialista | null };

/** Só lê (não cria convite): o link que ainda vale e o pedido esperando. */
export async function estadoDoConvite(eventoId: string): Promise<EstadoDoConvite> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("familia_convite_estado", { p_event_id: eventoId });
  if (error || !data) return { token: null, pedido: null };
  const d = data as { token: string | null; pedido: PedidoDaCerimonialista | null };
  return { token: d.token ?? null, pedido: d.pedido ?? null };
}

export async function linkDoConvite(eventoId: string, novo: boolean): Promise<ResultadoConvite> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("familia_convite_cerimonialista", {
    p_event_id: eventoId,
    p_novo: novo,
  });
  if (error || !data) {
    console.error("[eorganizei:convite] gerar:", error?.code ?? "sem dado");
    return { error: "Não foi possível gerar o link agora. Tente de novo." };
  }
  const d = data as { token: string; expira_em: string };
  revalidatePath(`/portal/${eventoId}`);
  return { token: d.token, expiraEm: d.expira_em };
}

/** A palavra final da família: confirmar passa o evento; recusar cancela o link. */
export async function responderPedido(
  eventoId: string,
  confirmar: boolean
): Promise<{ error: string } | { estado: "aceito" | "recusado" }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("familia_responder_pedido", {
    p_event_id: eventoId,
    p_confirmar: confirmar,
  });
  if (error || !data) {
    const dica = (error as { hint?: string } | null)?.hint;
    console.error("[eorganizei:convite] responder:", error?.code ?? "sem dado");
    return { error: dica || "Não foi possível responder agora. Tente de novo." };
  }
  revalidatePath(`/portal/${eventoId}`, "layout");
  return { estado: (data as { estado: "aceito" | "recusado" }).estado };
}
