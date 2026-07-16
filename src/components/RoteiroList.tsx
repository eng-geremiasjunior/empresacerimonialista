"use client";

import { useState } from "react";
import {
  createRoteiroItem,
  updateRoteiroItem,
  deleteRoteiroItem,
  cycleRoteiroStatus,
} from "@/app/(app)/eventos/[id]/roteiro/actions";
import { RoteiroForm } from "@/components/RoteiroForm";
import { formatTime } from "@/lib/format";
import {
  ROTEIRO_STATUS_LABELS,
  type RoteiroItem,
  type RoteiroStatus,
  type Supplier,
} from "@/lib/types";

const STATUS_STYLES: Record<RoteiroStatus, { card: string; badge: string }> = {
  pendente: {
    card: "border-l-4 border-l-gray-400 bg-gray-50",
    badge: "bg-gray-400 hover:bg-gray-500",
  },
  em_andamento: {
    card: "border-l-4 border-l-blue-500 bg-blue-50",
    badge: "bg-blue-500 hover:bg-blue-600",
  },
  concluido: {
    card: "border-l-4 border-l-green-500 bg-green-50",
    badge: "bg-green-500 hover:bg-green-600",
  },
};

type Props = {
  eventId: string;
  items: RoteiroItem[];
  suppliers: Supplier[];
};

export function RoteiroList({ eventId, items, suppliers }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700"
          >
            + Adicionar item
          </button>
        )}
      </div>

      {adding && (
        <RoteiroForm
          action={createRoteiroItem.bind(null, eventId)}
          eventId={eventId}
          suppliers={suppliers}
          onClose={() => setAdding(false)}
        />
      )}

      {items.length === 0 && !adding ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-600">O roteiro ainda está vazio.</p>
          <button
            onClick={() => setAdding(true)}
            className="mt-4 text-sm font-medium text-gray-900 underline underline-offset-4 hover:no-underline"
          >
            Adicionar o primeiro item
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const styles = STATUS_STYLES[item.status] ?? STATUS_STYLES.pendente;

            if (editingId === item.id) {
              return (
                <li key={item.id}>
                  <RoteiroForm
                    action={updateRoteiroItem.bind(null, eventId, item.id)}
                    eventId={eventId}
                    suppliers={suppliers}
                    initial={{
                      time: formatTime(item.time),
                      title: item.title,
                      description: item.description ?? "",
                      supplierId: item.supplier_id ?? "",
                      status: item.status,
                    }}
                    onClose={() => setEditingId(null)}
                  />
                </li>
              );
            }

            return (
              <li
                key={item.id}
                className={`rounded-xl border border-gray-200 ${styles.card} p-5 shadow-sm transition-shadow hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="pt-0.5 font-mono text-lg font-bold text-gray-900">
                      {formatTime(item.time)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      {item.description && (
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-600">
                          {item.description}
                        </p>
                      )}
                      {item.suppliers && (
                        <p className="mt-2 text-xs text-gray-500">
                          Fornecedor: {item.suppliers.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <form action={cycleRoteiroStatus.bind(null, eventId, item.id)}>
                      <button
                        type="submit"
                        title="Clique para mudar o status"
                        className={`rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors ${styles.badge}`}
                      >
                        {ROTEIRO_STATUS_LABELS[item.status] ?? item.status}
                      </button>
                    </form>
                    <div className="flex items-center gap-1 text-sm">
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setAdding(false);
                        }}
                        className="rounded-md px-2.5 py-1.5 text-gray-500 transition-colors hover:bg-white hover:text-gray-900"
                      >
                        Editar
                      </button>
                      <form
                        action={deleteRoteiroItem.bind(null, eventId, item.id)}
                        onSubmit={(e) => {
                          if (!confirm(`Excluir "${item.title}"?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-md px-2.5 py-1.5 text-red-500 transition-colors hover:bg-white hover:text-red-700"
                        >
                          Excluir
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
