import Link from "next/link";
import { CalendarClock, Mail } from "lucide-react";
import type { ProximaTarefa, ResumoEvento } from "@/lib/supabase/resumo-evento";
import { formatTime } from "@/lib/format";

const MESES = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];
const SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function SeloData({ dateIso }: { dateIso: string }) {
  const d = new Date(`${dateIso}T00:00:00`);
  return (
    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-50 leading-none">
      <span className="text-base font-semibold text-gray-900">
        {d.getDate()}
      </span>
      <span className="text-[10px] font-medium text-gray-400">
        {MESES[d.getMonth()]}
      </span>
    </div>
  );
}

function Item({
  dateIso,
  titulo,
  subtitulo,
  href,
  icon,
}: {
  dateIso: string;
  titulo: string;
  subtitulo: string;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg py-1.5 transition-colors hover:bg-gray-50"
    >
      {icon ?? <SeloData dateIso={dateIso} />}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-800">{titulo}</p>
        <p className="text-xs text-gray-400">{subtitulo}</p>
      </div>
    </Link>
  );
}

function subtitulo(t: ProximaTarefa) {
  const d = new Date(`${t.due_date}T00:00:00`);
  const dia = SEMANA[d.getDay()];
  return t.due_time ? `${dia} · ${formatTime(t.due_time)}` : dia;
}

export function ProximasAtividades({
  eventId,
  proximas,
}: {
  eventId: string;
  proximas: ResumoEvento["proximas"];
}) {
  const todas: ProximaTarefa[] = [
    ...proximas.hoje,
    ...proximas.amanha,
    ...proximas.proximos7,
  ];
  const vazio = todas.length === 0 && !proximas.confirmacaoAgendada;

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
        <div className="mt-2 space-y-0.5">
          {todas.map((t) => (
            <Item
              key={t.id}
              dateIso={t.due_date}
              titulo={t.title}
              subtitulo={subtitulo(t)}
              href={`/eventos/${eventId}/tarefas`}
            />
          ))}
          {proximas.confirmacaoAgendada && (
            <Item
              dateIso={proximas.confirmacaoAgendada}
              titulo="Convites de confirmação aos fornecedores"
              subtitulo="Envio automático"
              href={`/eventos/${eventId}/fornecedores`}
              icon={
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <Mail size={16} className="text-indigo-500" />
                </div>
              }
            />
          )}
        </div>
      )}
    </section>
  );
}
