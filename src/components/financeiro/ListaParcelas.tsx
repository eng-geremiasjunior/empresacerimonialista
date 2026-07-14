"use client";

import { Fragment, useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import type { FinanceiroFormState } from "@/app/(app)/eventos/[id]/financeiro/actions";
import {
  criarTransacao,
  desmarcarPago,
  excluirTransacao,
} from "@/app/(app)/eventos/[id]/financeiro/actions";
import { MarcarPagoInline } from "@/components/financeiro/MarcarPagoInline";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  PAYMENT_METHODS,
  TX_STATUS_LABELS,
  txStatus,
  type TxStatus,
} from "@/lib/financeiro-const";
import type { Transacao } from "@/lib/supabase/financeiro";

const STATUS_BADGE: Record<TxStatus, string> = {
  pago: "bg-emerald-50 text-emerald-700",
  pendente: "bg-amber-50 text-amber-700",
  atrasado: "bg-red-50 text-red-700",
};

const inputClass =
  "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-gray-500 focus:outline-none";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

function ParcelaAvulsaForm({
  eventId,
  onClose,
}: {
  eventId: string;
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
      className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3"
    >
      <input type="hidden" name="tipo" value="receita" />
      <input type="hidden" name="category" value="outro" />
      <input
        name="description"
        type="text"
        required
        placeholder="Descrição (ex.: taxa extra)"
        className={`${inputClass} min-w-[180px] flex-1`}
      />
      <input
        name="value"
        type="number"
        min={0.01}
        step="0.01"
        required
        placeholder="Valor"
        className={`${inputClass} w-28`}
      />
      <input name="due_date" type="date" required className={inputClass} />
      <Submit label="Adicionar" />
      <button
        type="button"
        onClick={onClose}
        className="px-2 text-sm text-gray-500 hover:text-gray-900"
      >
        Cancelar
      </button>
      {state && "error" in state && (
        <p className="w-full text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}

export function ListaParcelas({
  eventId,
  receitas,
  todayIso,
}: {
  eventId: string;
  receitas: Transacao[];
  todayIso: string;
}) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [addingAvulsa, setAddingAvulsa] = useState(false);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
              <th className="py-2.5 pl-4 pr-4 font-medium">Parcela</th>
              <th className="py-2.5 pr-4 text-right font-medium">Valor</th>
              <th className="py-2.5 pr-4 font-medium">Vencimento</th>
              <th className="py-2.5 pr-4 font-medium">Status</th>
              <th className="py-2.5 pr-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {receitas.map((tx) => {
              const status = txStatus(tx.paid, tx.due_date, todayIso);
              return (
                <Fragment key={tx.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="py-2.5 pl-4 pr-4">
                      <p className="font-medium text-gray-900">
                        {tx.description ??
                          (tx.installment_number
                            ? `Parcela ${tx.installment_number} de ${tx.installment_total}`
                            : "Receita")}
                      </p>
                      {tx.paid && tx.payment_method && (
                        <p className="text-xs text-gray-400">
                          {PAYMENT_METHODS[tx.payment_method] ?? tx.payment_method}
                          {tx.paid_at
                            ? ` · ${formatDate(tx.paid_at.slice(0, 10))}`
                            : ""}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-gray-900">
                      {formatCurrency(tx.value)}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-500">
                      {tx.due_date ? formatDate(tx.due_date) : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
                      >
                        {TX_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1">
                        {tx.paid ? (
                          <form action={desmarcarPago.bind(null, eventId, tx.id)}>
                            <button
                              type="submit"
                              className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                            >
                              Desfazer
                            </button>
                          </form>
                        ) : (
                          <button
                            onClick={() =>
                              setPayingId((id) => (id === tx.id ? null : tx.id))
                            }
                            className="rounded-md px-2 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Marcar como pago
                          </button>
                        )}
                        <form
                          action={excluirTransacao.bind(null, eventId, tx.id)}
                          onSubmit={(e) => {
                            if (!confirm("Excluir esta parcela?")) e.preventDefault();
                          }}
                        >
                          <button
                            type="submit"
                            aria-label="Excluir"
                            className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                  {payingId === tx.id && (
                    <tr>
                      <td colSpan={5} className="px-4 pb-3">
                        <MarcarPagoInline
                          eventId={eventId}
                          transactionId={tx.id}
                          todayIso={todayIso}
                          onClose={() => setPayingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {addingAvulsa ? (
        <ParcelaAvulsaForm eventId={eventId} onClose={() => setAddingAvulsa(false)} />
      ) : (
        <button
          onClick={() => setAddingAvulsa(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <Plus size={15} />
          Adicionar parcela avulsa
        </button>
      )}
    </div>
  );
}
