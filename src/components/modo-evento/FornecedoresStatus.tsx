"use client";

import type { ModoSupplier, ModoTheme } from "@/lib/modo-tema";

type Props = {
  suppliers: ModoSupplier[];
  t: ModoTheme;
};

export function FornecedoresStatus({ suppliers, t }: Props) {
  if (suppliers.length === 0) {
    return (
      <p className={`text-sm ${t.sub}`}>
        Nenhum fornecedor vinculado a este evento.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {suppliers.map((s, i) => (
        <li
          key={`${s.name}-${i}`}
          className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${t.panel}`}
        >
          <span className="min-w-0 truncate text-lg font-medium">{s.name}</span>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
              s.confirmed
                ? "bg-green-500/20 text-green-500"
                : "bg-amber-500/20 text-amber-500"
            }`}
          >
            {s.confirmed ? "Confirmado" : "Pendente"}
          </span>
        </li>
      ))}
    </ul>
  );
}
