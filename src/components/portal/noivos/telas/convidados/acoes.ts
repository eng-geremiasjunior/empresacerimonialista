"use server";

// "Levar para a trilha do DJ": os pedidos de música que ainda esperam o
// casal viram aprovados — é o estado que a folha do DJ (/imprimir/musica)
// imprime. Mesma porta da moderação do site (decidirMusica): update
// direto em evento_musica, com a RLS da 129 dizendo se a família pode.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Retorno = { ok: true; quantos: number } | { error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function levarPedidosParaODJ(eventoId: string): Promise<Retorno> {
  if (!UUID.test(eventoId)) return { error: "Evento inválido." };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_musica")
    .update({ estado: "aprovada" })
    .eq("event_id", eventoId)
    .eq("estado", "sugerida")
    .select("id");
  if (error) return { error: "Não foi possível levar agora." };
  if (!data || data.length === 0) return { error: "Nenhum pedido novo para levar." };
  revalidatePath(`/portal/${eventoId}/convidados`);
  revalidatePath(`/portal/${eventoId}/site`);
  return { ok: true, quantos: data.length };
}
