"use client";

// Ação rápida dentro do Modo Evento: a cerimonialista atualiza um item
// pela MESMA função do link público (origem 'cerimonialista'). Cobre o
// fornecedor sem celular à mão. Bottom sheet mobile-first.

import { useState, useTransition } from "react";
import { CheckCircle2, Play, RotateCcw, TriangleAlert, X } from "lucide-react";
import { atualizarStatusManual } from "@/app/(app)/eventos/[id]/roteiro/actions";
import { formatTime } from "@/lib/format";
import type { ModoItem, ModoTheme } from "@/lib/modo-tema";

export function AcaoItemSheet({
  eventId,
  item,
  onFechar,
  onDone,
  t,
}: {
  eventId: string;
  item: ModoItem;
  onFechar: () => void;
  onDone: () => void;
  t: ModoTheme;
}) {
  const [modoProblema, setModoProblema] = useState(false);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const s = item.statusNovo;

  function aplicar(
    status: "em_andamento" | "concluido" | "problema" | "planejado",
    observacao?: string | null
  ) {
    setErro(null);
    startTransition(async () => {
      const res = await atualizarStatusManual(
        eventId,
        item.id,
        status,
        observacao ?? null
      );
      if ("error" in res) {
        setErro(res.error);
        return;
      }
      onDone();
      onFechar();
    });
  }

  const btnBase =
    "flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onFechar}
    >
      <div
        className={`w-full max-w-md rounded-t-2xl border-t p-5 sm:rounded-2xl sm:border ${t.panel}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {item.time && (
              <p className="font-mono text-sm font-bold text-sky-500">
                {formatTime(item.time)}
              </p>
            )}
            <h3 className="truncate text-lg font-semibold">{item.title}</h3>
            {item.supplierName && (
              <p className={`text-sm ${t.sub}`}>{item.supplierName}</p>
            )}
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className={`rounded-full p-1.5 ${t.sub} hover:opacity-70`}
          >
            <X size={20} />
          </button>
        </div>

        {modoProblema ? (
          <div className="mt-4">
            <label className={`text-sm ${t.sub}`}>
              O que aconteceu? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={obs}
              onChange={(e) => {
                setObs(e.target.value);
                setErro(null);
              }}
              rows={3}
              autoFocus
              placeholder="Ex.: faltou ponto de energia no palco…"
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-base ${t.panel} ${t.border} focus:outline-none`}
            />
            {erro && <p className="mt-1 text-sm text-red-500">{erro}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setModoProblema(false)}
                disabled={pending}
                className={`${btnBase} border ${t.border} ${t.sub}`}
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  if (!obs.trim()) {
                    setErro("Descreva o problema.");
                    return;
                  }
                  aplicar("problema", obs.trim());
                }}
                disabled={pending}
                className={`${btnBase} bg-red-600 text-white hover:bg-red-700`}
              >
                {pending ? "Enviando…" : "Reportar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {(s === "planejado" || s === "problema") && (
              <button
                onClick={() => aplicar("em_andamento")}
                disabled={pending}
                className={`${btnBase} w-full bg-sky-600 text-white hover:bg-sky-700`}
              >
                {s === "problema" ? (
                  <>
                    <RotateCcw size={17} /> Retomar
                  </>
                ) : (
                  <>
                    <Play size={17} /> Iniciar
                  </>
                )}
              </button>
            )}
            {(s === "em_andamento" || s === "planejado") && (
              <button
                onClick={() => aplicar("concluido")}
                disabled={pending}
                className={`${btnBase} w-full bg-emerald-600 text-white hover:bg-emerald-700`}
              >
                <CheckCircle2 size={17} /> Concluir
              </button>
            )}
            {s === "concluido" && (
              <button
                onClick={() => aplicar("em_andamento")}
                disabled={pending}
                className={`${btnBase} w-full border ${t.border}`}
              >
                <RotateCcw size={17} /> Reabrir
              </button>
            )}
            {s !== "problema" && (
              <button
                onClick={() => setModoProblema(true)}
                disabled={pending}
                className={`${btnBase} w-full border border-red-300 text-red-600`}
              >
                <TriangleAlert size={17} /> Reportar problema
              </button>
            )}
            {erro && <p className="text-sm text-red-500">{erro}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
