"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { TaskFormState } from "@/app/(app)/tarefas/actions";
import {
  TASK_CATEGORY_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskCategory,
  type TaskPriority,
} from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

export type TaskInitial = {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  eventId: string;
  status: string;
  priority: string;
  category: string;
};

type Props = {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  events: { id: string; label: string }[];
  initial?: TaskInitial;
  onClose: () => void;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700 disabled:opacity-50"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

export function TaskForm({ action, events, initial, onClose }: Props) {
  const [state, formAction] = useFormState(action, null);

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-md"
    >
      <div>
        <label htmlFor="task_title" className={labelClass}>
          Título
        </label>
        <input
          id="task_title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          placeholder="Ex.: Confirmar horário com o buffet"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="task_description" className={labelClass}>
          Descrição <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="task_description"
          name="description"
          rows={2}
          defaultValue={initial?.description}
          placeholder="Detalhes, contatos, observações..."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <div>
          <label htmlFor="task_due_date" className={labelClass}>
            Vencimento
          </label>
          <input
            id="task_due_date"
            name="due_date"
            type="date"
            required
            defaultValue={initial?.dueDate}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="task_due_time" className={labelClass}>
            Horário{" "}
            <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            id="task_due_time"
            name="due_time"
            type="time"
            defaultValue={initial?.dueTime}
            title="Com horário definido, você recebe um aviso 5 minutos antes"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="task_event" className={labelClass}>
            Evento
          </label>
          <select
            id="task_event"
            name="event_id"
            required
            defaultValue={initial?.eventId ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Escolha o evento
            </option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task_status" className={labelClass}>
            Status
          </label>
          <select
            id="task_status"
            name="status"
            defaultValue={initial?.status ?? "pendente"}
            className={inputClass}
          >
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label htmlFor="task_category" className={labelClass}>
            Categoria
          </label>
          <select
            id="task_category"
            name="category"
            defaultValue={initial?.category ?? "geral"}
            className={inputClass}
          >
            {(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map(
              (value) => (
                <option key={value} value={value}>
                  {TASK_CATEGORY_LABELS[value]}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label htmlFor="task_priority" className={labelClass}>
            Prioridade
          </label>
          <select
            id="task_priority"
            name="priority"
            defaultValue={initial?.priority ?? "media"}
            className={inputClass}
          >
            {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map(
              (value) => (
                <option key={value} value={value}>
                  {TASK_PRIORITY_LABELS[value]}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={initial ? "Salvar" : "Adicionar"} />
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
