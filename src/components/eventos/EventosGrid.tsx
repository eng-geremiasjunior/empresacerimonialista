import Link from "next/link";
import type { EventoRow } from "@/lib/supabase/eventos-list";
import { SAUDE_UI, type Saude } from "@/lib/saude-evento";
import { formatDate } from "@/lib/format";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type EventStatus,
} from "@/lib/types";

const STATUS_STYLES: Record<EventStatus, string> = {
  orcamento: "bg-amber-50 text-amber-700",
  confirmado: "bg-emerald-50 text-emerald-700",
  concluido: "bg-gray-100 text-gray-600",
  cancelado: "bg-red-50 text-red-700",
};

type Props = {
  rows: EventoRow[];
  saudeById: Record<string, Saude>;
  todayIso: string;
  weekEndIso: string;
};

export function EventosGrid({ rows, saudeById, todayIso, weekEndIso }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => {
        const saude = saudeById[row.id];
        const soon = row.date >= todayIso && row.date <= weekEndIso;

        return (
          <Link
            key={row.id}
            href={`/eventos/${row.id}`}
            className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">
                  {row.client_name ?? "Sem cliente"}
                </p>
                <p className="text-xs text-gray-500">
                  {EVENT_TYPE_LABELS[row.type]}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status]}`}
              >
                {EVENT_STATUS_LABELS[row.status]}
              </span>
            </div>

            <p
              className={`mt-3 text-sm ${soon ? "font-medium text-indigo-600" : "text-gray-500"}`}
            >
              {formatDate(row.date)}
            </p>
            <p className="truncate text-sm text-gray-500">
              {row.city ?? row.location ?? "—"}
            </p>

            {saude && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${SAUDE_UI[saude.nivel].bar}`}
                    style={{ width: `${saude.score}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 tabular-nums">
                  {saude.score}%
                </span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
