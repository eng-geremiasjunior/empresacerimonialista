"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { ClientFormState } from "@/app/(app)/clientes/actions";
import type { Client } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";
const labelClass = "mb-1 block text-sm font-medium text-stone-700";

type Props = {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  client?: Client;
  submitLabel?: string;
  showSaved?: boolean;
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

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
  optional = true,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={`client_${name}`} className={labelClass}>
        {label}{" "}
        {optional && <span className="font-normal text-stone-400">(opcional)</span>}
      </label>
      <input
        id={`client_${name}`}
        name={name}
        type={type}
        required={!optional}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export function ClientForm({
  action,
  client,
  submitLabel,
  showSaved,
}: Props) {
  const [state, formAction] = useFormState(action, null);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label htmlFor="client_name" className={labelClass}>
          Nome
        </label>
        <input
          id="client_name"
          name="name"
          type="text"
          required
          defaultValue={client?.name ?? ""}
          placeholder="Ex.: Marina Oliveira"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field name="phone" label="Telefone" type="tel" defaultValue={client?.phone} placeholder="(11) 99999-9999" />
        <Field name="whatsapp" label="WhatsApp" type="tel" defaultValue={client?.whatsapp} placeholder="(11) 99999-9999" />
        <Field name="email" label="E-mail" type="email" defaultValue={client?.email} />
        <Field name="instagram" label="Instagram" defaultValue={client?.instagram} placeholder="@usuario" />
        <Field name="cpf" label="CPF" defaultValue={client?.cpf} />
        <Field name="birthday" label="Nascimento" type="date" defaultValue={client?.birthday} />
        <Field name="city" label="Cidade" defaultValue={client?.city} />
        <Field name="address" label="Endereço" defaultValue={client?.address} />
      </div>

      <div>
        <label htmlFor="client_notes" className={labelClass}>
          Observações pessoais{" "}
          <span className="font-normal text-stone-400">(opcional)</span>
        </label>
        <textarea
          id="client_notes"
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ""}
          placeholder="Preferências, contexto, histórico de relacionamento..."
          className={inputClass}
        />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-rose-600">{state.error}</p>
      )}
      {showSaved && state && "ok" in state && (
        <p className="text-sm text-emerald-600" role="status">
          Alterações salvas.
        </p>
      )}

      <div className="flex items-center gap-4">
        <SubmitButton label={submitLabel ?? "Salvar"} />
        <Link
          href="/clientes"
          className="text-sm text-stone-500 hover:text-stone-900"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
