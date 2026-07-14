"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type CalendarEventItem,
  type CalendarTaskItem,
  type EventStatus,
  type EventType,
} from "@/lib/types";
import { DayModal, TYPE_CHIP, eventTitle } from "./DayModal";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const STATUS_DOT: Record<EventStatus, string> = {
  orcamento: "bg-amber-400",
  confirmado: "bg-green-500",
  concluido: "bg-gray-400",
  cancelado: "bg-rose-500",
};

const selectClass =
  "rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none";

export function capitalizeFirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function EventChip({ event }: { event: CalendarEventItem }) {
  return (
    <div
      className={`group relative rounded px-1.5 py-0.5 ${TYPE_CHIP[event.type]}`}
    >
      <p className="flex items-center gap-1 truncate text-xs font-medium">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[event.status]}`}
        />
        <span className="truncate">{event.client_name ?? "Sem cliente"}</span>
      </p>
      {/* Tooltip (hover) */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden w-56 -translate-x-1/2 rounded-lg bg-stone-900 p-3 text-left shadow-lg group-hover:block">
        <p className="text-xs font-semibold text-white">{eventTitle(event)}</p>
        {event.client_name && (
          <p className="mt-1 text-xs text-stone-300">
            Cliente: {event.client_name}
          </p>
        )}
        {event.location && (
          <p className="text-xs text-stone-300">Local: {event.location}</p>
        )}
        <p className="mt-1.5 text-xs">
          <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium text-white">
            {EVENT_STATUS_LABELS[event.status]}
          </span>
        </p>
      </div>
    </div>
  );
}

type Props = {
  events: CalendarEventItem[];
  tasks: CalendarTaskItem[];
};

export function Calendar({ events: allEvents, tasks }: Props) {
  const [current, setCurrent] = useState(() => startOfMonth(new Date()));
  const [typeFilter, setTypeFilter] = useState<"todos" | EventType>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | EventStatus>(
    "todos"
  );
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const set = new Set<number>([
      currentYear - 1,
      currentYear,
      currentYear + 1,
      currentYear + 2,
    ]);
    for (const event of allEvents) {
      set.add(Number(event.date.slice(0, 4)));
    }
    return Array.from(set).sort();
  }, [allEvents]);

  const events = useMemo(
    () =>
      allEvents.filter(
        (event) =>
          (typeFilter === "todos" || event.type === typeFilter) &&
          (statusFilter === "todos" || event.status === statusFilter)
      ),
    [allEvents, typeFilter, statusFilter]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTaskItem[]>();
    for (const task of tasks) {
      const list = map.get(task.date) ?? [];
      list.push(task);
      map.set(task.date, list);
    }
    return map;
  }, [tasks]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(current), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(current), { weekStartsOn: 0 }),
      }),
    [current]
  );

  const monthDaysWithContent = useMemo(
    () =>
      days.filter((day) => {
        if (!isSameMonth(day, current)) return false;
        const key = format(day, "yyyy-MM-dd");
        return (
          (eventsByDate.get(key) ?? []).length > 0 ||
          (tasksByDate.get(key) ?? []).length > 0
        );
      }),
    [days, current, eventsByDate, tasksByDate]
  );

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : "";

  return (
    <div>
      {/* Header: navegação + seletor de mês/ano + filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrent(addMonths(current, -1))}
            aria-label="Mês anterior"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm hover:border-stone-400"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            aria-label="Próximo mês"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm hover:border-stone-400"
          >
            ›
          </button>
          <button
            onClick={() => setCurrent(startOfMonth(new Date()))}
            className="ml-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-stone-400"
          >
            Hoje
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Mês"
            value={current.getMonth()}
            onChange={(e) =>
              setCurrent(
                new Date(current.getFullYear(), Number(e.target.value), 1)
              )
            }
            className={`${selectClass} capitalize`}
          >
            {Array.from({ length: 12 }, (_, month) => (
              <option key={month} value={month} className="capitalize">
                {format(new Date(2026, month, 1), "MMMM", { locale: ptBR })}
              </option>
            ))}
          </select>
          <select
            aria-label="Ano"
            value={current.getFullYear()}
            onChange={(e) =>
              setCurrent(
                new Date(Number(e.target.value), current.getMonth(), 1)
              )
            }
            className={selectClass}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            aria-label="Filtrar por tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className={selectClass}
          >
            <option value="todos">Todos os tipos</option>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className={selectClass}
          >
            <option value="todos">Todos os status</option>
            {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grade mensal (desktop / tablet) */}
      <div className="mt-4 hidden overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm md:block">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-medium uppercase tracking-wide text-stone-400">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="py-2">
              {weekday}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate.get(key) ?? [];
            const dayTasks = tasksByDate.get(key) ?? [];
            const inMonth = isSameMonth(day, current);

            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDay(day)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSelectedDay(day);
                }}
                className={`min-h-[6.5rem] cursor-pointer border-b border-r border-stone-100 p-1.5 transition-colors hover:bg-stone-50 ${
                  inMonth ? "bg-white" : "bg-stone-50/60"
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday(day)
                      ? "bg-stone-900 text-white"
                      : inMonth
                        ? "text-stone-700"
                        : "text-stone-300"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <EventChip key={event.id} event={event} />
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="px-1.5 text-xs font-medium text-stone-400">
                      +{dayEvents.length - 2} mais
                    </p>
                  )}
                  {dayTasks.length > 0 && (
                    <p className="flex items-center gap-1 px-1.5 text-xs text-stone-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {dayTasks.length}{" "}
                      {dayTasks.length === 1 ? "tarefa" : "tarefas"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda (mobile): dias do mês com eventos ou tarefas */}
      <div className="mt-4 space-y-3 md:hidden">
        {monthDaysWithContent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            Nada agendado neste mês.
          </div>
        ) : (
          monthDaysWithContent.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDate.get(key) ?? [];
            const dayTasks = tasksByDate.get(key) ?? [];

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(day)}
                className="block w-full rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm"
              >
                <p
                  className={`text-sm font-semibold ${
                    isToday(day) ? "text-stone-900" : "text-stone-600"
                  }`}
                >
                  {capitalizeFirst(
                    format(day, "EEEE, d 'de' MMMM", { locale: ptBR })
                  )}
                  {isToday(day) && (
                    <span className="ml-2 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                      hoje
                    </span>
                  )}
                </p>
                <div className="mt-2 space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${TYPE_CHIP[event.type]}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[event.status]}`}
                      />
                      <span className="truncate">{eventTitle(event)}</span>
                      <span className="ml-auto shrink-0 text-[10px] opacity-70">
                        {EVENT_STATUS_LABELS[event.status]}
                      </span>
                    </div>
                  ))}
                  {dayTasks.length > 0 && (
                    <p className="flex items-center gap-1.5 px-2 text-xs text-stone-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {dayTasks.length}{" "}
                      {dayTasks.length === 1 ? "tarefa" : "tarefas"}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500">
        <span className="font-medium text-stone-400">Status:</span>
        {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
          <span key={value} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${STATUS_DOT[value as EventStatus]}`}
            />
            {label}
          </span>
        ))}
      </div>

      {selectedDay && (
        <DayModal
          date={selectedDay}
          events={eventsByDate.get(selectedKey) ?? []}
          tasks={tasksByDate.get(selectedKey) ?? []}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
