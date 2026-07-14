"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import {
  TASK_PRIORITY_DOT,
  TASK_STATUS_LABELS,
  type TaskItem,
  type TaskStatus,
} from "@/lib/types";

type ConsolidatedTask = TaskItem & { eventLabel: string | null };

type TabKey = "hoje" | "amanha" | "atrasadas" | "concluidas" | "todas";

const TABS: { key: TabKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "amanha", label: "Amanhã" },
  { key: "atrasadas", label: "Atrasadas" },
  { key: "concluidas", label: "Concluídas" },
  { key: "todas", label: "Todas" },
];

const STATUS_STYLES: Record<TaskStatus, string> = {
  pendente: "border-l-gray-400",
  em_progresso: "border-l-blue-500",
  concluido: "border-l-green-500",
};

type Props = {
  tasks: ConsolidatedTask[];
  todayIso: string;
  tomorrowIso: string;
};

export function ConsolidatedTasks({ tasks, todayIso, tomorrowIso }: Props) {
  const [tab, setTab] = useState<TabKey>("hoje");
  const router = useRouter();

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const open = t.status !== "concluido";
      switch (tab) {
        case "hoje":
          return open && t.due_date === todayIso;
        case "amanha":
          return open && t.due_date === tomorrowIso;
        case "atrasadas":
          return open && t.due_date !== null && t.due_date < todayIso;
        case "concluidas":
          return t.status === "concluido";
        case "todas":
          return true;
      }
    });
  }, [tasks, tab, todayIso, tomorrowIso]);

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-600 hover:border-stone-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          Nenhuma tarefa aqui.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((task) => {
            const overdue =
              task.status !== "concluido" &&
              task.due_date !== null &&
              task.due_date < todayIso;
            return (
              <li key={task.id}>
                <button
                  onClick={() =>
                    router.push(`/eventos/${task.event_id}/tarefas`)
                  }
                  className={`flex w-full items-start justify-between gap-3 rounded-xl border border-stone-200 border-l-4 ${STATUS_STYLES[task.status]} bg-white p-4 text-left shadow-sm transition hover:border-stone-400`}
                >
                  <div className="min-w-0">
                    <p
                      className={`font-medium ${
                        task.status === "concluido"
                          ? "text-stone-400 line-through"
                          : "text-stone-900"
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {task.eventLabel && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-600">
                          {task.eventLabel}
                        </span>
                      )}
                      {task.due_date && (
                        <span
                          className={
                            overdue
                              ? "font-semibold text-red-600"
                              : "text-stone-500"
                          }
                        >
                          {formatDate(task.due_date)}
                          {task.due_time && ` · ${task.due_time.slice(0, 5)}`}
                        </span>
                      )}
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${TASK_PRIORITY_DOT[task.priority]}`}
                        aria-hidden
                      />
                      <span className="text-gray-400">
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-stone-300">›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
