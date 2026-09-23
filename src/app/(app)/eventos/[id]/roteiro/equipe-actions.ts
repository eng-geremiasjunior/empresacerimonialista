"use server";

// Equipe do dia (171): quem trabalha neste evento. A RLS por evento
// (pode_editar_evento) é a guarda real; aqui só validamos e revalidamos.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AcaoEquipe = { error: string } | { success: true };

type Dados = { nome: string; telefone: string; posto: string };

function limpar(d: Dados) {
  return {
    nome: d.nome.trim().slice(0, 80),
    telefone: d.telefone.trim().slice(0, 30) || null,
    posto: d.posto.trim().slice(0, 60) || null,
  };
}

export async function adicionarPessoa(eventId: string, d: Dados): Promise<AcaoEquipe> {
  const dados = limpar(d);
  if (!dados.nome) return { error: "Escreva o nome." };
  const supabase = createClient();
  const { data: max } = await supabase
    .from("equipe_do_dia")
    .select("ordem")
    .eq("event_id", eventId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("equipe_do_dia")
    .insert({ event_id: eventId, ...dados, ordem: (max?.ordem ?? 0) + 1 });
  if (error) return { error: "Não foi possível adicionar." };
  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { success: true };
}

export async function salvarPessoa(eventId: string, id: string, d: Dados): Promise<AcaoEquipe> {
  const dados = limpar(d);
  if (!dados.nome) return { error: "Escreva o nome." };
  const supabase = createClient();
  const { error } = await supabase
    .from("equipe_do_dia")
    .update(dados)
    .eq("id", id)
    .eq("event_id", eventId);
  if (error) return { error: "Não foi possível salvar." };
  // o nome e o telefone também moram no item (o que as outras telas leem)
  await supabase
    .from("roteiro_items")
    .update({ responsavel_nome: dados.nome, responsavel_telefone: dados.telefone })
    .eq("event_id", eventId)
    .eq("equipe_do_dia_id", id);
  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { success: true };
}

export async function removerPessoa(eventId: string, id: string): Promise<AcaoEquipe> {
  const supabase = createClient();
  // os itens dela ficam sem ninguém, em vez de mostrar um nome que saiu
  await supabase
    .from("roteiro_items")
    .update({ responsavel_nome: null, responsavel_telefone: null, equipe_do_dia_id: null })
    .eq("event_id", eventId)
    .eq("equipe_do_dia_id", id);
  const { error } = await supabase
    .from("equipe_do_dia")
    .delete()
    .eq("id", id)
    .eq("event_id", eventId);
  if (error) return { error: "Não foi possível remover." };
  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { success: true };
}
