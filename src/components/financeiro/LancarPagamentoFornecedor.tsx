"use client";

// Lançar um pagamento do fornecedor — sinal, parcela, saldo final.
//
// O motor já existia: criarTransacao grava conta='fornecedor' sozinha
// quando recebe supplier_id (CHECK da 063). O que faltava era a porta,
// e sem ela o "Pago" desta aba nunca saía de zero.
//
// "Já paguei" é o caso comum de quem lança depois do fato — por isso a
// marcação vem ligada e a data nasce em hoje. Quem está programando um
// pagamento futuro desmarca.

import { useEffect, useState } from "react";
import { InputMoeda } from "@/components/ui/InputMoeda";
import { useFormState, useFormStatus } from "react-dom";
import type { FinanceiroFormState } from "@/app/(app)/eventos/[id]/financeiro/actions";
import { criarTransacao } from "@/app/(app)/eventos/[id]/financeiro/actions";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-gray-500 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-gray-600";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
    >
      {pending ? "Salvando…" : "Lançar"}
    </button>
  );
}

export function LancarPagamentoFornecedor({
  eventId,
  supplierId,
  fornecedor,
  todayIso,
  onFechar,
  onSalvo,
}: {
  eventId: string;
  supplierId: string;
  fornecedor: string;
  todayIso: string;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [state, formAction] = useFormState(
    criarTransacao.bind(null, eventId),
    null as FinanceiroFormState
  );
  const [jaPago, setJaPago] = useState(true);
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (state && "ok" in state) {
      onSalvo();
      onFechar();
    }
  }, [state, onSalvo, onFechar]);

  return (
    <form action={formAction} className="space-y-3 bg-gray-50 px-4 py-3">
      {/* despesa da conta DELE: o supplier_id é o que manda criarTransacao
          gravar conta='fornecedor' */}
      <input type="hidden" name="tipo" value="despesa" />
      <input type="hidden" name="supplier_id" value={supplierId} />
      {/* "outro" e não "fornecedor": category não tem CHECK no banco, mas
          um valor que nenhuma tela sabe rotular vira lixo em relatório. A
          informação forte aqui é o supplier_id, não a categoria. */}
      <input type="hidden" name="category" value="outro" />

      <p className="text-xs text-gray-500">
        Pagamento para <span className="font-medium text-gray-700">{fornecedor}</span>
      </p>

      <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <label htmlFor={`lp_desc_${supplierId}`} className={labelClass}>
            O que é
          </label>
          <input
            id={`lp_desc_${supplierId}`}
            name="description"
            type="text"
            required
            placeholder="Ex.: sinal, 2ª parcela, saldo"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`lp_valor_${supplierId}`} className={labelClass}>
            Valor
          </label>
          <InputMoeda
            id={`lp_valor_${supplierId}`}
            name="value"
            required
            valor={valor}
            onChange={setValor}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`lp_data_${supplierId}`} className={labelClass}>
            {jaPago ? "Pago em" : "Vence em"}
          </label>
          <input
            id={`lp_data_${supplierId}`}
            name="due_date"
            type="date"
            required
            defaultValue={todayIso}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="paid"
            value="true"
            checked={jaPago}
            onChange={(e) => setJaPago(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Já foi pago
        </label>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onFechar}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          Cancelar
        </button>
        <Submit />
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-700">{state.error}</p>
      )}
    </form>
  );
}
