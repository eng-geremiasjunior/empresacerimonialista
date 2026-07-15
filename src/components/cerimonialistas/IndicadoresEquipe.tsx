import { CalendarClock, CircleUser, UserCheck, UserMinus } from "lucide-react";
import type { IndicadoresEquipe as Dados } from "@/lib/supabase/cerimonialistas";

export function IndicadoresEquipe({ dados }: { dados: Dados }) {
  const cards = [
    {
      label: "Equipe ativa",
      value: dados.ativos,
      icon: CircleUser,
      cls: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Em eventos hoje",
      value: dados.emEventoHoje,
      icon: CalendarClock,
      cls: "bg-amber-50 text-amber-600",
    },
    {
      label: "Disponíveis",
      value: dados.disponiveis,
      icon: UserCheck,
      cls: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Inativas",
      value: dados.inativos,
      icon: UserMinus,
      cls: "bg-gray-100 text-gray-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, cls }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cls}`}
          >
            <Icon size={17} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-semibold tabular-nums text-gray-900">
              {value}
            </p>
            <p className="truncate text-xs text-gray-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
