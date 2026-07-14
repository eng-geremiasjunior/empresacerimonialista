import Link from "next/link";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventTabs } from "@/components/evento/EventTabs";
import { SaudeEvento } from "@/components/evento/SaudeEvento";
import { getSaudeEvento } from "@/lib/supabase/evento";
import { formatDate } from "@/lib/format";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";

const STATUS_STYLES: Record<EventStatus, string> = {
  orcamento: "bg-amber-100 text-amber-800",
  confirmado: "bg-emerald-100 text-emerald-800",
  concluido: "bg-sky-100 text-sky-800",
  cancelado: "bg-rose-100 text-rose-700",
};

export default async function EventoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = createClient();

  const { data } = await supabase
    .from("events")
    .select("id, type, date, location, status, clients(name)")
    .eq("id", params.id)
    .single();

  if (!data) {
    notFound();
  }

  const event = data as unknown as {
    id: string;
    type: EventType;
    date: string;
    location: string | null;
    status: EventStatus;
    clients: { name: string } | null;
  };

  const saude = await getSaudeEvento(event.id);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link
          href="/eventos"
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          ← Eventos
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              {EVENT_TYPE_LABELS[event.type]}
              {event.clients?.name ? ` — ${event.clients.name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {formatDate(event.date)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLES[event.status]}`}
          >
            {EVENT_STATUS_LABELS[event.status]}
          </span>
        </div>
      </div>

      {/* Copiloto — Saúde do Evento */}
      <SaudeEvento saude={saude} eventId={event.id} />

      <Link
        href={`/eventos/${event.id}/modo-evento`}
        className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        <Play size={16} strokeWidth={2} />
        Modo Evento
      </Link>

      <EventTabs eventId={event.id} />

      <div>{children}</div>
    </div>
  );
}
