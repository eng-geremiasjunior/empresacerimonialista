"use client";

import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { Moon, Sun, X } from "lucide-react";
import type { ModoTheme } from "@/lib/modo-tema";

type Props = {
  eventLabel: string;
  eventDate: string; // yyyy-MM-dd
  now: number | null;
  isDark: boolean;
  onToggleTheme: () => void;
  eventId: string;
  t: ModoTheme;
};

function faltaLabel(eventDate: string, now: number | null) {
  // antes de montar não há relógio: a linha fica vazia por um quadro,
  // em vez de sair errada e ser trocada
  if (now === null) return "";
  const dias = differenceInCalendarDays(
    new Date(`${eventDate}T00:00:00`),
    new Date(now)
  );
  if (dias > 1) return `Faltam ${dias} dias`;
  if (dias === 1) return "É amanhã";
  if (dias === 0) return "Acontece hoje";
  return "Evento já realizado";
}

export function ModoEventoHeader({
  eventLabel,
  eventDate,
  now,
  isDark,
  onToggleTheme,
  eventId,
  t,
}: Props) {
  return (
    <header className={`border-b ${t.border} px-5 py-4`}>
      <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-500">
            Modo Evento
          </p>
          <h1 className="mt-0.5 truncate text-lg font-semibold">{eventLabel}</h1>
          <p className={`text-sm ${t.sub}`}>{faltaLabel(eventDate, now)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onToggleTheme}
            aria-label="Alternar tema"
            className={`rounded-full p-2 ${t.sub} hover:opacity-70`}
          >
            {/* ícone desenhado, não emoji: o emoji muda de cara em cada
                celular e não segue a cor do tema */}
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            href={`/eventos/${eventId}`}
            aria-label="Sair do Modo Evento"
            className={`rounded-full p-2 ${t.sub} hover:opacity-70`}
          >
            <X size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
