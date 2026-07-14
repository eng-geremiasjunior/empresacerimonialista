"use client";

import { useMemo, useState } from "react";
import {
  ACTIVITY_FILTERS,
  groupActivitiesByPeriod,
  type Activity,
} from "@/lib/activity";
import { ActivityItem } from "@/components/dashboard/ActivityItem";

type Props = {
  activities: Activity[];
  /** ISO do "agora" de referência (do servidor); mantém SSR/hidratação idênticos. */
  referenceIso: string;
};

export function ActivityFeed({ activities, referenceIso }: Props) {
  const [filter, setFilter] = useState("todos");
  const now = useMemo(() => new Date(referenceIso), [referenceIso]);

  const groups = useMemo(() => {
    const active = ACTIVITY_FILTERS.find((f) => f.value === filter);
    const filtered = active?.categories
      ? activities.filter((a) => active.categories!.includes(a.category))
      : activities;
    return groupActivitiesByPeriod(filtered, now);
  }, [activities, filter, now]);

  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-700">
          Atividade recente
        </h2>
        <button
          title="Histórico completo — em breve"
          className="text-xs font-medium text-stone-400 transition-colors hover:text-stone-600"
        >
          Ver tudo
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {ACTIVITY_FILTERS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === option.value
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-500 hover:border-stone-500"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-96 flex-1 overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-12 w-12 text-stone-300"
              aria-hidden
            >
              <rect x="8" y="10" width="32" height="28" rx="4" />
              <path strokeLinecap="round" d="M8 20h32M16 27h10M16 32h16" />
            </svg>
            <p className="mt-3 text-sm font-medium text-stone-600">
              Nenhuma atividade registrada.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              As ações realizadas no sistema aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.label}>
                <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {group.label}
                </h3>
                <div className="mt-1 divide-y divide-stone-50">
                  {group.items.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      now={now}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
