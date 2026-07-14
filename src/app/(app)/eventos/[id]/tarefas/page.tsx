import { createClient } from "@/lib/supabase/server";
import { EventTasks } from "@/components/evento/EventTasks";
import { EVENT_TYPE_LABELS, type EventType, type TaskItem } from "@/lib/types";

export default async function EventoTarefasPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const [{ data: eventData }, tasksResult] = await Promise.all([
    supabase
      .from("events")
      .select("type, clients(name)")
      .eq("id", eventId)
      .single(),
    supabase
      .from("tasks")
      .select(
        "id, event_id, title, description, due_date, due_time, status, priority, category, events(id, type, date, location, clients(name))"
      )
      .eq("event_id", eventId)
      .order("due_date", { ascending: true })
      .order("due_time", { ascending: true }),
  ]);

  const ev = eventData as unknown as {
    type: EventType;
    clients: { name: string } | null;
  } | null;
  const eventLabel = ev
    ? `${EVENT_TYPE_LABELS[ev.type]} — ${ev.clients?.name ?? "Sem cliente"}`
    : "Evento";

  const tasks = (tasksResult.data ?? []) as unknown as TaskItem[];

  return (
    <>
      {tasksResult.error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar as tarefas. Execute as migrações pendentes
          (até a 005) no SQL Editor do Supabase.
        </div>
      )}
      <EventTasks eventId={eventId} eventLabel={eventLabel} tasks={tasks} />
    </>
  );
}
