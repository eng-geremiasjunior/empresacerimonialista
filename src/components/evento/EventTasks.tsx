"use client";

import { useState } from "react";
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
} from "@/app/(app)/tarefas/actions";
import { TaskForm } from "@/components/tasks/TaskForm";
import { formatDate } from "@/lib/format";
import {
  TASK_PRIORITY_DOT,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskItem,
  type TaskStatus,
} from "@/lib/types";

const STATUS_STYLES: Record<TaskStatus, string> = {
  pendente: "border-l-gray-400 bg-gray-50",
  em_progresso: "border-l-blue-500 bg-blue-50",
  concluido: "border-l-green-500 bg-green-50",
};

type Props = {
  eventId: string;
  eventLabel: string;
  tasks: TaskItem[];
};

export function EventTasks({ eventId, eventLabel, tasks }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // TaskForm usa um select de eventos; aqui passamos só este (pré-selecionado).
  const events = [{ id: eventId, label: eventLabel }];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-700">
          Tarefas deste evento
        </h2>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            + Nova tarefa
          </button>
        )}
      </div>

      {adding && (
        <TaskForm
          action={createTask}
          events={events}
          onClose={() => setAdding(false)}
        />
      )}

      {tasks.length === 0 && !adding ? (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-10 text-center text-stone-600">
          Nenhuma tarefa ainda para este evento.
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            if (editingId === task.id) {
              return (
                <li key={task.id}>
                  <TaskForm
                    action={updateTask.bind(null, task.id)}
                    events={events}
                    initial={{
                      title: task.title,
                      description: task.description ?? "",
                      dueDate: task.due_date ?? "",
                      dueTime: task.due_time ? task.due_time.slice(0, 5) : "",
                      eventId: task.event_id,
                      status: task.status,
                      priority: task.priority,
                      category: task.category,
                    }}
                    onClose={() => setEditingId(null)}
                  />
                </li>
              );
            }

            const done = task.status === "concluido";

            return (
              <li
                key={task.id}
                className={`rounded-xl border border-stone-200 border-l-4 ${STATUS_STYLES[task.status] ?? STATUS_STYLES.pendente} p-4 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <form action={toggleTask.bind(null, task.id)}>
                      <button
                        type="submit"
                        title={done ? "Reabrir" : "Concluir"}
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 ${
                          done
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-gray-300 bg-white hover:border-gray-500"
                        }`}
                      >
                        {done && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3}
                            className="h-3.5 w-3.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        )}
                      </button>
                    </form>
                    <div className="min-w-0">
                      <p
                        className={`font-semibold ${
                          done ? "text-stone-400 line-through" : "text-stone-900"
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-1 text-sm text-stone-600">
                          {task.description}
                        </p>
                      )}
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {task.due_date && (
                          <span className="text-stone-500">
                            {formatDate(task.due_date)}
                            {task.due_time && ` · ${task.due_time.slice(0, 5)}`}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${TASK_PRIORITY_DOT[task.priority]}`}
                            aria-hidden
                          />
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className="text-stone-400">
                          {TASK_STATUS_LABELS[task.status]}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-sm">
                    <button
                      onClick={() => {
                        setEditingId(task.id);
                        setAdding(false);
                      }}
                      className="rounded-md px-2.5 py-1.5 text-stone-500 hover:bg-white hover:text-stone-900"
                    >
                      Editar
                    </button>
                    <form
                      action={deleteTask.bind(null, task.id)}
                      onSubmit={(e) => {
                        if (!confirm(`Excluir "${task.title}"?`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-md px-2.5 py-1.5 text-red-500 hover:bg-white hover:text-red-700"
                      >
                        Excluir
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
