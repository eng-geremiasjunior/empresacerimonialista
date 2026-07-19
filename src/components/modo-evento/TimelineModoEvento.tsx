"use client";

import { Check, Play, TriangleAlert } from "lucide-react";
import { formatTime } from "@/lib/format";
import type { ModoItem, ModoTheme } from "@/lib/modo-tema";

type Props = {
  items: ModoItem[];
  currentId: string | null;
  onSelect: (item: ModoItem) => void;
  t: ModoTheme;
};

export function TimelineModoEvento({ items, currentId, onSelect, t }: Props) {
  if (items.length === 0) {
    return (
      <p className={`py-8 text-center ${t.sub}`}>
        Nenhum item no cronograma deste evento.
      </p>
    );
  }

  return (
    <ul className={`divide-y ${t.divide}`}>
      {items.map((item) => {
        const s = item.statusNovo;
        const done = s === "concluido";
        const isCurrent = item.id === currentId;

        return (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item)}
              className={`flex w-full items-center gap-4 px-2 py-4 text-left transition-colors ${
                isCurrent ? "rounded-xl ring-2 ring-sky-500" : ""
              }`}
            >
              <span
                className={`w-20 shrink-0 font-mono font-bold tabular-nums ${
                  item.time ? "text-2xl" : "text-sm"
                } ${done ? "opacity-40" : ""}`}
              >
                {formatTime(item.time)}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-lg font-medium ${
                    done ? "opacity-40 line-through" : ""
                  }`}
                >
                  {item.title}
                </span>
                {item.supplierName && (
                  <span className={`text-sm ${t.sub}`}>
                    {item.supplierName}
                    {item.responsavelNome ? ` · ${item.responsavelNome}` : ""}
                  </span>
                )}
                {s === "em_andamento" && (
                  <span className="block text-sm font-semibold text-sky-500">
                    Em andamento{isCurrent ? " · agora" : ""}
                  </span>
                )}
                {s === "problema" && (
                  <span className="block text-sm font-semibold text-red-500">
                    Problema reportado
                  </span>
                )}
                {isCurrent && s === "planejado" && (
                  <span className="block text-sm font-semibold text-sky-500">
                    Próximo
                  </span>
                )}
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : s === "em_andamento"
                      ? "border-sky-500 text-sky-500"
                      : s === "problema"
                        ? "border-red-500 text-red-500"
                        : `${t.border}`
                }`}
              >
                {done && <Check size={18} strokeWidth={3} />}
                {s === "em_andamento" && <Play size={14} fill="currentColor" />}
                {s === "problema" && <TriangleAlert size={16} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
