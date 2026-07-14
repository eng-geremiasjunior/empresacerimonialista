"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MesEmpresa } from "@/lib/financeiro-empresa-shared";

// Receita vs. Despesas da EMPRESA — últimos 6 meses (mesmo estilo dos
// demais gráficos do sistema).
export function EmpresaChart({ data }: { data: MesEmpresa[] }) {
  const vazio = data.every((m) => m.receita === 0 && m.despesas === 0);
  if (vazio) return null;

  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-700">
        Receita vs. Despesas da empresa — últimos 6 meses
      </h2>
      <div className="mt-3 h-48 w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="mes"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              width={60}
            />
            <Tooltip
              formatter={(value, name) => [
                Number(value ?? 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }),
                name === "receita" ? "Receita" : "Despesas",
              ]}
              contentStyle={{
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                fontSize: "0.8rem",
              }}
            />
            <Bar dataKey="receita" fill="#34d399" radius={[3, 3, 0, 0]} />
            <Bar dataKey="despesas" fill="#94a3b8" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Receita
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" /> Despesas
        </span>
      </div>
    </div>
  );
}
