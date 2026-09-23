"use server";

// O Caderno do evento (172): as anotações dela — soltas no mês, presas a
// uma decisão ou a uma reunião — e as reuniões marcadas ali mesmo. Nota
// NÃO vira tarefa: é o caderno dela. A RLS da 028/172 é a guarda (ver o
// evento para escrever; a autora ou quem edita o evento para mudar).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type R = { error: string } | { success: true };

export type NotaDoCaderno = {
  id: string;
  texto: string;
  criadaEm: string;
  /** yyyy-mm-01; nulo = o mês em que foi escrita */
  mes: string | null;
  decisaoId: string | null;
  reuniaoId: string | null;
};

export type ReuniaoDoCaderno = {
  id: string;
  titulo: string;
  data: string;
  hora: string | null;
  local: string | null;
};

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/planejamento`);
  revalidatePath(`/eventos/${eventId}`);
}

export async function anotarNoCaderno(
  eventId: string,
  nota: { texto: string; mes?: string | null; decisaoId?: string | null; reuniaoId?: string | null }
): Promise<R> {
  const texto = nota.texto.trim().slice(0, 4000);
  if (!texto) return { error: "Escreva a anotação." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para anotar." };
  const mes = nota.mes && /^\d{4}-\d{2}/.test(nota.mes) ? `${nota.mes.slice(0, 7)}-01` : null;
  const { error } = await supabase.from("event_notes").insert({
    event_id: eventId,
    author_id: user.id,
    content: texto,
    mes,
    evento_decisao_id: nota.decisaoId ?? null,
    compromisso_id: nota.reuniaoId ?? null,
  });
  if (error) return { error: "Não foi possível salvar a anotação." };
  revalidar(eventId);
  return { success: true };
}

export async function editarNotaDoCaderno(eventId: string, id: string, texto: string): Promise<R> {
  const limpo = texto.trim().slice(0, 4000);
  if (!limpo) return { error: "A anotação ficou vazia." };
  const supabase = createClient();
  const { error } = await supabase
    .from("event_notes")
    .update({ content: limpo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("event_id", eventId);
  if (error) return { error: "Não foi possível salvar." };
  revalidar(eventId);
  return { success: true };
}

export async function apagarNotaDoCaderno(eventId: string, id: string): Promise<R> {
  const supabase = createClient();
  const { error } = await supabase.from("event_notes").delete().eq("id", id).eq("event_id", eventId);
  if (error) return { error: "Não foi possível apagar." };
  revalidar(eventId);
  return { success: true };
}

/** Uma reunião é um compromisso (069): aparece também na Organização e na agenda. */
export async function marcarReuniao(
  eventId: string,
  r: { titulo: string; data: string; hora?: string | null }
): Promise<R> {
  const titulo = r.titulo.trim().slice(0, 140);
  if (!titulo) return { error: "Dê um nome à reunião." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data)) return { error: "Escolha a data." };
  const supabase = createClient();
  const { error } = await supabase.from("compromisso").insert({
    event_id: eventId,
    titulo,
    data: r.data,
    hora: r.hora && /^\d{2}:\d{2}/.test(r.hora) ? r.hora : null,
    responsavel: "ambos",
  });
  if (error) return { error: "Não foi possível marcar a reunião." };
  revalidar(eventId);
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}
