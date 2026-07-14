"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FinanceiroFormState } from "@/app/(app)/eventos/[id]/financeiro/actions";
import { criarTransacao } from "@/app/(app)/eventos/[id]/financeiro/actions";
import { DESPESA_CATEGORIES } from "@/lib/financeiro-const";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
    >
      {pending ? "Salvando..." : "Salvar despesa"}
    </button>
  );
}

export function NovaDespesaModal({
  eventId,
  suppliers,
  onClose,
}: {
  eventId: string;
  suppliers: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(
    criarTransacao.bind(null, eventId),
    null as FinanceiroFormState
  );

  useEffect(() => {
    if (state && "ok" in state) onClose();
  }, [state, onClose]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-5"
    >
      <input type="hidden" name="tipo" value="despesa" />

      <div>
        <label htmlFor="nd_desc" className={labelClass}>
          Descrição
        </label>
        <input
          id="nd_desc"
          name="description"
          type="text"
          required
          placeholder="Ex.: Sinal do buffet"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="nd_cat" className={labelClass}>
            Categoria
          </label>
          <select id="nd_cat" name="category" defaultValue="outro" className={inputClass}>
            {Object.entries(DESPESA_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nd_valor" className={labelClass}>
            Valor (R$)
          </label>
          <input
            id="nd_valor"
            name="value"
            type="number"
            min={0.01}
            step="0.01"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="nd_venc" className={labelClass}>
            Vencimento
          </label>
          <input id="nd_venc" name="due_date" type="date" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="nd_status" className={labelClass}>
            Status
          </label>
          <select id="nd_status" name="paid" defaultValue="false" className={inputClass}>
            <option value="false">Pendente</option>
            <option value="true">Pago</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="nd_forn" className={labelClass}>
          Fornecedor{" "}
          <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <select id="nd_forn" name="supplier_id" defaultValue="" className={inputClass}>
          <option value="">Sem fornecedor</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Submit />
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
