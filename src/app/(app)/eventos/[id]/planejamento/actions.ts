"use server";

// Ações da tela de Planejamento. Escrevem na árvore do método (4A) via
// client de servidor — a RLS por evento (pode_editar_evento) é a guarda
// real; aqui só revalidamos o cache da rota.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AcaoResult = { error: string } | { success: true };

const ESTADOS = ["pendente", "decidida", "nao_se_aplica"] as const;
type Estado = (typeof ESTADOS)[number];

async function mudarEstado(
  eventId: string,
  decisaoId: string,
  estado: Estado
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_decisao")
    .update({
      estado,
      // carimba a data só ao decidir; ao voltar para pendente/n-a, limpa.
      decidida_em: estado === "decidida" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", decisaoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar a decisão." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

export async function decidirDecisao(eventId: string, decisaoId: string) {
  return mudarEstado(eventId, decisaoId, "decidida");
}

export async function marcarNaoSeAplica(eventId: string, decisaoId: string) {
  return mudarEstado(eventId, decisaoId, "nao_se_aplica");
}

// Reabrir: tanto "reativar" um item marcado não se aplica quanto desfazer
// uma decisão voltam para pendente.
export async function reabrirDecisao(eventId: string, decisaoId: string) {
  return mudarEstado(eventId, decisaoId, "pendente");
}

// Tique no checklist-guia: ajuda a pensar, então é só um marcado por item.
export async function alternarGuia(
  eventId: string,
  guiaId: string,
  marcado: boolean
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_guia")
    .update({ marcado })
    .eq("id", guiaId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar o guia." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}
