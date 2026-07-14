"use client";

import { Fragment, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  desmarcarPago,
  excluirTransacao,
} from "@/app/(app)/eventos/[id]/financeiro/actions";
import { MarcarPagoInline } from "@/components/financeiro/MarcarPagoInline";
import { NovaDespesaModal } from "@/components/financeiro/NovaDespesaModal";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  DESPESA_CATEGORIES,
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

export function ListaDespesas({
  eventId,
  despesas,
  suppliers,
  todayIso,
}: {
  eventId: string;
  despesas: Transacao[];
  suppliers: { id: string; name: string }[];
  todayIso: string;
}) {
  const [adding, setAdding] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Despesas</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus size={15} />
            Nova despesa
          </button>
        )}
      </div>

      {adding && (
        <NovaDespesaModal
          eventId={eventId}
          suppliers={suppliers}
          onClose={() => setAdding(false)}
        />
      )}

      {despesas.length === 0 && !adding ? (
        <p className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Nenhuma despesa lançada para este evento.
        </p>
      ) : despesas.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2.5 pl-4 pr-4 font-medium">Descrição</th>
                <th className="py-2.5 pr-4 font-medium">Categoria</th>
                <th className="py-2.5 pr-4 font-medium">Fornecedor</th>
                <th className="py-2.5 pr-4 text-right font-medium">Valor</th>
                <th className="py-2.5 pr-4 font-medium">Vencimento</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 pr-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {despesas.map((tx) => {
                const status = txStatus(tx.paid, tx.due_date, todayIso);
                return (
                  <Fragment key={tx.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="py-2.5 pl-4 pr-4 font-medium text-gray-900">
                        {tx.description ?? "Despesa"}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {DESPESA_CATEGORIES[tx.category] ?? tx.category}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {tx.supplier_name ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-gray-700">
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
                              if (!confirm("Excluir esta despesa?")) e.preventDefault();
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
                        <td colSpan={7} className="px-4 pb-3">
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
      ) : null}
    </div>
  );
}
