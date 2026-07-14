import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { ResumoEmpresa as ResumoData } from "@/lib/financeiro-empresa-shared";

export function ResumoEmpresa({ data }: { data: ResumoData }) {
  const cards = [
    {
      label: "Receita do mês",
      value: formatCurrency(data.receitaMes),
      icon: ArrowUpRight,
      iconCls: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Despesas do mês",
      value: formatCurrency(data.despesasMes),
      icon: ArrowDownRight,
      iconCls: "bg-red-50 text-red-600",
    },
    {
      label: "Saldo do mês",
      value: formatCurrency(data.saldoMes),
      icon: Wallet,
      iconCls:
        data.saldoMes >= 0
          ? "bg-indigo-50 text-indigo-600"
          : "bg-red-50 text-red-600",
      valueCls: data.saldoMes < 0 ? "text-red-600" : "text-gray-900",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, iconCls, valueCls }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconCls}`}
          >
            <Icon size={17} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{label}</p>
            <p
              className={`truncate text-lg font-semibold tabular-nums ${valueCls ?? "text-gray-900"}`}
            >
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
