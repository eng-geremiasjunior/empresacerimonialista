"use client";

import type { ModoTask, ModoTheme } from "@/lib/modo-tema";

type Props = {
  tasks: ModoTask[];
  t: ModoTheme;
};

// Tarefas de prioridade ALTA ainda não concluídas (visão rápida).
export function ChecklistRapido({ tasks, t }: Props) {
  if (tasks.length === 0) {
    return (
      <p className={`text-sm ${t.sub}`}>
        Nenhuma tarefa de alta prioridade pendente. 👍
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className={`flex items-center gap-3 rounded-xl border p-3 ${t.panel}`}
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500"
          />
          <span className="min-w-0 flex-1 truncate text-lg font-medium">
            {task.title}
          </span>
        </li>
      ))}
    </ul>
  );
}
