"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/format";
import {
  EVENT_TYPE_LABELS,
  ROTEIRO_STATUS_LABELS,
  type PublicRoteiroData,
  type RoteiroStatus,
} from "@/lib/types";

const STATUS_STYLES: Record<RoteiroStatus, { border: string; badge: string }> = {
  pendente: {
    border: "border-l-stone-300",
    badge: "bg-stone-100 text-stone-600",
  },
  em_andamento: {
    border: "border-l-sky-500",
    badge: "bg-sky-100 text-sky-800",
  },
  concluido: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
  },
};

const REFRESH_INTERVAL_MS = 20_000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type Props = {
  initial: PublicRoteiroData;
  hash: string;
  children?: React.ReactNode;
};

export function PublicRoteiro({ initial, hash, children }: Props) {
  const [data, setData] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function refresh() {
      const { data: fresh } = await supabase.rpc("roteiro_publico", {
        link_hash: hash,
      });
      if (active && fresh) {
        setData(fresh as PublicRoteiroData);
        setUpdatedAt(new Date());
      }
    }

    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hash]);

  // Destaca o item "atual" quando o evento é hoje: o último cujo horário já passou.
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  let currentId: string | null = null;
  if (data.event.date === todayStr) {
    for (const item of data.items) {
      if (item.time && item.time <= nowTime) currentId = item.id;
    }
  }

  const eventLabel = [
    EVENT_TYPE_LABELS[data.event.type] ?? data.event.type,
    data.event.client_name,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <header className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-stone-400">
          Roteiro do evento
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          {data.supplier.name}
        </h1>
        <p className="mt-2 text-stone-600">{eventLabel}</p>
        <p className="text-sm text-stone-500">
          {formatDate(data.event.date)}
          {data.event.location ? ` · ${data.event.location}` : ""}
        </p>
      </header>

      {data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
          Nenhum item do roteiro para você ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((item) => {
            const styles = STATUS_STYLES[item.status] ?? STATUS_STYLES.pendente;
            const isCurrent = item.id === currentId;

            return (
              <li
                key={item.id}
                className={`rounded-xl border border-stone-200 border-l-4 ${styles.border} bg-white p-4 shadow-sm ${
                  isCurrent ? "ring-2 ring-sky-400" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-2xl font-bold">
                    {formatTime(item.time)}
                  </span>
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                        AGORA
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.badge}`}
                    >
                      {ROTEIRO_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-lg font-medium leading-snug">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 whitespace-pre-line text-stone-600">
                    {item.description}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {children}

      <footer className="mt-8 text-center text-xs text-stone-400">
        <p>
          Esta página atualiza sozinha.
          {updatedAt
            ? ` Última atualização às ${pad(updatedAt.getHours())}:${pad(updatedAt.getMinutes())}.`
            : ""}
        </p>
        <p className="mt-1">Vela — gestão para cerimonialistas</p>
      </footer>
    </div>
  );
}
