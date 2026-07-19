import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ModoEvento } from "@/components/modo-evento/ModoEvento";
import type { ModoItem, ModoSupplier, ModoTask } from "@/lib/modo-tema";
import type { CronogramaItem } from "@/lib/cronograma";
import {
  EVENT_TYPE_LABELS,
  type EventType,
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
    // Fonte única do cronograma dinâmico (Etapa 3): status_novo,
    // horários reais, responsável, etc.
    supabase.rpc("cronograma_evento", { p_event_id: eventId }),
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
    (itemsRes.data ?? []) as unknown as CronogramaItem[]
  ).map((i) => ({
    id: i.id,
    time: i.time,
    title: i.title,
    description: i.description,
    statusNovo: i.status_novo,
    supplierName: i.supplier_name,
    responsavelNome: i.responsavel_nome,
    horarioRealInicio: i.horario_real_inicio,
    horarioRealFim: i.horario_real_fim,
    observacao: i.observacao,
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
