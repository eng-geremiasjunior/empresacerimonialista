import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { ArrowLeft, Pencil, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventTabs } from "@/components/evento/EventTabs";
import { ProgressoEvento } from "@/components/eventos/ProgressoEvento";
import { getCabecalhoEvento } from "@/lib/supabase/resumo-evento";
import { formatDate } from "@/lib/format";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";

// Pílula de status: bolinha colorida + rótulo, fundo bem sutil.
const STATUS_STYLES: Record<EventStatus, { pill: string; dot: string }> = {
  orcamento: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  confirmado: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  concluido: { pill: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  cancelado: { pill: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
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

  const { saude, fases, contadores } = await getCabecalhoEvento(event.id);

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

        {/* Status em pílula com bolinha */}
        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[event.status].pill}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[event.status].dot}`} />
          {EVENT_STATUS_LABELS[event.status]}
        </span>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
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

          {/* Modo Evento — condicional por proximidade (item 2) */}
          <div className="shrink-0">
            {modoDestaque && !modoHoje && (
              <p className="mb-1 text-right text-xs font-medium text-gray-500">
                {proximidade}
              </p>
            )}
            <Link
              href={`/eventos/${event.id}/modo-evento`}
              className={
                modoHoje
                  ? "flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white ring-2 ring-indigo-200 transition-colors hover:bg-indigo-700"
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
      </div>

      {/* Card de progresso com stepper de 3 fases */}
      <ProgressoEvento saude={saude} fases={fases} />

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
