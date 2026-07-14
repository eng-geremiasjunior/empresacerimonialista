import { addDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { ConsolidatedTasks } from "@/components/tasks/ConsolidatedTasks";
import { EVENT_TYPE_LABELS, type EventType, type TaskItem } from "@/lib/types";

export default async function TarefasPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, event_id, title, description, due_date, due_time, status, priority, category, events(id, type, date, location, clients(name))"
    )
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true });

  const tasks = ((data ?? []) as unknown as TaskItem[]).map((task) => {
    const ev = task.events as unknown as {
      type: EventType;
      clients: { name: string } | null;
    } | null;
    return {
      ...task,
      eventLabel: ev
        ? `${EVENT_TYPE_LABELS[ev.type]} — ${ev.clients?.name ?? "Sem cliente"}`
        : null,
    };
  });

  const now = new Date();
  const todayIso = format(now, "yyyy-MM-dd");
  const tomorrowIso = format(addDays(now, 1), "yyyy-MM-dd");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tarefas</h1>
        <p className="text-sm text-stone-500">
          Todas as tarefas de todos os eventos. Para criar ou editar, entre no
          evento.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar as tarefas. Execute as migrações pendentes
          no SQL Editor do Supabase.
        </div>
      )}

      <ConsolidatedTasks
        tasks={tasks}
        todayIso={todayIso}
        tomorrowIso={tomorrowIso}
      />
    </div>
  );
}
