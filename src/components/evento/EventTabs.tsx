"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabCounters = {
  fornecedores: number;
  comunicacao: number;
  financeiro: number;
};

const TABS: { label: string; seg: string; counter?: keyof TabCounters }[] = [
  { label: "Resumo", seg: "" },
  { label: "Cronograma", seg: "roteiro" },
  { label: "Tarefas", seg: "tarefas" },
  { label: "Fornecedores", seg: "fornecedores", counter: "fornecedores" },
  { label: "Comunicação", seg: "comunicacao", counter: "comunicacao" },
  { label: "Financeiro", seg: "financeiro", counter: "financeiro" },
  { label: "Histórico", seg: "historico" },
];

export function EventTabs({
  eventId,
  counters,
}: {
  eventId: string;
  counters?: TabCounters;
}) {
  const pathname = usePathname();
  const base = `/eventos/${eventId}`;

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-gray-200">
      {TABS.map((tab) => {
        const href = tab.seg ? `${base}/${tab.seg}` : base;
        const active = tab.seg ? pathname.startsWith(href) : pathname === base;
        const n = tab.counter ? counters?.[tab.counter] ?? 0 : 0;
        return (
          <Link
            key={tab.label}
            href={href}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {n > 0 && (
              <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
