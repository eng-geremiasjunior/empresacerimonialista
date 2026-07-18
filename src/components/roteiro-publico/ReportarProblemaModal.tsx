"use client";

// Modal de problema (link público do fornecedor): descrição OBRIGATÓRIA.
// Gera notificação imediata para a cerimonialista (trigger no banco).

import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";

export function ReportarProblemaModal({
  titulo,
  onConfirmar,
  onFechar,
  enviando,
}: {
  titulo: string;
  onConfirmar: (descricao: string) => void;
  onFechar: () => void;
  enviando: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function confirmar() {
    if (!texto.trim()) {
      setErro("Descreva o que aconteceu.");
      return;
    }
    onConfirmar(texto.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-semibold leading-snug text-stone-900">
            <TriangleAlert size={18} className="shrink-0 text-red-500" />
            Reportar problema em &ldquo;{titulo}&rdquo;
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
          O que aconteceu? <span className="text-red-500">*</span>
        </label>
        <textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setErro(null);
          }}
          rows={3}
          autoFocus
          placeholder="Ex.: faltou ponto de energia no palco…"
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
        />
        {erro && <p className="mt-1 text-sm text-red-600">{erro}</p>}
        <p className="mt-1 text-xs text-stone-400">
          A cerimonialista recebe um alerta imediato.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onFechar}
            disabled={enviando}
            className="rounded-xl border border-stone-300 py-3 text-sm font-semibold text-stone-700 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={enviando}
            className="rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Reportar"}
          </button>
        </div>
      </div>
    </div>
  );
}
