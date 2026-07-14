"use client";

import { formatTime } from "@/lib/format";
import {
  formatCountdown,
  itemDateTime,
  type ModoItem,
  type ModoTheme,
} from "@/lib/modo-tema";

type Props = {
  item: ModoItem | null;
  eventDate: string;
  now: number;
  t: ModoTheme;
};

export function ProximaAtividade({ item, eventDate, now, t }: Props) {
  if (!item) {
    return (
      <div className={`rounded-2xl border p-5 text-center ${t.panel}`}>
        <p className={t.sub}>Nenhuma atividade pendente. Tudo concluído! 🎉</p>
      </div>
    );
  }

  const dt = itemDateTime(eventDate, item.time);
  const diff = dt - now;
  const futuro = !isNaN(dt) && diff > 0;

  return (
    <div className={`rounded-2xl border p-5 text-center ${t.panel}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest ${t.sub}`}>
        Próxima atividade
      </p>
      <p className="mt-1 text-xl font-semibold">{item.title}</p>
      <p className={`text-sm ${t.sub}`}>
        {item.time ? `às ${formatTime(item.time)}` : "Horário a definir"}
      </p>
      {futuro ? (
        <p className="mt-2 font-mono text-4xl font-bold tabular-nums">
          {formatCountdown(diff)}
        </p>
      ) : item.time ? (
        <p className="mt-2 text-2xl font-bold text-sky-500">É agora</p>
      ) : null}
    </div>
  );
}
