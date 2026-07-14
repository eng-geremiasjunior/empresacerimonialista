import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ModoEvento } from "@/components/modo-evento/ModoEvento";
import type { ModoItem, ModoSupplier, ModoTask } from "@/lib/modo-tema";
import {
  EVENT_TYPE_LABELS,
  type EventType,
  type RoteiroStatus,
  type TaskPriority,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modo Evento — Vela",
};

export default async function ModoEventoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tudo escopado por event_id (RLS garante que é da cerimonialista logada).
  const [eventRes, itemsRes, linksRes, tasksRes] = await Promise.all([
    supabase
      .from("events")
      .select("type, date, clients(name)")
      .eq("id", eventId)
      .single(),
    supabase
      .from("roteiro_items")
      .select("id, time, title, description, status, suppliers(name)")
      .eq("event_id", eventId)
      .order("time", { ascending: true }),
    supabase
      .from("roteiro_links")
      .select("confirmed, suppliers(name)")
      .eq("event_id", eventId),
    supabase
      .from("tasks")
      .select("id, title, priority")
      .eq("event_id", eventId)
      .eq("priority", "alta")
      .neq("status", "concluido"),
  ]);

  if (!eventRes.data) {
    notFound();
  }

  const event = eventRes.data as unknown as {
    type: EventType;
    date: string;
    clients: { name: string } | null;
  };

  const eventLabel = `${EVENT_TYPE_LABELS[event.type]} — ${
    event.clients?.name ?? "Sem cliente"
  }`;

  const items: ModoItem[] = (
    (itemsRes.data ?? []) as unknown as {
      id: string;
      time: string | null;
      title: string;
      description: string | null;
      status: RoteiroStatus;
      suppliers: { name: string } | null;
    }[]
  ).map((i) => ({
    id: i.id,
    time: i.time,
    title: i.title,
    description: i.description,
    status: i.status,
    supplierName: i.suppliers?.name ?? null,
  }));

  const suppliers: ModoSupplier[] = (
    (linksRes.data ?? []) as unknown as {
      confirmed: boolean;
      suppliers: { name: string } | null;
    }[]
  )
    .filter((l) => l.suppliers)
    .map((l) => ({ name: l.suppliers!.name, confirmed: l.confirmed }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const tasks: ModoTask[] = (
    (tasksRes.data ?? []) as unknown as {
      id: string;
      title: string;
      priority: TaskPriority;
    }[]
  ).map((task) => ({ id: task.id, title: task.title, priority: task.priority }));

  return (
    <ModoEvento
      eventId={eventId}
      eventLabel={eventLabel}
      eventDate={event.date}
      items={items}
      suppliers={suppliers}
      tasks={tasks}
    />
  );
}
