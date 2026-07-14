"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Resumo", seg: "" },
  { label: "Cronograma", seg: "roteiro" },
  { label: "Tarefas", seg: "tarefas" },
  { label: "Fornecedores", seg: "fornecedores" },
  { label: "Comunicação", seg: "comunicacao" },
  { label: "Financeiro", seg: "financeiro" },
  { label: "Histórico", seg: "historico" },
];

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/eventos/${eventId}`;

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-stone-200">
      {TABS.map((tab) => {
        const href = tab.seg ? `${base}/${tab.seg}` : base;
        const active = tab.seg
          ? pathname.startsWith(href)
          : pathname === base;
        return (
          <Link
            key={tab.label}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
