"use client";

import { formatTime } from "@/lib/format";
import type { ModoItem, ModoTheme } from "@/lib/modo-tema";

type Props = {
  items: ModoItem[];
  currentId: string | null;
  onToggle: (item: ModoItem) => void;
  t: ModoTheme;
};

export function TimelineModoEvento({ items, currentId, onToggle, t }: Props) {
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
        const done = item.status === "concluido";
        const isCurrent = item.id === currentId;

        return (
          <li key={item.id}>
            <button
              onClick={() => onToggle(item)}
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
                  </span>
                )}
                {isCurrent && !done && (
                  <span className="block text-sm font-semibold text-sky-500">
                    Agora
                  </span>
                )}
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? "border-green-500 bg-green-500 text-white"
                    : item.status === "em_andamento"
                      ? "border-sky-500 text-sky-500"
                      : `${t.border}`
                }`}
              >
                {done && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
