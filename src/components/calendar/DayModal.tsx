"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apagarCompromissoLivre, criarCompromissoLivre } from "@/app/(app)/calendario/actions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type CalendarCompromissoItem,
  type CalendarEventItem,
  type CalendarTaskItem,
  type EventStatus,
  type EventType,
} from "@/lib/types";

export const STATUS_BADGE: Record<EventStatus, string> = {
  orcamento: "bg-amber-50 text-amber-700",
  confirmado: "bg-emerald-50 text-emerald-700",
  concluido: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-50 text-red-700",
};

// Chips de tipo neutros (o tipo aparece pelo ícone/label; cor discreta).
export const TYPE_CHIP: Record<EventType, string> = {
  casamento: "bg-gray-100 text-gray-700",
  debutante: "bg-gray-100 text-gray-700",
  formatura: "bg-gray-100 text-gray-700",
  aniversario: "bg-gray-100 text-gray-700",
  corporativo: "bg-gray-100 text-gray-700",
  cha_revelacao: "bg-gray-100 text-gray-700",
  batizado: "bg-gray-100 text-gray-700",
  bodas: "bg-gray-100 text-gray-700",
  show: "bg-gray-100 text-gray-700",
  outro: "bg-gray-100 text-gray-700",
};

export function eventTitle(event: CalendarEventItem) {
  return `${EVENT_TYPE_LABELS[event.type]} — ${event.client_name ?? "Sem cliente"}`;
}

type Props = {
  date: Date;
  events: CalendarEventItem[];
  tasks: CalendarTaskItem[];
  compromissos?: CalendarCompromissoItem[];
  podeEscrever?: boolean;
  /** veio do botão "+ Compromisso": o formulário já abre */
  abrirNovo?: boolean;
  onClose: () => void;
};

const campo =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none";

function NovoCompromisso({ data, aoSalvar }: { data: string; aoSalvar: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("");
  const [obs, setObs] = useState("");
  const [dia, setDia] = useState(data);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        iniciar(async () => {
          const r = await criarCompromissoLivre({ titulo, data: dia, hora: hora || null, local, observacao: obs });
          if (!r.ok) setErro(r.erro);
          else aoSalvar();
        });
      }}
    >
      <input autoFocus required maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O quê? Ex.: visita ao salão, reunião com cliente" className={campo} />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" required value={dia} onChange={(e) => setDia(e.target.value)} className={campo} aria-label="Dia" />
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={campo} aria-label="Hora" />
      </div>
      <input maxLength={160} value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Onde (opcional)" className={campo} />
      <textarea maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" rows={2} className={campo} />
      {erro && <p className="text-xs text-red-700">{erro}</p>}
      <button type="submit" disabled={salvando} className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60">
        {salvando ? "Salvando…" : "Salvar compromisso"}
      </button>
    </form>
  );
}

export function DayModal({ date, events, tasks, compromissos = [], podeEscrever = false, abrirNovo = false, onClose }: Props) {
  const router = useRouter();
  const [novo, setNovo] = useState(abrirNovo);
  const [apagando, iniciarApagar] = useTransition();
  const raw = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">{label}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-900"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-5 w-5"
            >
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">Compromissos</h3>
              {podeEscrever && !novo && (
                <button type="button" onClick={() => setNovo(true)} className="text-xs font-semibold text-stone-700 underline underline-offset-2 hover:text-stone-900">
                  + Compromisso
                </button>
              )}
            </div>
            {novo && (
              <NovoCompromisso
                data={format(date, "yyyy-MM-dd")}
                aoSalvar={() => {
                  setNovo(false);
                  router.refresh();
                }}
              />
            )}
            {compromissos.length === 0 ? (
              !novo && <p className="mt-2 text-sm text-stone-500">Nenhum compromisso neste dia.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {compromissos.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <span className="w-11 shrink-0 font-mono text-xs leading-5 text-stone-500">{c.hora ?? "—"}</span>
                    <div className="min-w-0 flex-1">
                      {c.href ? (
                        <Link href={c.href} className="text-stone-800 hover:underline">{c.titulo}</Link>
                      ) : (
                        <p className="text-stone-800">{c.titulo}</p>
                      )}
                      {(c.local || c.evento_label) && (
                        <p className="text-xs text-stone-400">{[c.local, c.evento_label].filter(Boolean).join(" · ")}</p>
                      )}
                    </div>
                    {c.origem === "livre" && podeEscrever && (
                      <button
                        type="button"
                        disabled={apagando}
                        onClick={() =>
                          iniciarApagar(async () => {
                            await apagarCompromissoLivre(c.id);
                            router.refresh();
                          })
                        }
                        className="shrink-0 text-xs text-stone-400 hover:text-stone-800"
                      >
                        apagar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Eventos
            </h3>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                Nenhum evento neste dia.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/eventos/${event.id}`}
                      className="block rounded-lg border border-stone-200 p-3 transition-colors hover:border-stone-400"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">
                          {eventTitle(event)}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[event.status]}`}
                        >
                          {EVENT_STATUS_LABELS[event.status]}
                        </span>
                      </div>
                      {event.location && (
                        <p className="mt-1 text-sm text-stone-500">
                          {event.location}
                        </p>
                      )}
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_CHIP[event.type]}`}
                      >
                        {EVENT_TYPE_LABELS[event.type]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Tarefas
            </h3>
            {tasks.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                Nenhuma tarefa neste dia.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-stone-700">{task.title}</p>
                      {task.event_label && (
                        <p className="text-xs text-stone-400">
                          {task.event_label}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="mt-5 border-t border-stone-200 pt-4">
          <Link
            href="/eventos/novo"
            className="block w-full rounded-lg border border-stone-300 px-4 py-2 text-center text-sm font-medium text-stone-800 hover:border-stone-500"
          >
            + Novo evento
          </Link>
        </div>
      </div>
    </div>
  );
}
