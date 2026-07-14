import Link from "next/link";
import { addDays, format } from "date-fns";
import { CalendarX } from "lucide-react";
import { getEventosList } from "@/lib/supabase/eventos-list";
import { getSaudeBulk } from "@/lib/supabase/evento";
import { parseEventosParams } from "@/lib/eventos-url";
import { EventosFiltros } from "@/components/eventos/EventosFiltros";
import { EventosTable } from "@/components/eventos/EventosTable";
import { EventosGrid } from "@/components/eventos/EventosGrid";
import { EventosPaginacao } from "@/components/eventos/EventosPaginacao";

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const current = parseEventosParams(searchParams);
  const { rows, total, migrationPendente } = await getEventosList(current);
  const saudeById = await getSaudeBulk(rows.map((r) => r.id));

  const now = new Date();
  const todayIso = format(now, "yyyy-MM-dd");
  const weekEndIso = format(addDays(now, 7), "yyyy-MM-dd");

  const hasFilters = Boolean(current.q || current.status || current.type);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">
          Eventos{" "}
          <span className="font-normal text-gray-400">
            ({total} evento{total === 1 ? "" : "s"})
          </span>
        </h1>
        <Link
          href="/eventos/novo"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Novo evento
        </Link>
      </div>

      <EventosFiltros current={current} />

      {migrationPendente && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          O recurso &ldquo;Arquivar evento&rdquo; precisa da migração{" "}
          <code>supabase/migrations/015_eventos_arquivar.sql</code>. A
          listagem funciona normalmente enquanto isso.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <CalendarX size={32} className="mx-auto text-gray-300" />
          <p className="mt-3 font-medium text-gray-700">
            Nenhum evento encontrado
          </p>
          {hasFilters ? (
            <Link
              href="/eventos"
              className="mt-2 inline-block text-sm font-medium text-gray-900 underline underline-offset-4 hover:no-underline"
            >
              Limpar filtros
            </Link>
          ) : (
            <Link
              href="/eventos/novo"
              className="mt-2 inline-block text-sm font-medium text-gray-900 underline underline-offset-4 hover:no-underline"
            >
              Criar primeiro evento
            </Link>
          )}
        </div>
      ) : current.view === "cards" ? (
        <>
          <EventosGrid
            rows={rows}
            saudeById={saudeById}
            todayIso={todayIso}
            weekEndIso={weekEndIso}
          />
          <EventosPaginacao current={current} total={total} />
        </>
      ) : (
        <>
          <EventosTable
            rows={rows}
            saudeById={saudeById}
            current={current}
            todayIso={todayIso}
            weekEndIso={weekEndIso}
            archivingDisabled={migrationPendente}
          />
          <EventosPaginacao current={current} total={total} />
        </>
      )}
    </div>
  );
}
