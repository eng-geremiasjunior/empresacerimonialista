"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, List, LayoutGrid, ChevronDown } from "lucide-react";
import { buildEventosHref, type EventosParams } from "@/lib/eventos-url";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, type EventStatus, type EventType } from "@/lib/types";

const STATUS_CHIPS: { value: EventStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "orcamento", label: EVENT_STATUS_LABELS.orcamento },
  { value: "confirmado", label: EVENT_STATUS_LABELS.confirmado },
  { value: "concluido", label: EVENT_STATUS_LABELS.concluido },
  { value: "cancelado", label: EVENT_STATUS_LABELS.cancelado },
];

const TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export function EventosFiltros({ current }: { current: EventosParams }) {
  const router = useRouter();
  const [text, setText] = useState(current.q);
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);

  // Busca com debounce de 300ms antes de disparar a query.
  useEffect(() => {
    if (text === current.q) return;
    const timer = setTimeout(() => {
      router.push(buildEventosHref(current, { q: text, page: "1" }));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (!typeOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (!typeRef.current?.contains(e.target as Node)) setTypeOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [typeOpen]);

  const activeStatuses = current.status ? current.status.split(",") : [];
  function toggleStatus(value: string) {
    if (value === "todos") {
      router.push(buildEventosHref(current, { status: "", page: "1" }));
      return;
    }
    const next = activeStatuses.includes(value)
      ? activeStatuses.filter((s) => s !== value)
      : [...activeStatuses, value];
    router.push(buildEventosHref(current, { status: next.join(","), page: "1" }));
  }

  const activeTypes = current.type ? current.type.split(",") : [];
  function toggleType(value: EventType) {
    const next = activeTypes.includes(value)
      ? activeTypes.filter((t) => t !== value)
      : [...activeTypes, value];
    router.push(buildEventosHref(current, { type: next.join(","), page: "1" }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Buscar por cliente ou local..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100"
          />
        </div>

        <div className="relative" ref={typeRef}>
          <button
            onClick={() => setTypeOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              activeTypes.length > 0
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
            }`}
          >
            Tipo{activeTypes.length > 0 ? ` (${activeTypes.length})` : ""}
            <ChevronDown size={14} />
          </button>
          {typeOpen && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
              {TYPE_OPTIONS.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={activeTypes.includes(type)}
                    onChange={() => toggleType(type)}
                    className="h-4 w-4"
                  />
                  {EVENT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
          <Link
            href={buildEventosHref(current, { view: "table" })}
            aria-label="Ver em lista"
            className={`flex items-center p-2 ${
              current.view === "table"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            <List size={16} />
          </Link>
          <Link
            href={buildEventosHref(current, { view: "cards" })}
            aria-label="Ver em cards"
            className={`flex items-center p-2 ${
              current.view === "cards"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid size={16} />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_CHIPS.map((chip) => {
          const active =
            chip.value === "todos"
              ? activeStatuses.length === 0
              : activeStatuses.includes(chip.value);
          return (
            <button
              key={chip.value}
              onClick={() => toggleStatus(chip.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
