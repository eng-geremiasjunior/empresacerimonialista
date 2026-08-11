import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { ArrowLeft, Pencil, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventTabs } from "@/components/evento/EventTabs";
import { EventoContainer } from "@/components/evento/EventoContainer";
import { ProgressoEvento } from "@/components/eventos/ProgressoEvento";
import { ResumoDaFase } from "@/components/eventos/ResumoDaFase";
import { getCabecalhoEvento } from "@/lib/supabase/resumo-evento";
import { formatDate } from "@/lib/format";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";

// Pílula de status: bolinha + rótulo, fundo bem sutil. As cores vêm dos
// tokens --ev-st-* (default = as de hoje; no tema neutro do Planejamento
// viram os estados do handoff — decidido não comemora).
const STATUS_VARS: Record<EventStatus, string> = {
  orcamento: "orcamento",
  confirmado: "confirmado",
  concluido: "concluido",
  cancelado: "cancelado",
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

  const { saude, fases, contadores } = await getCabecalhoEvento(
    event.id,
    event.date
  );

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
    <EventoContainer>
      {/* Cabeçalho compacto e rico (item 1) */}
      <div>
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--ev-text-muted)] hover:text-[color:var(--ev-text-strong)]"
        >
          <ArrowLeft size={15} />
          Voltar para eventos
        </Link>

        {/* Status em pílula com bolinha */}
        <span
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            background: `var(--ev-st-${STATUS_VARS[event.status]}-bg)`,
            color: `var(--ev-st-${STATUS_VARS[event.status]}-fg)`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "currentColor" }}
          />
          {EVENT_STATUS_LABELS[event.status]}
        </span>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--ev-text-strong)]">
                {titulo}
              </h1>
              <Link
                href={`/eventos/${event.id}/editar`}
                aria-label="Editar dados do evento"
                className="rounded p-1 text-[color:var(--ev-text-faint)] hover:bg-black/5 hover:text-[color:var(--ev-text-body)]"
              >
                <Pencil size={16} />
              </Link>
            </div>
            <p className="mt-1 text-sm text-[color:var(--ev-text-muted)]">
              {formatDate(event.date)}
              {local ? ` · ${local}` : ""}
              {" · "}
              <span
                className={
                  dias >= 0 && dias <= 7
                    ? "font-medium text-[color:var(--ev-text-body)]"
                    : ""
                }
              >
                {proximidade}
              </span>
            </p>
          </div>

          {/* Modo Evento — condicional por proximidade (item 2) */}
          <div className="shrink-0">
            {modoDestaque && !modoHoje && (
              <p className="mb-1 text-right text-xs font-medium text-[color:var(--ev-text-muted)]">
                {proximidade}
              </p>
            )}
            <Link
              href={`/eventos/${event.id}/modo-evento`}
              className={
                modoHoje
                  ? "flex items-center justify-center gap-2 rounded-xl bg-[color:var(--ev-cta)] px-4 py-2.5 text-sm font-semibold text-white ring-2 ring-[color:var(--ev-cta-ring)] transition-opacity hover:opacity-90"
                  : modoDestaque
                    ? "flex items-center justify-center gap-2 rounded-xl bg-[color:var(--ev-text-strong)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    : "inline-flex items-center gap-2 rounded-lg border border-[color:var(--ev-card-border)] bg-[color:var(--ev-card-bg)] px-3.5 py-2 text-sm font-medium text-[color:var(--ev-text-body)] transition-colors hover:border-[color:var(--ev-text-faint)]"
              }
            >
              <Play size={modoDestaque ? 16 : 14} strokeWidth={2} />
              Modo Evento
            </Link>
          </div>
        </div>
      </div>

      {/* Jornada: stepper clicável + resumo da fase aberta */}
      <ProgressoEvento saude={saude} fases={fases} />
      <ResumoDaFase saude={saude} fases={fases} eventId={event.id} />

      <EventTabs
        eventId={event.id}
        counters={{
          fornecedores: contadores.fornecedoresPendentes,
          comunicacao: contadores.comunicacaoNaoLidas,
          financeiro: contadores.financeiroVencendo,
        }}
      />

      <div>{children}</div>
    </EventoContainer>
  );
}
