import Link from "next/link";
import { addDays, format } from "date-fns";
import {
  CalendarX,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Layers,
  XCircle,
} from "lucide-react";
import {
  getEventosList,
  getEventosIndicadores,
  getEventosFiltroDados,
  getSaudeContagem,
  getResumoRapidoEventos,
} from "@/lib/supabase/eventos-list";
import { getEventosCardData } from "@/lib/supabase/eventos-cards";
import { parseEventosParams, type EventosParams } from "@/lib/eventos-url";
import { EventosFiltros } from "@/components/eventos/EventosFiltros";
import { EventoCardHorizontal } from "@/components/eventos/EventoCardHorizontal";
import { EventosGrid } from "@/components/eventos/EventosGrid";
import { EventosPaginacao } from "@/components/eventos/EventosPaginacao";
import { FiltrosRapidosPainel } from "@/components/eventos/FiltrosRapidosPainel";
import { AcoesRapidasPainel } from "@/components/eventos/AcoesRapidasPainel";
import { ResumoRapidoPainel } from "@/components/eventos/ResumoRapidoPainel";

// Monta o link de exportação preservando os filtros ativos.
function exportHref(p: EventosParams): string {
  const sp = new URLSearchParams();
  const add = (k: keyof EventosParams) => {
    if (p[k]) sp.set(k, p[k]);
  };
  (["q", "status", "type", "responsavel", "city", "saude", "arquivados", "sort", "dir"] as (keyof EventosParams)[]).forEach(add);
  const qs = sp.toString();
  return qs ? `/api/eventos-export?${qs}` : "/api/eventos-export";
}

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const current = parseEventosParams(searchParams);
  const [{ rows, total, migrationPendente }, indicadores, filtroDados, saude, resumo] =
    await Promise.all([
      getEventosList(current),
      getEventosIndicadores(),
      getEventosFiltroDados(),
      getSaudeContagem(),
      getResumoRapidoEventos(),
    ]);
  const cardData = await getEventosCardData(
    rows.map((r) => ({ id: r.id, date: r.date }))
  );

  const now = new Date();
  const todayIso = format(now, "yyyy-MM-dd");
  const weekEndIso = format(addDays(now, 7), "yyyy-MM-dd");
  const hasFilters = Boolean(
    current.q || current.status || current.type || current.responsavel || current.city || current.saude
  );

  const indicadorCards = [
    { icon: Layers, label: "Total de eventos", valor: indicadores.total, cor: "bg-gray-100 text-gray-500" },
    { icon: FileText, label: "Em orçamento", valor: indicadores.orcamento, cor: "bg-amber-50 text-amber-600" },
    { icon: CheckCircle2, label: "Confirmados", valor: indicadores.confirmado, cor: "bg-emerald-50 text-emerald-600" },
    { icon: CalendarClock, label: "Concluídos", valor: indicadores.concluido, cor: "bg-sky-50 text-sky-600" },
    { icon: XCircle, label: "Cancelados", valor: indicadores.cancelado, cor: "bg-red-50 text-red-600" },
  ];

  const href = exportHref(current);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Eventos</h1>
        <div className="flex items-center gap-2">
          <a
            href={href}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            <Download size={15} />
            Exportar
          </a>
          <Link
            href="/eventos/novo"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Novo evento
          </Link>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {indicadorCards.map(({ icon: Icon, label, valor, cor }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cor}`}>
              <Icon size={17} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums text-gray-900">{valor}</p>
              <p className="truncate text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Conteúdo + painel lateral */}
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-4">
          <EventosFiltros current={current} />

          {migrationPendente && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              O recurso &ldquo;Arquivar evento&rdquo; precisa da migração{" "}
              <code>supabase/migrations/015_eventos_arquivar.sql</code>.
            </div>
          )}

          {rows.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center">
              <CalendarX size={32} className="mx-auto text-gray-300" />
              <p className="mt-3 font-medium text-gray-700">Nenhum evento encontrado</p>
              <Link
                href={hasFilters ? "/eventos" : "/eventos/novo"}
                className="mt-2 inline-block text-sm font-medium text-gray-900 underline underline-offset-4 hover:no-underline"
              >
                {hasFilters ? "Limpar filtros" : "Criar primeiro evento"}
              </Link>
            </div>
          ) : current.view === "grid" ? (
            <>
              <EventosGrid
                rows={rows}
                saudeById={Object.fromEntries(Object.entries(cardData).map(([id, d]) => [id, d.saude]))}
                todayIso={todayIso}
                weekEndIso={weekEndIso}
              />
              <EventosPaginacao current={current} total={total} />
            </>
          ) : (
            <>
              <div className="space-y-3">
                {rows.map((row) => (
                  <EventoCardHorizontal
                    key={row.id}
                    row={row}
                    data={cardData[row.id]}
                    archivingDisabled={migrationPendente}
                  />
                ))}
              </div>
              <EventosPaginacao current={current} total={total} />
            </>
          )}
        </div>

        {/* Painel lateral direito (sticky) */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <FiltrosRapidosPainel
            current={current}
            responsaveis={filtroDados.responsaveis}
            cidades={filtroDados.cidades}
            saude={saude}
          />
          <AcoesRapidasPainel exportHref={href} />
          <ResumoRapidoPainel resumo={resumo} />
        </aside>
      </div>
    </div>
  );
}
