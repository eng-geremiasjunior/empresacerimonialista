"use client";

// Card compacto de item do cronograma. Concluídos ficam colapsados
// (horário + título + check + "Concluído às HH:MM"), expansíveis ao
// clicar. Futuros: só horário + título + fornecedor.

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Circle } from "lucide-react";
import { formatTime } from "@/lib/format";
import {
  calcularVariacao,
  fraseVariacao,
  type CronogramaItem,
} from "@/lib/cronograma";

function horaLocal(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ItemTimelineCompacto({ item }: { item: CronogramaItem }) {
  const concluido = item.status_novo === "concluido";
  const [aberto, setAberto] = useState(false);
  const fimReal = horaLocal(item.horario_real_fim);
  const variacao = concluido
    ? fraseVariacao(calcularVariacao(item.time, item.horario_real_inicio), true)
    : null;

  if (concluido) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white">
        <button
          onClick={() => setAberto((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="font-mono text-sm font-semibold text-stone-500">
            {formatTime(item.time)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">
            {item.title}
          </span>
          {fimReal && (
            <span className="shrink-0 text-xs text-emerald-600">
              Concluído às {fimReal}
            </span>
          )}
          {aberto ? (
            <ChevronDown size={16} className="shrink-0 text-stone-400" />
          ) : (
            <ChevronRight size={16} className="shrink-0 text-stone-400" />
          )}
        </button>
        {aberto && (
          <div className="border-t border-stone-100 px-4 py-3 pl-12 text-sm">
            {item.supplier_name && (
              <p className="text-stone-500">Fornecedor: {item.supplier_name}</p>
            )}
            {variacao && (
              <p className={`mt-1 text-xs ${variacao.cor}`}>{variacao.texto}</p>
            )}
            {item.observacao && (
              <p className="mt-1 text-stone-600">
                <span className="text-stone-400">Observação:</span>{" "}
                {item.observacao}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Futuro (planejado, ainda não é a vez).
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
      <Circle size={18} className="shrink-0 text-stone-300" />
      <span className="font-mono text-sm font-semibold text-stone-500">
        {formatTime(item.time)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">
        {item.title}
      </span>
      {item.supplier_name && (
        <span className="shrink-0 truncate text-xs text-stone-400">
          {item.supplier_name}
        </span>
      )}
    </div>
  );
}
