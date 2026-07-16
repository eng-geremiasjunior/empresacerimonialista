import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { ArrowLeft, Pencil, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventTabs } from "@/components/evento/EventTabs";
import { getSaudeEvento } from "@/lib/supabase/evento";
import { getEventoContadores } from "@/lib/supabase/resumo-evento";
import { formatDate } from "@/lib/format";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";

const STATUS_STYLES: Record<EventStatus, string> = {
  orcamento: "bg-amber-50 text-amber-700",
  confirmado: "bg-emerald-50 text-emerald-700",
  concluido: "bg-sky-50 text-sky-700",
  cancelado: "bg-rose-50 text-rose-700",
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
    .select("id, type, name, date, location, city, status, clients(name)")
    .eq("id", params.id)
    .single();

  if (!data) notFound();

  const event = data as unknown as {
    id: string;
    type: EventType;
    name: string | null;
    date: string;
    location: string | null;
    city: string | null;
    status: EventStatus;
    clients: { name: string } | null;
  };

  const [saude, contadores] = await Promise.all([
    getSaudeEvento(event.id),
    getEventoContadores(event.id),
  ]);

  const titulo =
    event.name ||
    `${EVENT_TYPE_LABELS[event.type]}${event.clients?.name ? ` — ${event.clients.name}` : ""}`;

  const dias = differenceInCalendarDays(
    new Date(`${event.date}T00:00:00`),
    new Date(new Date().toDateString())
  );
  const proximidade =
    dias > 0
      ? `Faltam ${dias} dia${dias === 1 ? "" : "s"}`
      : dias === 0
        ? "É hoje"
        : `Realizado em ${formatDate(event.date)}`;

  const local = event.location || event.city;

  // Modo Evento: destaque cresce com a proximidade (item 2).
  const modoDestaque = dias <= 7 && dias >= 0;
  const modoHoje = dias === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Cabeçalho compacto e rico (item 1) */}
      <div>
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={15} />
          Voltar para eventos
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                {titulo}
              </h1>
              <Link
                href={`/eventos/${event.id}/editar`}
                aria-label="Editar dados do evento"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <Pencil size={16} />
              </Link>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(event.date)}
              {local ? ` · ${local}` : ""}
              {" · "}
              <span
                className={
                  dias >= 0 && dias <= 7 ? "font-medium text-gray-700" : ""
                }
              >
                {proximidade}
              </span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLES[event.status]}`}
            >
              {EVENT_STATUS_LABELS[event.status]}
            </span>
          </div>
        </div>

        {/* Progresso geral (reaproveita a Saúde do Evento) */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Progresso geral</span>
            <span className="font-semibold tabular-nums text-gray-900">
              {saude.score}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${
                saude.score >= 80
                  ? "bg-emerald-500"
                  : saude.score >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${saude.score}%` }}
            />
          </div>
        </div>

        {/* Modo Evento — condicional por proximidade (item 2) */}
        <div className="mt-4">
          {modoDestaque && !modoHoje && (
            <p className="mb-1 text-xs font-medium text-gray-500">
              {proximidade} — prepare o modo evento
            </p>
          )}
          <Link
            href={`/eventos/${event.id}/modo-evento`}
            className={
              modoHoje
                ? "flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white ring-2 ring-indigo-200 transition-colors hover:bg-indigo-700"
                : modoDestaque
                  ? "flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                  : "inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400"
            }
          >
            <Play size={modoDestaque ? 16 : 14} strokeWidth={2} />
            Modo Evento
          </Link>
        </div>
      </div>

      <EventTabs
        eventId={event.id}
        counters={{
          fornecedores: contadores.fornecedoresPendentes,
          comunicacao: contadores.comunicacaoNaoLidas,
          financeiro: contadores.financeiroVencendo,
        }}
      />

      <div>{children}</div>
    </div>
  );
}
