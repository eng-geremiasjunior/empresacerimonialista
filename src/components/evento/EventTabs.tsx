"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type TabCounters = {
  fornecedores: number;
  comunicacao: number;
  financeiro: number;
  /** blocos com resposta da cliente esperando conferência */
  planejamento: number;
};

// As três fases da jornada saíram daqui: viraram os cartões de
// FasesDoEvento, logo acima. O que sobra nesta barra é consulta — e é
// isso que a torna calma: ela deixou de disputar atenção com o motor de
// trabalho.
const TABS: { label: string; seg: string; counter?: keyof TabCounters }[] = [
  { label: "Resumo", seg: "" },
  { label: "Mesas", seg: "mesas" },
  { label: "Fornecedores", seg: "fornecedores", counter: "fornecedores" },
  { label: "Comunicação", seg: "comunicacao", counter: "comunicacao" },
  { label: "Financeiro", seg: "financeiro", counter: "financeiro" },
  // O que a cliente enxerga do evento. Por ora: quem tem acesso e o
  // caminho para abrir. O espaço fica reservado para crescer.
  { label: "Área do cliente", seg: "area-do-cliente" },
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
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-[color:var(--ev-card-border-soft)]">
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
                ? "border-[color:var(--ev-text-strong)] text-[color:var(--ev-text-strong)]"
                : "border-transparent text-[color:var(--ev-text-muted)] hover:text-[color:var(--ev-text-strong)]"
            }`}
          >
            {tab.label}
            {n > 0 && (
              <span className="rounded-full bg-[color:var(--ev-text-strong)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
