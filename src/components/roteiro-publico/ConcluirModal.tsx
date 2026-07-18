"use client";

// Modal de conclusão de item (link público do fornecedor): observação
// opcional antes de confirmar. Mobile-first, botões grandes.

import { useState } from "react";
import { X } from "lucide-react";

export function ConcluirModal({
  titulo,
  onConfirmar,
  onFechar,
  enviando,
}: {
  titulo: string;
  onConfirmar: (observacao: string | null) => void;
  onFechar: () => void;
  enviando: boolean;
}) {
  const [obs, setObs] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug text-stone-900">
            Concluir &ldquo;{titulo}&rdquo;
          </h3>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded p-1 text-stone-400 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-3 block text-sm text-stone-600">
          Adicionar observação{" "}
          <span className="text-stone-400">(opcional)</span>
        </label>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Ex.: montagem finalizada, tudo testado…"
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onFechar}
            disabled={enviando}
            className="rounded-xl border border-stone-300 py-3 text-sm font-semibold text-stone-700 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(obs.trim() || null)}
            disabled={enviando}
            className="rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Confirmar conclusão"}
          </button>
        </div>
      </div>
    </div>
  );
}
