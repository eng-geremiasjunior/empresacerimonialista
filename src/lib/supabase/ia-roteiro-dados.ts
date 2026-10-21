import "server-only";

// O que a IA do roteiro precisa saber do evento (21/10/2026). Tudo pela
// SESSÃO dela: a RLS decide o que ela enxerga, e nada de outra empresa
// chega aqui. Nenhum telefone nem e-mail vai junto.

import { createClient } from "@/lib/supabase/server";
import { padraoDosEventos, type FornecedorDoEvento, type ItemAtual, type ItemDoPadrao } from "@/lib/ia-roteiro";

type Sessao = ReturnType<typeof createClient>;

export type EventoDoRoteiro = {
  id: string;
  type: string;
  date: string;
  time: string | null;
  location: string | null;
  guests: number | null;
};

export async function lerEventoDoRoteiro(supabase: Sessao, eventId: string): Promise<EventoDoRoteiro | null> {
  const { data } = await supabase
    .from("events")
    .select("id, type, date, time, location, guests")
    .eq("id", eventId)
    .maybeSingle();
  return (data as EventoDoRoteiro | null) ?? null;
}

export async function lerItensDoRoteiro(supabase: Sessao, eventId: string): Promise<ItemAtual[]> {
  const { data } = await supabase.rpc("cronograma_evento", { p_event_id: eventId });
  return ((data ?? []) as ItemAtual[]).map((i) => ({
    id: i.id,
    time: i.time,
    title: i.title,
    description: i.description,
    supplier_id: i.supplier_id,
    status_novo: i.status_novo,
    origem_horario: i.origem_horario ?? null,
  }));
}

/** Os fornecedores ligados ao evento (os mesmos do select do roteiro). */
export async function lerFornecedoresDoRoteiro(supabase: Sessao, eventId: string): Promise<FornecedorDoEvento[]> {
  const { data } = await supabase.from("roteiro_links").select("supplier_id, suppliers(id, name)").eq("event_id", eventId);
  const linhas = ((data ?? []) as unknown as { supplier_id: string; suppliers: { id: string; name: string } | null }[]).filter(
    (l) => l.suppliers
  );
  if (!linhas.length) return [];
  const { data: cats } = await supabase
    .from("supplier_categorias")
    .select("supplier_id, categoria")
    .in(
      "supplier_id",
      linhas.map((l) => l.supplier_id)
    );
  const categoria = new Map<string, string>();
  for (const c of (cats ?? []) as { supplier_id: string; categoria: string }[]) {
    if (!categoria.has(c.supplier_id)) categoria.set(c.supplier_id, c.categoria);
  }
  return linhas
    .map((l) => ({ id: l.suppliers!.id, nome: l.suppliers!.name, categoria: categoria.get(l.supplier_id) ?? null }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * O padrão dela: os horários firmes dos eventos anteriores do mesmo tipo
 * (sem os eventos de exemplo). Vazio quando ela ainda não tem histórico.
 */
export async function lerPadraoDoRoteiro(supabase: Sessao, evento: EventoDoRoteiro): Promise<ItemDoPadrao[]> {
  const { data: eventos } = await supabase
    .from("events")
    .select("id, time, date")
    .eq("type", evento.type)
    .neq("id", evento.id)
    .not("exemplo", "is", true)
    .not("time", "is", null)
    .order("date", { ascending: false })
    .limit(12);
  const lista = (eventos ?? []) as { id: string; time: string | null; date: string }[];
  if (!lista.length) return [];
  const { data: itens } = await supabase
    .from("roteiro_items")
    .select("event_id, time, title")
    .in(
      "event_id",
      lista.map((e) => e.id)
    )
    .eq("origem_horario", "manual")
    .not("time", "is", null)
    .limit(600);
  return padraoDosEventos(lista, (itens ?? []) as { event_id: string; time: string | null; title: string }[]);
}
