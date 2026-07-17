"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { EventFormState } from "@/app/(app)/eventos/actions";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/types";
import { membroOptionLabel, type MembroOption } from "@/lib/equipe-shared";
import { CapaEventoUpload } from "@/components/eventos/CapaEventoUpload";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";

type Initial = {
  eventId: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  type: string;
  date: string;
  location: string;
  status: string;
  responsavelId?: string | null;
  coverUrl?: string | null;
};

type Props = {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  initial?: Initial;
  membros?: MembroOption[];
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

export function EventForm({ action, initial, membros }: Props) {
  const [state, formAction] = useFormState(action, null);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      {initial && (
        <>
          <input type="hidden" name="event_id" value={initial.eventId} />
          {initial.clientId && (
            <input type="hidden" name="client_id" value={initial.clientId} />
          )}
        </>
      )}

      <div>
        <label htmlFor="client_name" className="mb-1 block text-sm font-medium">
          Nome do cliente
        </label>
        <input
          id="client_name"
          name="client_name"
          type="text"
          required
          defaultValue={initial?.clientName}
          placeholder="Ex.: Maria e João"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="client_phone" className="mb-1 block text-sm font-medium">
          Telefone <span className="font-normal text-stone-400">(opcional)</span>
        </label>
        <input
          id="client_phone"
          name="client_phone"
          type="tel"
          defaultValue={initial?.clientPhone}
          placeholder="(11) 99999-9999"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={initial?.type ?? "casamento"}
            className={inputClass}
          >
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="mb-1 block text-sm font-medium">
            Data
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={initial?.date}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="location" className="mb-1 block text-sm font-medium">
          Local <span className="font-normal text-stone-400">(opcional)</span>
        </label>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={initial?.location}
          placeholder="Ex.: Espaço Jardim das Flores"
          className={inputClass}
        />
      </div>

      {initial && (
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            required
            defaultValue={initial.status}
            className={inputClass}
          >
            {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {membros && membros.length > 0 && (
        <div>
          <label htmlFor="responsavel_id" className="mb-1 block text-sm font-medium">
            Cerimonialista responsável
          </label>
          <select
            id="responsavel_id"
            name="responsavel_id"
            defaultValue={initial?.responsavelId ?? membros[0].id}
            className={inputClass}
          >
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {membroOptionLabel(m)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-400">
            Trocar o responsável não altera tarefas nem financeiro do evento.
          </p>
        </div>
      )}

      {initial && (
        <CapaEventoUpload eventId={initial.eventId} atual={initial.coverUrl ?? null} />
      )}

      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}

      <div className="flex items-center gap-4">
        <SubmitButton label={initial ? "Salvar alterações" : "Criar evento"} />
        <Link
          href="/eventos"
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
