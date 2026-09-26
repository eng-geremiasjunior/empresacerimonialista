"use server";

// As tarefas da família (179). O que a cerimonialista pediu só se marca
// pela função do portal (a família não escreve na tabela da equipe); o
// que a família inclui é dela, pela RLS.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Retorno = { ok: true } | { error: string };

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/tarefas`);
  revalidatePath(`/portal/${eventoId}`);
}

export async function criarTarefa(
  eventoId: string,
  f: { titulo: string; quando: string | null; quem: string | null }
): Promise<Retorno> {
  const titulo = f.titulo.trim().slice(0, 120);
  if (!titulo) return { error: "Escreva a tarefa." };
  if (f.quando && !/^\d{4}-\d{2}-\d{2}$/.test(f.quando)) return { error: "Confira a data." };
  const supabase = createClient();
  const { error } = await supabase.from("familia_tarefa").insert({
    event_id: eventoId,
    titulo,
    quando: f.quando,
    quem: f.quem?.trim().slice(0, 40) || null,
  });
  if (error) return { error: "Não foi possível incluir agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function marcarTarefa(
  eventoId: string,
  t: { id: string; origem: "pedida" | "propria" },
  feita: boolean
): Promise<Retorno> {
  const supabase = createClient();
  if (t.origem === "pedida") {
    const { data, error } = await supabase.rpc("portal_concluir_tarefa", { p_task_id: t.id, p_feita: feita });
    const r = data as { ok: boolean; erro?: string } | null;
    if (error || !r?.ok) {
      return { error: r?.erro === "marcada_pela_equipe" ? "Quem marcou foi a cerimonialista." : "Não foi possível salvar agora." };
    }
  } else {
    const { error } = await supabase
      .from("familia_tarefa")
      .update({ feita_em: feita ? new Date().toISOString() : null })
      .eq("id", t.id)
      .eq("event_id", eventoId);
    if (error) return { error: "Não foi possível salvar agora." };
  }
  revalidar(eventoId);
  return { ok: true };
}

export async function apagarTarefa(eventoId: string, id: string): Promise<Retorno> {
  const supabase = createClient();
  const { error } = await supabase.from("familia_tarefa").delete().eq("id", id).eq("event_id", eventoId);
  if (error) return { error: "Não foi possível apagar agora." };
  revalidar(eventoId);
  return { ok: true };
}
