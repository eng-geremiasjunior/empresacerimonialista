import { Check } from "lucide-react";
import type { Saude } from "@/lib/saude-evento";
import type { FasesEvento } from "@/lib/supabase/resumo-evento";

function Etapa({
  label,
  pct,
  primeira,
}: {
  label: string;
  pct: number;
  primeira: boolean;
}) {
  const completa = pct >= 100;
  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex w-full items-center">
        {/* linha à esquerda (não na primeira) */}
        <div
          className={`h-0.5 flex-1 ${
            primeira ? "opacity-0" : completa ? "bg-emerald-500" : "bg-gray-200"
          }`}
        />
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
            completa
              ? "bg-emerald-500 text-white"
              : pct > 0
                ? "border-2 border-emerald-500 bg-white text-emerald-600"
                : "border-2 border-gray-200 bg-white text-gray-400"
          }`}
        >
          {completa ? <Check size={15} strokeWidth={3} /> : `${pct}%`}
        </div>
        <div
          className={`h-0.5 flex-1 ${
            completa ? "bg-emerald-500" : "bg-gray-200"
          }`}
        />
      </div>
      <p className="mt-2 text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400 tabular-nums">{pct}%</p>
    </div>
  );
}

export function ProgressoEvento({
  saude,
  fases,
}: {
  saude: Saude;
  fases: FasesEvento;
}) {
  const cor =
    saude.score >= 80
      ? "text-emerald-600"
      : saude.score >= 50
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-[auto,1fr] sm:items-center">
      <div className="sm:border-r sm:border-gray-100 sm:pr-6">
        <p className="text-sm text-gray-500">Progresso geral</p>
        <p className={`text-4xl font-semibold tracking-tight ${cor}`}>
          {saude.score}%
        </p>
        <p className="mt-0.5 text-sm text-gray-500">
          {saude.score >= 100
            ? "Todo em dia"
            : saude.score >= 80
              ? "Sob controle"
              : saude.alertas.length > 0
                ? `${saude.alertas.length} ${saude.alertas.length === 1 ? "ponto" : "pontos"} de atenção`
                : "Em andamento"}
        </p>
      </div>

      <div className="flex items-start">
        <Etapa label="Planejamento" pct={fases.planejamento} primeira />
        <Etapa label="Operação" pct={fases.operacao} primeira={false} />
        <Etapa label="Pós-evento" pct={fases.posEvento} primeira={false} />
      </div>
    </div>
  );
}
