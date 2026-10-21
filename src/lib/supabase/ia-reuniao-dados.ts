import "server-only";

// O que a reunião precisa saber do evento (21/10/2026). Pela SESSÃO dela:
// a RLS decide o que ela enxerga. Nenhum telefone nem e-mail vai à IA.

import { createClient } from "@/lib/supabase/server";
import { hhmm } from "@/lib/ia-roteiro";
import type { ContextoDaReuniao } from "@/lib/ia-reuniao";

type Sessao = ReturnType<typeof createClient>;
type Um<T> = T | T[] | null;
const um = <T,>(v: Um<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export type Reuniao = { id: string; titulo: string; data: string; hora: string | null; local: string | null; temAta: boolean };

export async function lerContextoDaReuniao(supabase: Sessao, eventId: string, hoje: string): Promise<ContextoDaReuniao | null> {
  const { data: ev } = await supabase
    .from("events")
    .select("id, name, date, time, clients(name)")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return null;
  const e = ev as unknown as { name: string | null; date: string; time: string | null; clients: Um<{ name: string | null }> };
  const cliente = um(e.clients)?.name ?? null;

  const [decisoes, tarefas, cronograma] = await Promise.all([
    supabase
      .from("evento_decisao")
      .select("id, titulo, responsavel, prazo_previsto")
      .eq("event_id", eventId)
      .eq("estado", "pendente")
      .order("prazo_previsto", { ascending: true })
      .limit(80),
    supabase.from("tasks").select("title, responsavel, due_date").eq("event_id", eventId).neq("status", "concluido").limit(200),
    supabase.rpc("cronograma_evento", { p_event_id: eventId }),
  ]);

  return {
    evento: { nome: e.name?.trim() || cliente || "o evento", data: e.date, hora: hhmm(e.time) },
    cliente,
    hoje,
    decisoes: ((decisoes.data ?? []) as { id: string; titulo: string; responsavel: string | null; prazo_previsto: string | null }[]).map(
      (d) => ({ id: d.id, titulo: d.titulo, responsavel: d.responsavel, prazo: d.prazo_previsto })
    ),
    tarefasAbertas: ((tarefas.data ?? []) as { title: string; responsavel: string | null; due_date: string | null }[]).map((t) => ({
      titulo: t.title,
      responsavel: t.responsavel,
      prazo: t.due_date,
    })),
    roteiro: ((cronograma.data ?? []) as { id: string; time: string | null; title: string; status_novo: string }[]).map((i) => ({
      id: i.id,
      horario: hhmm(i.time),
      titulo: i.title,
      status: i.status_novo,
    })),
  };
}

/** As reuniões do evento (compromissos, 069) e se cada uma já tem ata no Caderno. */
export async function lerReunioes(supabase: Sessao, eventId: string): Promise<Reuniao[]> {
  const [{ data: comps }, { data: notas }] = await Promise.all([
    supabase.from("compromisso").select("id, titulo, data, hora, local").eq("event_id", eventId).order("data", { ascending: true }).limit(60),
    supabase.from("event_notes").select("compromisso_id, content").eq("event_id", eventId).not("compromisso_id", "is", null),
  ]);
  // a ata começa por "Reunião de" (textoDaAta); a pauta guardada não conta
  const comAta = new Set(
    ((notas ?? []) as { compromisso_id: string; content: string }[])
      .filter((n) => n.content.startsWith("Reunião de"))
      .map((n) => n.compromisso_id)
  );
  return ((comps ?? []) as { id: string; titulo: string; data: string; hora: string | null; local: string | null }[]).map((c) => ({
    ...c,
    temAta: comAta.has(c.id),
  }));
}
