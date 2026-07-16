import Link from "next/link";
import { CalendarClock, Mail } from "lucide-react";
import type { ProximaTarefa, ResumoEvento } from "@/lib/supabase/resumo-evento";
import { formatDate, formatTime } from "@/lib/format";

function Linha({ t, eventId }: { t: ProximaTarefa; eventId: string }) {
  return (
    <Link
      href={`/eventos/${eventId}/tarefas`}
      className="flex items-center gap-2 rounded-md py-1 text-sm text-gray-700 hover:text-gray-900"
    >
      <span className="h-3.5 w-3.5 shrink-0 rounded border border-gray-300" />
      <span className="flex-1 truncate">{t.title}</span>
      {t.due_time && (
        <span className="shrink-0 text-xs text-gray-400">
          {formatTime(t.due_time)}
        </span>
      )}
    </Link>
  );
}

function Janela({
  titulo,
  tarefas,
  eventId,
}: {
  titulo: string;
  tarefas: ProximaTarefa[];
  eventId: string;
}) {
  if (tarefas.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {titulo}
      </p>
      <div className="space-y-0.5">
        {tarefas.map((t) => (
          <Linha key={t.id} t={t} eventId={eventId} />
        ))}
      </div>
    </div>
  );
}

export function ProximasAtividades({
  eventId,
  proximas,
}: {
  eventId: string;
  proximas: ResumoEvento["proximas"];
}) {
  const vazio =
    proximas.hoje.length === 0 &&
    proximas.amanha.length === 0 &&
    proximas.proximos7.length === 0 &&
    !proximas.confirmacaoAgendada;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <CalendarClock size={15} className="text-gray-400" />
          Próximas atividades
        </h3>
        <Link
          href={`/eventos/${eventId}/tarefas`}
          className="text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          Ver todas
        </Link>
      </div>

      {vazio ? (
        <p className="mt-3 text-sm text-gray-500">
          Nada agendado para os próximos dias.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <Janela titulo="Hoje" tarefas={proximas.hoje} eventId={eventId} />
          <Janela titulo="Amanhã" tarefas={proximas.amanha} eventId={eventId} />
          <Janela
            titulo="Próximos 7 dias"
            tarefas={proximas.proximos7}
            eventId={eventId}
          />
          {proximas.confirmacaoAgendada && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Automático
              </p>
              <Link
                href={`/eventos/${eventId}/fornecedores`}
                className="flex items-center gap-2 rounded-md py-1 text-sm text-gray-700 hover:text-gray-900"
              >
                <Mail size={14} className="shrink-0 text-indigo-500" />
                <span className="flex-1">
                  Convites de confirmação aos fornecedores
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatDate(proximas.confirmacaoAgendada)}
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
