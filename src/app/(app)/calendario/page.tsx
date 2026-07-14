import { createClient } from "@/lib/supabase/server";
import { Calendar } from "@/components/calendar/Calendar";
import {
  EVENT_TYPE_LABELS,
  type CalendarEventItem,
  type CalendarTaskItem,
  type EventType,
} from "@/lib/types";

export default async function CalendarioPage() {
  const supabase = createClient();

  const [{ data: eventsData }, { data: tasksData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, type, date, location, status, clients(name)")
      .order("date", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, due_date, events(type, clients(name))")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true }),
  ]);

  const events: CalendarEventItem[] = (eventsData ?? []).map((row) => {
    const record = row as unknown as {
      id: string;
      type: CalendarEventItem["type"];
      date: string;
      location: string | null;
      status: CalendarEventItem["status"];
      clients: { name: string } | null;
    };
    return {
      id: record.id,
      date: record.date,
      type: record.type,
      status: record.status,
      client_name: record.clients?.name ?? null,
      location: record.location,
    };
  });

  const tasks: CalendarTaskItem[] = (tasksData ?? []).map((row) => {
    const record = row as unknown as {
      id: string;
      title: string;
      due_date: string;
      events: { type: EventType; clients: { name: string } | null } | null;
    };
    return {
      id: record.id,
      date: record.due_date,
      title: record.title,
      event_label: record.events
        ? `${EVENT_TYPE_LABELS[record.events.type]} — ${record.events.clients?.name ?? "Sem cliente"}`
        : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Calendário</h1>
        <p className="text-sm text-stone-500">
          Eventos, tarefas e prazos em um só lugar
        </p>
      </div>
      <Calendar events={events} tasks={tasks} />
    </div>
  );
}
