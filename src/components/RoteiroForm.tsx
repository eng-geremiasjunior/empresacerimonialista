"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { RoteiroFormState } from "@/app/(app)/eventos/[id]/roteiro/actions";
import { ROTEIRO_STATUS_LABELS, type Supplier } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

export type RoteiroInitial = {
  time: string;
  title: string;
  description: string;
  supplierId: string;
  status: string;
};

type Props = {
  action: (
    state: RoteiroFormState,
    formData: FormData
  ) => Promise<RoteiroFormState>;
  eventId: string;
  suppliers: Supplier[]; // fornecedores VINCULADOS ao evento
  initial?: RoteiroInitial;
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

export function RoteiroForm({ action, eventId, suppliers, initial, onClose }: Props) {
  const [state, formAction] = useFormState(action, null);
  const [supplierChoice, setSupplierChoice] = useState(
    initial?.supplierId ?? ""
  );

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
      <div className="grid grid-cols-[7rem,1fr] gap-5">
        <div>
          <label htmlFor="time" className={labelClass}>
            Horário
          </label>
          <input
            id="time"
            name="time"
            type="time"
            required
            defaultValue={initial?.time}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="title" className={labelClass}>
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={initial?.title}
            placeholder="Ex.: Chegada do buffet"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Descrição <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initial?.description}
          placeholder="Detalhes, contatos, observações..."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="supplier_id" className={labelClass}>
            Fornecedor responsável
          </label>
          {suppliers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
              Nenhum fornecedor vinculado a este evento ainda.{" "}
              <Link
                href={`/eventos/${eventId}/fornecedores`}
                className="font-medium text-indigo-600 underline underline-offset-2 hover:no-underline"
              >
                Adicione um na aba Fornecedores primeiro
              </Link>
              .
              <input type="hidden" name="supplier_id" value="" />
            </div>
          ) : (
            <select
              id="supplier_id"
              name="supplier_id"
              value={supplierChoice}
              onChange={(e) => setSupplierChoice(e.target.value)}
              className={inputClass}
            >
              <option value="">Sem fornecedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "pendente"}
            className={inputClass}
          >
            {Object.entries(ROTEIRO_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
