import { addDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type {
  Activity,
  ActivityCategory,
  ActivityType,
} from "@/lib/activity";
import { formatCurrency } from "@/lib/format";
import {
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const monthRange = (monthsAgo: number) => {
  const base = subMonths(new Date(), monthsAgo);
  return { from: iso(startOfMonth(base)), to: iso(endOfMonth(base)) };
};

// Feed de atividades reais (log automático via trigger; ver 008_activities.sql).
// RLS limita às atividades da cerimonialista logada. Se a tabela ainda não
// existe, retorna [] (o feed mostra o estado vazio, sem quebrar o dashboard).
export async function getRecentActivities(limit = 20): Promise<Activity[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("activities")
    .select(
      "id, category, type, title, description, event_id, event_name, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const record = row as unknown as {
      id: string;
      category: ActivityCategory;
      type: ActivityType;
      title: string;
      description: string | null;
      event_id: string | null;
      event_name: string | null;
      created_at: string;
    };
    return {
      id: record.id,
      category: record.category,
      type: record.type,
      title: record.title,
      description: record.description,
      eventId: record.event_id,
      eventName: record.event_name,
      createdAt: record.created_at,
    };
  });
}

// ------------------------------------------------------------
// Briefing do dia (Copiloto) e Resumo Financeiro
// Tudo real via RLS. transactions usa `paid` (bool): pendente = paid false.
// ------------------------------------------------------------

export type BriefingHoje = { eventosHoje: number; tarefasHoje: number };

export async function getBriefingHoje(): Promise<BriefingHoje> {
  const supabase = createClient();
  const hoje = iso(new Date());

  const [eventos, tarefas] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("date", hoje),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("due_date", hoje)
      .neq("status", "concluido"),
  ]);

  return { eventosHoje: eventos.count ?? 0, tarefasHoje: tarefas.count ?? 0 };
}

// Fornecedores ainda não confirmados em eventos dos próximos 7 dias.
export async function getFornecedoresPendentes(): Promise<number> {
  const supabase = createClient();
  const hoje = iso(new Date());
  const fim = iso(addDays(new Date(), 7));

  const { count } = await supabase
    .from("roteiro_links")
    .select("id, events!inner(date)", { count: "exact", head: true })
    .eq("confirmed", false)
    .gte("events.date", hoje)
    .lte("events.date", fim);

  return count ?? 0;
}

// Transações não pagas vencendo nos próximos 7 dias.
export async function getPagamentosVencendo(): Promise<number> {
  const supabase = createClient();
  const hoje = iso(new Date());
  const fim = iso(addDays(new Date(), 7));

  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("paid", false)
    .gte("due_date", hoje)
    .lte("due_date", fim);

  return count ?? 0;
}

export type ResumoFinanceiro = {
  aReceber: number;
  recebidoMes: number;
  vencendo: number;
  temDados: boolean;
};

export async function getResumoFinanceiro(): Promise<ResumoFinanceiro> {
  const supabase = createClient();
  const mesInicio = iso(startOfMonth(new Date()));
  const proxMes = iso(startOfMonth(addDays(startOfMonth(new Date()), 40)));

  const soma = (rows: { value: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.value ?? 0), 0);

  const [aReceberRes, recebidoRes, vencendo, totalRes] = await Promise.all([
    supabase.from("transactions").select("value").eq("type", "receita").eq("paid", false),
    supabase
      .from("transactions")
      .select("value")
      .eq("type", "receita")
      .eq("paid", true)
      .gte("due_date", mesInicio)
      .lt("due_date", proxMes),
    getPagamentosVencendo(),
    supabase.from("transactions").select("*", { count: "exact", head: true }),
  ]);

  return {
    aReceber: soma(aReceberRes.data),
    recebidoMes: soma(recebidoRes.data),
    vencendo,
    temDados: (totalRes.count ?? 0) > 0,
  };
}

// ------------------------------------------------------------
// KPIs do dashboard (mês atual vs. mês anterior)
// ------------------------------------------------------------

export type KpiCounts = { current: number; previous: number };

// Eventos confirmados com data no mês (atual vs. anterior).
export async function getKpiEventosEmAndamento(): Promise<KpiCounts> {
  const supabase = createClient();
  const atual = monthRange(0);
  const anterior = monthRange(1);

  const count = async (range: { from: string; to: string }) => {
    const { count } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmado")
      .gte("date", range.from)
      .lte("date", range.to);
    return count ?? 0;
  };

  const [current, previous] = await Promise.all([count(atual), count(anterior)]);
  return { current, previous };
}

// Faturado (receita com vencimento no mês, pago ou não) — atual vs. anterior.
export async function getKpiFaturamentoMes(): Promise<KpiCounts> {
  const supabase = createClient();
  const atual = monthRange(0);
  const anterior = monthRange(1);

  const soma = async (range: { from: string; to: string }) => {
    const { data } = await supabase
      .from("transactions")
      .select("value")
      .eq("type", "receita")
      .gte("due_date", range.from)
      .lte("due_date", range.to);
    return (data ?? []).reduce((s, r) => s + Number(r.value ?? 0), 0);
  };

  const [current, previous] = await Promise.all([soma(atual), soma(anterior)]);
  return { current, previous };
}

// Eventos ainda em orçamento (sem recorte de data — "em aberto" é atemporal).
export async function getCotacoesAbertas(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("status", "orcamento");
  return count ?? 0;
}

// Clientes com pelo menos um evento em orçamento ou confirmado.
export async function getClientesAtivos(): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("client_id")
    .in("status", ["orcamento", "confirmado"])
    .not("client_id", "is", null);

  const ids = new Set((data ?? []).map((r) => r.client_id as string));
  return ids.size;
}

// ------------------------------------------------------------
// Donuts: eventos por status / por tipo (todo o histórico)
// ------------------------------------------------------------

export type StatusCount = { status: EventStatus; count: number };
export type TypeCount = { type: EventType; count: number };

export async function getEventsByStatus(): Promise<StatusCount[]> {
  const supabase = createClient();
  const { data } = await supabase.from("events").select("status");
  const rows = (data ?? []) as { status: EventStatus }[];

  const counts = new Map<EventStatus, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

export async function getEventsByType(): Promise<TypeCount[]> {
  const supabase = createClient();
  const { data } = await supabase.from("events").select("type");
  const rows = (data ?? []) as { type: EventType }[];

  const counts = new Map<EventType, number>();
  for (const row of rows) counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

// ------------------------------------------------------------
// Performance do mês (operacional — sem meta cadastrada ainda)
// ------------------------------------------------------------

export type PerformanceMes = {
  eventosRealizados: number;
  cotacoesConfirmadas: number;
  tarefasConcluidas: number;
};

export async function getPerformanceMes(): Promise<PerformanceMes> {
  const supabase = createClient();
  const { from, to } = monthRange(0);

  const [realizados, confirmadas, tarefas] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "concluido")
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmado")
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "concluido")
      .gte("due_date", from)
      .lte("due_date", to),
  ]);

  return {
    eventosRealizados: realizados.count ?? 0,
    cotacoesConfirmadas: confirmadas.count ?? 0,
    tarefasConcluidas: tarefas.count ?? 0,
  };
}

// ------------------------------------------------------------
// Alertas do Copiloto — cada um clicável, escopado a um evento.
// ------------------------------------------------------------

export type CopilotoAlerta = {
  id: string;
  texto: string;
  href: string;
  ref: string; // data usada para ordenar por urgência (mais cedo primeiro)
};

function eventLabel(type: EventType, clientName: string | null | undefined) {
  return `${EVENT_TYPE_LABELS[type]}${clientName ? ` — ${clientName}` : ""}`;
}

export async function getAlertasCopiloto(): Promise<CopilotoAlerta[]> {
  const supabase = createClient();
  const hoje = iso(new Date());
  const fim = iso(addDays(new Date(), 7));
  const alertas: CopilotoAlerta[] = [];

  const [tarefasRes, fornecedoresRes, pagamentosRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date, event_id")
      .lt("due_date", hoje)
      .neq("status", "concluido")
      .not("due_date", "is", null),
    supabase
      .from("roteiro_links")
      .select("supplier_id, event_id, suppliers(name), events!inner(date, type, clients(name))")
      .eq("confirmed", false)
      .gte("events.date", hoje)
      .lte("events.date", fim),
    supabase
      .from("transactions")
      .select("id, value, due_date, event_id, events(type, clients(name))")
      .eq("paid", false)
      .gte("due_date", hoje)
      .lte("due_date", fim),
  ]);

  for (const row of (tarefasRes.data ?? []) as {
    id: string;
    title: string;
    due_date: string;
    event_id: string;
  }[]) {
    alertas.push({
      id: `tarefa-${row.id}`,
      texto: `Tarefa atrasada: ${row.title}`,
      href: `/eventos/${row.event_id}/tarefas`,
      ref: row.due_date,
    });
  }

  for (const row of (fornecedoresRes.data ?? []) as unknown as {
    event_id: string;
    suppliers: { name: string } | null;
    events: { date: string; type: EventType; clients: { name: string } | null };
  }[]) {
    alertas.push({
      id: `fornecedor-${row.event_id}-${row.suppliers?.name}`,
      texto: `${row.suppliers?.name ?? "Fornecedor"} não confirmou — ${eventLabel(row.events.type, row.events.clients?.name)}`,
      href: `/eventos/${row.event_id}/fornecedores`,
      ref: row.events.date,
    });
  }

  for (const row of (pagamentosRes.data ?? []) as unknown as {
    id: string;
    value: number;
    due_date: string;
    event_id: string;
    events: { type: EventType; clients: { name: string } | null } | null;
  }[]) {
    const label = row.events
      ? ` — ${eventLabel(row.events.type, row.events.clients?.name)}`
      : "";
    alertas.push({
      id: `pagamento-${row.id}`,
      texto: `Pagamento de ${formatCurrency(Number(row.value))} vencendo${label}`,
      href: `/eventos/${row.event_id}/financeiro`,
      ref: row.due_date,
    });
  }

  return alertas.sort((a, b) => a.ref.localeCompare(b.ref));
}
