"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type CalendarEventItem,
  type CalendarTaskItem,
  type EventStatus,
  type EventType,
} from "@/lib/types";

export const STATUS_BADGE: Record<EventStatus, string> = {
  orcamento: "bg-amber-50 text-amber-700",
  confirmado: "bg-emerald-50 text-emerald-700",
  concluido: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-50 text-red-700",
};

// Chips de tipo neutros (o tipo aparece pelo ícone/label; cor discreta).
export const TYPE_CHIP: Record<EventType, string> = {
  casamento: "bg-gray-100 text-gray-700",
  debutante: "bg-gray-100 text-gray-700",
  formatura: "bg-gray-100 text-gray-700",
  aniversario: "bg-gray-100 text-gray-700",
  corporativo: "bg-gray-100 text-gray-700",
  cha_revelacao: "bg-gray-100 text-gray-700",
  batizado: "bg-gray-100 text-gray-700",
  bodas: "bg-gray-100 text-gray-700",
  outro: "bg-gray-100 text-gray-700",
};

export function eventTitle(event: CalendarEventItem) {
  return `${EVENT_TYPE_LABELS[event.type]} — ${event.client_name ?? "Sem cliente"}`;
}

type Props = {
  date: Date;
  events: CalendarEventItem[];
  tasks: CalendarTaskItem[];
  onClose: () => void;
};

export function DayModal({ date, events, tasks, onClose }: Props) {
  const raw = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">{label}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-900"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-5 w-5"
            >
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Eventos
            </h3>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                Nenhum evento neste dia.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/eventos/${event.id}`}
                      className="block rounded-lg border border-stone-200 p-3 transition-colors hover:border-stone-400"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">
                          {eventTitle(event)}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[event.status]}`}
                        >
                          {EVENT_STATUS_LABELS[event.status]}
                        </span>
                      </div>
                      {event.location && (
                        <p className="mt-1 text-sm text-stone-500">
                          {event.location}
                        </p>
                      )}
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_CHIP[event.type]}`}
                      >
                        {EVENT_TYPE_LABELS[event.type]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Tarefas
            </h3>
            {tasks.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                Nenhuma tarefa neste dia.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-stone-700">{task.title}</p>
                      {task.event_label && (
                        <p className="text-xs text-stone-400">
                          {task.event_label}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="mt-5 border-t border-stone-200 pt-4">
          <Link
            href="/eventos/novo"
            className="block w-full rounded-lg bg-stone-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-stone-700"
          >
            + Novo evento
          </Link>
        </div>
      </div>
    </div>
  );
}
