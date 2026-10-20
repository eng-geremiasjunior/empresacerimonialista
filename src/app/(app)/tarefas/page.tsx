import { createClient } from "@/lib/supabase/server";
import { ConsolidatedTasks, type ConsolidatedTask } from "@/components/tasks/ConsolidatedTasks";
import { NovaTarefa } from "@/components/tasks/NovaTarefa";
import { comAssunto, tituloDoEmbed } from "@/lib/assunto-da-tarefa";
import { EVENT_TYPE_LABELS, type EventType, type TaskItem } from "@/lib/types";
import { hojeBR, somarDias } from "@/lib/tempo";

// Tarefas (19/10/2026): as dos eventos e as dela, sem evento (217). Abre
// no que está por fazer; "+ Tarefa" cria com ou sem evento.

export default async function TarefasPage() {
  const supabase = createClient();
  const hoje = hojeBR();

  const [tarefasRes, livresRes, eventosRes] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, event_id, title, description, due_date, due_time, status, priority, category, evento_decisao(titulo), events(id, type, date, location, clients(name))"
      )
      .order("due_date", { ascending: true })
      .order("due_time", { ascending: true }),
    // a tabela é da 217: antes dela aplicada, a lista segue só com as do evento
    supabase.from("tarefa_livre").select("id, titulo, prazo, feita_em").order("prazo", { ascending: true }).limit(500),
    // os eventos que ainda vão acontecer, para "+ Tarefa" com evento
    supabase
      .from("events")
      .select("id, type, date, clients(name)")
      .in("status", ["orcamento", "confirmado"])
      .gte("date", hoje)
      .order("date", { ascending: true })
      .limit(100),
  ]);

  const doEvento: ConsolidatedTask[] = ((tarefasRes.data ?? []) as unknown as TaskItem[]).map((task) => {
    const ev = task.events as unknown as {
      type: EventType;
      clients: { name: string } | null;
    } | null;
    return {
      ...task,
      // seis contratações geram seis "Assinar e arquivar o contrato": o assunto vai na frente
      title: comAssunto(task.title, tituloDoEmbed((task as unknown as { evento_decisao?: unknown }).evento_decisao)),
      eventLabel: ev ? `${EVENT_TYPE_LABELS[ev.type]} — ${ev.clients?.name ?? "Sem cliente"}` : null,
    };
  });

  const livres: ConsolidatedTask[] = (
    (livresRes.error ? [] : livresRes.data ?? []) as { id: string; titulo: string; prazo: string | null; feita_em: string | null }[]
  ).map(
    (t) =>
      ({
        id: t.id,
        event_id: null,
        title: t.titulo,
        description: null,
        due_date: t.prazo,
        due_time: null,
        status: t.feita_em ? "concluido" : "pendente",
        priority: "media",
        category: "geral",
        eventLabel: null,
        livre: true,
      }) as unknown as ConsolidatedTask
  );

  const eventos = (
    (eventosRes.data ?? []) as unknown as { id: string; type: EventType; date: string | null; clients: { name: string } | null }[]
  ).map((e) => {
    const [a, m, d] = (e.date ?? "").split("-");
    return {
      id: e.id,
      rotulo: `${e.clients?.name ?? EVENT_TYPE_LABELS[e.type] ?? "Evento"}${e.date ? ` · ${d}/${m}/${a}` : ""}`,
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tarefas</h1>
          <p className="text-sm text-stone-500">As suas e as dos eventos.</p>
        </div>
        <NovaTarefa eventos={eventos} />
      </div>

      {tarefasRes.error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar as tarefas agora. Recarregue a página em alguns instantes.
        </div>
      )}

      <ConsolidatedTasks tasks={[...livres, ...doEvento]} todayIso={hoje} tomorrowIso={somarDias(hoje, 1)} />
    </div>
  );
}
