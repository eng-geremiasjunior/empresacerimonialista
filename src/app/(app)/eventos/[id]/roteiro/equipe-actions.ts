"use server";

// Equipe do dia (171): quem trabalha neste evento. A RLS por evento
// (pode_editar_evento) é a guarda real; aqui só validamos e revalidamos.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AcaoEquipe = { error: string } | { success: true; id?: string };

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
  const { data, error } = await supabase
    .from("equipe_do_dia")
    .insert({ event_id: eventId, ...dados, ordem: (max?.ordem ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível adicionar." };
  revalidatePath(`/eventos/${eventId}/roteiro`);
  // o id volta para a tela abrir a lista "Designar itens" dela na hora
  return { success: true, id: data.id as string };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Designar itens" (25/09/2026): o que é dela, marcado de uma vez na
 * linha da pessoa — horários do roteiro e itens do checklist do dia.
 * Marcado passa a ser dela (e sai de quem cuidava); desmarcado, que era
 * dela, fica sem ninguém. Mesmas regras de quem cuida da edição do item
 * (quemCuida em actions.ts) e do "— quem?" do checklist (um dono só).
 */
export async function designarItens(
  eventId: string,
  pessoaId: string,
  escolha: { roteiro: string[]; checklist: string[] }
): Promise<AcaoEquipe> {
  const roteiro = escolha.roteiro.filter((id) => UUID.test(id)).slice(0, 500);
  const checklist = escolha.checklist.filter((id) => UUID.test(id)).slice(0, 500);
  const supabase = createClient();
  const { data: pessoa } = await supabase
    .from("equipe_do_dia")
    .select("id, nome, telefone")
    .eq("id", pessoaId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!pessoa) return { error: "Essa pessoa não está mais na equipe." };

  // horários: o nome e o telefone moram também no item (o que o Modo
  // Evento, a folha impressa e o link do fornecedor leem)
  let saiRoteiro = supabase
    .from("roteiro_items")
    .update({ equipe_do_dia_id: null, responsavel_nome: null, responsavel_telefone: null })
    .eq("event_id", eventId)
    .eq("equipe_do_dia_id", pessoaId);
  if (roteiro.length) saiRoteiro = saiRoteiro.not("id", "in", `(${roteiro.join(",")})`);
  const r1 = await saiRoteiro;
  const r2 = roteiro.length
    ? await supabase
        .from("roteiro_items")
        .update({
          equipe_do_dia_id: pessoa.id,
          responsavel_nome: pessoa.nome,
          responsavel_telefone: pessoa.telefone ?? null,
        })
        .eq("event_id", eventId)
        .in("id", roteiro)
    : { error: null };

  const agora = new Date().toISOString();
  let saiChecklist = supabase
    .from("evento_checklist_dia")
    .update({ equipe_do_dia_id: null, updated_at: agora })
    .eq("event_id", eventId)
    .eq("equipe_do_dia_id", pessoaId);
  if (checklist.length) saiChecklist = saiChecklist.not("id", "in", `(${checklist.join(",")})`);
  const r3 = await saiChecklist;
  const r4 = checklist.length
    ? await supabase
        .from("evento_checklist_dia")
        .update({ equipe_do_dia_id: pessoa.id, responsavel_membro_id: null, updated_at: agora })
        .eq("event_id", eventId)
        .in("id", checklist)
    : { error: null };

  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath(`/eventos/${eventId}/modo-evento`);
  if (r1.error || r2.error || r3.error || r4.error) {
    return { error: "Parte dos itens não foi salva. Tente de novo." };
  }
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
