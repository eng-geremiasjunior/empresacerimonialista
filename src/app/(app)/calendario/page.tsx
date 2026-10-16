import { SubNav } from "@/components/SubNav";
import { VISOES_EVENTOS } from "@/lib/visoes";
import { createClient } from "@/lib/supabase/server";
import { Calendar } from "@/components/calendar/Calendar";
import {
  EVENT_TYPE_LABELS,
  type CalendarCompromissoItem,
  type CalendarEventItem,
  type CalendarTaskItem,
  type EventType,
} from "@/lib/types";

export default async function CalendarioPage() {
  const supabase = createClient();

  const [{ data: eventsData }, { data: tasksData }, livres, reunioes, { data: cargoData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, type, date, location, status, clients(name)")
      .order("date", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, due_date, events(type, clients(name))")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true }),
    // a agenda livre (213); sem a 213, lista vazia
    supabase
      .from("agenda_item")
      .select("id, titulo, data, hora, local")
      .order("data", { ascending: true })
      .then((r) => (r.error ? [] : r.data ?? [])),
    // as reuniões marcadas dentro dos eventos (069)
    supabase
      .from("compromisso")
      .select("id, titulo, data, hora, local, estado, event_id, events(type, name, clients(name))")
      .neq("estado", "cancelado")
      .order("data", { ascending: true })
      .then((r) => (r.error ? [] : r.data ?? [])),
    supabase.rpc("meu_cargo").maybeSingle(),
  ]);
  const podeEscrever = ["proprietaria", "coordenadora", "cerimonialista"].includes(
    (cargoData as { cargo?: string } | null)?.cargo ?? ""
  );

  const compromissos: CalendarCompromissoItem[] = [
    ...(livres as { id: string; titulo: string; data: string; hora: string | null; local: string | null }[]).map((c) => ({
      id: c.id,
      date: c.data,
      hora: c.hora?.slice(0, 5) ?? null,
      titulo: c.titulo,
      local: c.local,
      origem: "livre" as const,
      evento_label: null,
      href: null,
    })),
    ...(reunioes as unknown as {
      id: string;
      titulo: string;
      data: string;
      hora: string | null;
      local: string | null;
      event_id: string;
      events: { type: EventType; name: string | null; clients: { name: string } | null } | null;
    }[]).map((c) => ({
      id: c.id,
      date: c.data,
      hora: c.hora?.slice(0, 5) ?? null,
      titulo: c.titulo,
      local: c.local,
      origem: "evento" as const,
      evento_label: c.events ? c.events.name || `${EVENT_TYPE_LABELS[c.events.type]}${c.events.clients?.name ? ` — ${c.events.clients.name}` : ""}` : null,
      href: `/eventos/${c.event_id}`,
    })),
  ];

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
      <SubNav itens={VISOES_EVENTOS} />
      <div>
        <h1 className="text-xl font-semibold">Agenda</h1>
      </div>
      <Calendar events={events} tasks={tasks} compromissos={compromissos} podeEscrever={podeEscrever} />
    </div>
  );
}
