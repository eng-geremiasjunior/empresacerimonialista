"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FinanceiroFormState } from "@/app/(app)/eventos/[id]/financeiro/actions";
import { marcarPago } from "@/app/(app)/eventos/[id]/financeiro/actions";
import { PAYMENT_METHODS } from "@/lib/financeiro-const";

const inputClass =
  "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-gray-500 focus:outline-none";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
    >
      {pending ? "Salvando..." : "Confirmar"}
    </button>
  );
}

// Mini-formulário inline para confirmar pagamento (data + forma).
export function MarcarPagoInline({
  eventId,
  transactionId,
  todayIso,
  onClose,
}: {
  eventId: string;
  transactionId: string;
  todayIso: string;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(
    marcarPago.bind(null, eventId, transactionId),
    null as FinanceiroFormState
  );

  useEffect(() => {
    if (state && "ok" in state) onClose();
  }, [state, onClose]);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2"
    >
      <input
        name="paid_at"
        type="date"
        required
        defaultValue={todayIso}
        className={inputClass}
        aria-label="Data do pagamento"
      />
      <select
        name="payment_method"
        defaultValue="pix"
        className={inputClass}
        aria-label="Forma de pagamento"
      >
        {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Submit />
      <button
        type="button"
        onClick={onClose}
        className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        Cancelar
      </button>
      {state && "error" in state && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
