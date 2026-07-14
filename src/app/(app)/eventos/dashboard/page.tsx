import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CopilotoDia } from "@/components/dashboard/CopilotoDia";
import { ResumoFinanceiro } from "@/components/dashboard/ResumoFinanceiro";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { DonutCard } from "@/components/dashboard/DonutCard";
import {
  MonthPerformance,
  type PerformanceItem,
} from "@/components/dashboard/MonthPerformance";
import {
  getAlertasCopiloto,
  getBriefingHoje,
  getClientesAtivos,
  getCotacoesAbertas,
  getEventsByStatus,
  getEventsByType,
  getKpiEventosEmAndamento,
  getKpiFaturamentoMes,
  getPerformanceMes,
  getRecentActivities,
  getResumoFinanceiro,
} from "@/lib/supabase/queries";
import { getSaudeEvento } from "@/lib/supabase/evento";
import { getSaldoEmpresaMes } from "@/lib/supabase/financeiro-empresa";
import { SAUDE_UI, type Saude } from "@/lib/saude-evento";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";
import type { DonutSlice, Kpi } from "@/lib/dashboard-mock";

type UpcomingEvent = {
  id: string;
  type: EventType;
  date: string;
  location: string | null;
  status: EventStatus;
  clients: { name: string } | null;
};

function greeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function variation(current: number, previous: number): Pick<Kpi, "sub" | "tone"> {
  if (previous === 0) {
    return { sub: "sem base de comparação", tone: "neutral" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    sub: `${pct >= 0 ? "+" : ""}${pct}% vs. mês anterior`,
    tone: pct > 0 ? "up" : pct < 0 ? "down" : "neutral",
  };
}

// Paleta dessaturada, tom médio (sem neon) — status real do schema:
// orcamento/confirmado/concluido/cancelado (não há "produção"/"entregue").
const STATUS_COLORS: Record<EventStatus, string> = {
  orcamento: "#fbbf24", // amber-400
  confirmado: "#10b981", // emerald-500
  concluido: "#94a3b8", // slate-400
  cancelado: "#f87171", // red-400
};

// Paleta categórica dos 9 tipos reais — tons médios, não neon.
const TYPE_COLORS: Record<EventType, string> = {
  casamento: "#fb7185", // rose-400
  debutante: "#a78bfa", // violet-400
  formatura: "#38bdf8", // sky-400
  aniversario: "#fbbf24", // amber-400
  corporativo: "#64748b", // slate-500
  cha_revelacao: "#2dd4bf", // teal-400
  batizado: "#818cf8", // indigo-400
  bodas: "#22d3ee", // cyan-400
  outro: "#9ca3af", // gray-400
};

export default async function DashboardPage() {
  const supabase = createClient();
  const now = new Date();
  const todayIso = format(now, "yyyy-MM-dd");

  const { data } = await supabase
    .from("events")
    .select("id, type, date, location, status, clients(name)")
    .gte("date", todayIso)
    .in("status", ["orcamento", "confirmado"])
    .order("date", { ascending: true })
    .limit(10);

  const upcoming = (data ?? []) as unknown as UpcomingEvent[];

  const [
    saudes,
    briefing,
    alertas,
    financeiro,
    activities,
    kpiEventos,
    kpiFaturamento,
    cotacoesAbertas,
    clientesAtivos,
    statusCounts,
    typeCounts,
    performance,
    saldoEmpresa,
  ] = await Promise.all([
    Promise.all(upcoming.map((e) => getSaudeEvento(e.id))),
    getBriefingHoje(),
    getAlertasCopiloto(),
    getResumoFinanceiro(),
    getRecentActivities(),
    getKpiEventosEmAndamento(),
    getKpiFaturamentoMes(),
    getCotacoesAbertas(),
    getClientesAtivos(),
    getEventsByStatus(),
    getEventsByType(),
    getPerformanceMes(),
    getSaldoEmpresaMes(),
  ]);

  const eventsWithHealth: { event: UpcomingEvent; saude: Saude }[] =
    upcoming.map((event, i) => ({ event, saude: saudes[i] }));

  const dateLabel = (() => {
    const raw = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  const kpis: { kpi: Kpi; icon: LucideIcon }[] = [
    {
      icon: Calendar,
      kpi: {
        title: "Eventos em andamento",
        value: String(kpiEventos.current),
        ...variation(kpiEventos.current, kpiEventos.previous),
      },
    },
    {
      icon: DollarSign,
      kpi: {
        title: "Faturamento do mês",
        value: formatCurrency(kpiFaturamento.current),
        ...variation(kpiFaturamento.current, kpiFaturamento.previous),
      },
    },
    {
      icon: FileText,
      kpi: {
        title: "Cotações em aberto",
        value: String(cotacoesAbertas),
        sub: "aguardando confirmação",
        tone: "neutral",
      },
    },
    {
      icon: Users,
      kpi: {
        title: "Clientes ativos",
        value: String(clientesAtivos),
        sub: "com evento em andamento",
        tone: "neutral",
      },
    },
  ];

  const statusSlices: DonutSlice[] = statusCounts.map((s) => ({
    name: EVENT_STATUS_LABELS[s.status],
    value: s.count,
    color: STATUS_COLORS[s.status],
  }));

  const typeSlices: DonutSlice[] = typeCounts.map((t) => ({
    name: EVENT_TYPE_LABELS[t.type],
    value: t.count,
    color: TYPE_COLORS[t.type],
  }));

  const performanceItems: PerformanceItem[] = [
    { label: "Eventos realizados este mês", value: performance.eventosRealizados },
    { label: "Cotações confirmadas este mês", value: performance.cotacoesConfirmadas },
    { label: "Tarefas concluídas este mês", value: performance.tarefasConcluidas },
  ];

  return (
    <div className="space-y-6">
      <CopilotoDia
        greeting={greeting(now.getHours())}
        dateLabel={dateLabel}
        eventosHoje={briefing.eventosHoje}
        tarefasHoje={briefing.tarefasHoje}
        alertas={alertas}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ kpi, icon }) => (
          <KpiCard key={kpi.title} kpi={kpi} icon={icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DonutCard title="Eventos por status" unit="eventos" data={statusSlices} />
        <DonutCard title="Eventos por tipo" unit="eventos" data={typeSlices} />
        <MonthPerformance items={performanceItems} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700">
            Próximos eventos
          </h2>
          {eventsWithHealth.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
              Nenhum evento em andamento.{" "}
              <Link
                href="/eventos/novo"
                className="font-medium text-gray-900 underline underline-offset-4"
              >
                Criar evento
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {eventsWithHealth.map(({ event, saude }) => {
                const ui = SAUDE_UI[saude.nivel];
                return (
                  <li key={event.id}>
                    <Link
                      href={`/eventos/${event.id}`}
                      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {EVENT_TYPE_LABELS[event.type]}
                            {event.clients?.name
                              ? ` — ${event.clients.name}`
                              : ""}
                          </p>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {formatDate(event.date)}
                            {event.location ? ` · ${event.location}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${ui.bar}`}
                            aria-hidden
                          />
                          <span className="text-sm font-semibold text-gray-900 tabular-nums">
                            {saude.score}%
                          </span>
                        </div>
                      </div>
                      {saude.alertas.length > 0 && (
                        <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-gray-500">
                          <AlertTriangle size={12} className="shrink-0 text-gray-400" />
                          {saude.alertas.map((a) => a.texto).join(" · ")}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <ResumoFinanceiro data={financeiro} empresa={saldoEmpresa} />
          <ActivityFeed
            activities={activities}
            referenceIso={now.toISOString()}
          />
        </div>
      </div>
    </div>
  );
}
