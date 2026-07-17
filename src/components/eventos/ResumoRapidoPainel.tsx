import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { ResumoRapidoEventos } from "@/lib/supabase/eventos-list";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";

export function ResumoRapidoPainel({ resumo }: { resumo: ResumoRapidoEventos }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Resumo rápido</h3>

      <div className="mt-3 space-y-4">
        <div>
          <p className="text-xs text-gray-400">Próximo evento</p>
          {resumo.proximoEvento ? (
            <Link
              href={`/eventos/${resumo.proximoEvento.id}`}
              className="mt-0.5 block hover:opacity-80"
            >
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                <CalendarClock size={13} className="text-gray-400" />
                {formatDate(resumo.proximoEvento.date)}
                {resumo.proximoEvento.time && (
                  <span className="text-gray-500">
                    · {formatTime(resumo.proximoEvento.time)}
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-gray-600">
                {resumo.proximoEvento.label}
              </p>
            </Link>
          ) : (
            <p className="mt-0.5 text-sm text-gray-500">Nenhum agendado</p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400">Eventos esta semana</p>
          <p className="text-xl font-semibold tabular-nums text-gray-900">
            {resumo.estaSemana}
          </p>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400">Receita prevista (mês)</p>
          <p className="text-xl font-semibold tabular-nums text-gray-900">
            {formatCurrency(resumo.receitaPrevistaMes)}
          </p>
        </div>
      </div>
    </section>
  );
}
