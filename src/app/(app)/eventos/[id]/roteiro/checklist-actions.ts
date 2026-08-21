"use server";

// Ajuste do checklist do dia — a parte estrutural, que acontece ANTES do
// dia: editar título, definir responsável, esconder o que não se aplica,
// acrescentar item daquele evento. Riscar no dia é outra porta
// (conferir_item_dia, que aceita assistente escalada).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BLOCOS = ["montagem", "cerimonia", "recepcao", "desmontagem"] as const;
export type BlocoDia = (typeof BLOCOS)[number];

type Resultado = { error: string } | { success: true };

function volta(eventId: string) {
  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath(`/eventos/${eventId}/modo-evento`);
}

export async function criarItemChecklist(
  eventId: string,
  bloco: string,
  titulo: string
): Promise<Resultado> {
  const nome = titulo.trim();
  if (!nome) return { error: "Escreva o item." };
  if (!BLOCOS.includes(bloco as BlocoDia)) return { error: "Bloco inválido." };

  const supabase = createClient();

  // avulso entra depois dos itens do modelo dentro do bloco
  const { data: ultimo } = await supabase
    .from("evento_checklist_dia")
    .select("ordem")
    .eq("event_id", eventId)
    .eq("bloco", bloco)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("evento_checklist_dia").insert({
    event_id: eventId,
    bloco,
    titulo: nome,
    ordem: (ultimo?.ordem ?? 0) + 10,
  });

  if (error) return { error: "Não deu para adicionar o item." };
  volta(eventId);
  return { success: true };
}

export async function editarItemChecklist(
  eventId: string,
  itemId: string,
  patch: { titulo?: string; horario?: string | null; responsavelMembroId?: string | null }
): Promise<Resultado> {
  const supabase = createClient();

  const dados: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.titulo !== undefined) {
    const nome = patch.titulo.trim();
    if (!nome) return { error: "O item precisa de um texto." };
    dados.titulo = nome;
  }
  if (patch.horario !== undefined) {
    if (patch.horario && !/^\d{2}:\d{2}(:\d{2})?$/.test(patch.horario)) {
      return { error: "Horário inválido." };
    }
    dados.horario = patch.horario || null;
  }
  if (patch.responsavelMembroId !== undefined) {
    dados.responsavel_membro_id = patch.responsavelMembroId || null;
  }

  const { error } = await supabase
    .from("evento_checklist_dia")
    .update(dados)
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) return { error: "Não deu para salvar." };
  volta(eventId);
  return { success: true };
}

/**
 * Item do modelo nunca é apagado — vira inativo, senão a próxima
 * semeadura o ressuscitaria. Avulso (sem template) é apagado de verdade.
 */
export async function esconderItemChecklist(
  eventId: string,
  itemId: string,
  esconder: boolean
): Promise<Resultado> {
  const supabase = createClient();

  const { data: item } = await supabase
    .from("evento_checklist_dia")
    .select("template_id")
    .eq("id", itemId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!item) return { error: "Item não encontrado." };

  if (esconder && item.template_id === null) {
    const { error } = await supabase
      .from("evento_checklist_dia")
      .delete()
      .eq("id", itemId)
      .eq("event_id", eventId);
    if (error) return { error: "Não deu para remover." };
  } else {
    const { error } = await supabase
      .from("evento_checklist_dia")
      .update({ ativo: !esconder, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("event_id", eventId);
    if (error) return { error: "Não deu para salvar." };
  }

  volta(eventId);
  return { success: true };
}
