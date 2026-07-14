export type PerformanceItem = { label: string; value: number };

// Sem meta cadastrada ainda (não há Configurações para isso) — mostra os
// números absolutos do mês, sem barra de progresso/porcentagem inventada.
export function MonthPerformance({ items }: { items: PerformanceItem[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-700">
        Performance do mês
      </h2>
      <ul className="mt-4 divide-y divide-gray-100">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <span className="text-sm text-gray-500">{item.label}</span>
            <span className="text-lg font-semibold text-gray-900 tabular-nums">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
