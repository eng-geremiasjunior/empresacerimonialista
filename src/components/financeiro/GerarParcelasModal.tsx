"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { FinanceiroFormState } from "@/app/(app)/eventos/[id]/financeiro/actions";
import { gerarParcelas } from "@/app/(app)/eventos/[id]/financeiro/actions";
import { formatCurrency } from "@/lib/format";

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
      {pending ? "Gerando..." : "Gerar parcelas"}
    </button>
  );
}

// Painel de geração automática das parcelas do contrato.
export function GerarParcelasModal({
  eventId,
  contractValue,
  entradaRegistrada,
  todayIso,
  onClose,
}: {
  eventId: string;
  contractValue: number | null;
  entradaRegistrada: number; // receitas já pagas (ex.: entrada do wizard)
  todayIso: string;
  onClose?: () => void;
}) {
  const [state, formAction] = useFormState(
    gerarParcelas.bind(null, eventId),
    null as FinanceiroFormState
  );
  const [total, setTotal] = useState(
    contractValue !== null ? String(contractValue) : ""
  );
  const [entrada, setEntrada] = useState(String(entradaRegistrada || ""));
  const [parcelas, setParcelas] = useState("3");

  useEffect(() => {
    if (state && "ok" in state) onClose?.();
  }, [state, onClose]);

  const totalNum = Number(total.replace(",", ".")) || 0;
  const entradaNum = Number(entrada.replace(",", ".")) || 0;
  const nNum = Math.max(1, Number(parcelas) || 1);
  const valorParcela = totalNum > entradaNum ? (totalNum - entradaNum) / nNum : 0;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-5"
    >
      <div>
        <h3 className="text-sm font-semibold text-gray-700">
          Gerar parcelas automaticamente
        </h3>
        <p className="mt-0.5 text-sm text-gray-500">
          O restante do contrato (total − entrada) é dividido igualmente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="gp_total" className={labelClass}>
            Valor total (R$)
          </label>
          <input
            id="gp_total"
            name="total"
            type="number"
            min={0}
            step="0.01"
            required
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="gp_entrada" className={labelClass}>
            Entrada (R$)
          </label>
          <input
            id="gp_entrada"
            name="entrada"
            type="number"
            min={0}
            step="0.01"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            readOnly={entradaRegistrada > 0}
            title={
              entradaRegistrada > 0
                ? "Entrada já registrada como receita paga"
                : undefined
            }
            className={`${inputClass} ${entradaRegistrada > 0 ? "cursor-not-allowed bg-gray-50 text-gray-500" : ""}`}
          />
          <input
            type="hidden"
            name="entrada_registrada"
            value={entradaRegistrada > 0 ? "1" : "0"}
          />
        </div>
        <div>
          <label htmlFor="gp_parcelas" className={labelClass}>
            Nº de parcelas
          </label>
          <input
            id="gp_parcelas"
            name="parcelas"
            type="number"
            min={1}
            max={36}
            required
            value={parcelas}
            onChange={(e) => setParcelas(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="gp_primeira" className={labelClass}>
            Primeira parcela
          </label>
          <input
            id="gp_primeira"
            name="primeira_data"
            type="date"
            required
            defaultValue={todayIso}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          Intervalo
          <select
            name="intervalo"
            defaultValue="mensal"
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none"
          >
            <option value="mensal">Mensal</option>
            <option value="quinzenal">Quinzenal</option>
          </select>
        </label>
        {valorParcela > 0 && (
          <p className="text-sm text-gray-500">
            {nNum}× de aproximadamente{" "}
            <span className="font-medium text-gray-900">
              {formatCurrency(valorParcela)}
            </span>
          </p>
        )}
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Submit />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
