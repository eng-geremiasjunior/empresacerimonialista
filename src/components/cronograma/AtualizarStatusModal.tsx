"use client";

// Atalho da cerimonialista para atualizar o status de um item manualmente
// (origem 'cerimonialista'), usando a mesma função da Etapa 1.

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { atualizarStatusManual } from "@/app/(app)/eventos/[id]/roteiro/actions";
import { STATUS_UI, type CronogramaItem } from "@/lib/cronograma";
import type { RoteiroStatusNovo } from "@/lib/types";

const OPCOES: RoteiroStatusNovo[] = [
  "planejado",
  "em_andamento",
  "concluido",
  "problema",
];

export function AtualizarStatusModal({
  eventId,
  items,
  itemInicial,
  onFechar,
}: {
  eventId: string;
  items: CronogramaItem[];
  itemInicial?: string;
  onFechar: () => void;
}) {
  const [itemId, setItemId] = useState(itemInicial ?? items[0]?.id ?? "");
  const atual = items.find((i) => i.id === itemId);
  const [status, setStatus] = useState<RoteiroStatusNovo>(
    atual?.status_novo ?? "em_andamento"
  );
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setErro(null);
    if (!itemId) return;
    if (status === "problema" && !obs.trim()) {
      setErro("Descreva o problema.");
      return;
    }
    startTransition(async () => {
      const res = await atualizarStatusManual(
        eventId,
        itemId,
        status,
        obs.trim() || null
      );
      if ("error" in res) {
        setErro(res.error);
        return;
      }
      onFechar();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 sm:items-center"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-stone-900">
            Atualizar status
          </h3>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded p-1 text-stone-400 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-4 block text-sm text-stone-600">Item</label>
        <select
          value={itemId}
          onChange={(e) => {
            setItemId(e.target.value);
            const it = items.find((i) => i.id === e.target.value);
            if (it) setStatus(it.status_novo);
          }}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-100"
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {(i.time ?? "").slice(0, 5)} — {i.title}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-sm text-stone-600">Novo status</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {OPCOES.map((op) => (
            <button
              key={op}
              onClick={() => setStatus(op)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                status === op
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 text-stone-700 hover:border-stone-300"
              }`}
            >
              {STATUS_UI[op].label}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-sm text-stone-600">
          Observação{" "}
          {status === "problema" ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-stone-400">(opcional)</span>
          )}
        </label>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-100"
        />

        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onFechar}
            disabled={pending}
            className="rounded-xl border border-stone-300 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={pending}
            className="rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
