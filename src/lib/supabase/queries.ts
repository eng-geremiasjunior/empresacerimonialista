import { addDays, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type {
  Activity,
  ActivityCategory,
  ActivityType,
} from "@/lib/activity";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TipoPrazo } from "@/lib/copiloto-prazos";
import {
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";
import { emDiasBR, hojeBR, inicioDoMesBR, proximoMesBR } from "@/lib/tempo";

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
  const hoje = hojeBR();

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
  const hoje = hojeBR();
  const fim = emDiasBR(7);

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
  const hoje = hojeBR();
  const fim = emDiasBR(7);

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
  const mesInicio = inicioDoMesBR();
  const proxMes = proximoMesBR();

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
  /** que espécie de prazo é este — o Copiloto conta por espécie, não em bloco */
  tipo: TipoPrazo;
  texto: string;
  href: string;
  ref: string; // data usada para ordenar por urgência (mais cedo primeiro)
};

function eventLabel(type: EventType, clientName: string | null | undefined) {
  return `${EVENT_TYPE_LABELS[type]}${clientName ? ` — ${clientName}` : ""}`;
}

/** Evento que não pede mais nada: cancelado ou arquivado. */
function eventoMorto(ev: { status?: string | null; archived?: boolean | null }): boolean {
  return ev.status === "cancelado" || ev.archived === true;
}

/**
 * Os prazos do Copiloto. Fonte ÚNICA — o card da sidebar e o bloco do
 * dashboard leem daqui, e por isso não podem mais divergir.
 *
 * Três espécies, cada uma com a sua regra de vida:
 *
 *  - parcela a cobrar: vale MESMO depois do evento. A festa acabou, o
 *    dinheiro que a cliente não pagou continua sendo dela. Inclui o que já
 *    venceu (antes a consulta começava em hoje e dívida atrasada era
 *    invisível aqui, embora aparecesse no cartão do evento).
 *  - fornecedor sem confirmar: só faz sentido ANTES do dia. Depois da
 *    festa, confirmar presença não muda nada.
 *  - tarefa atrasada: idem — tarefa de evento que já aconteceu é peso
 *    morto, não pendência.
 */
export async function getAlertasCopiloto(): Promise<CopilotoAlerta[]> {
  const supabase = createClient();
  const hoje = hojeBR();
  const fim = emDiasBR(7);
  const alertas: CopilotoAlerta[] = [];

  const [tarefasRes, fornecedoresRes, pagamentosRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date, event_id, events!inner(date, status, archived)")
      .lt("due_date", hoje)
      .neq("status", "concluido")
      .not("due_date", "is", null)
      .gte("events.date", hoje),
    supabase
      .from("roteiro_links")
      .select(
        "supplier_id, event_id, suppliers(name), events!inner(date, type, status, archived, clients(name))"
      )
      .eq("confirmed", false)
      .gte("events.date", hoje)
      .lte("events.date", fim),
    supabase
      .from("transactions")
      .select("id, value, due_date, event_id, events(type, status, archived, clients(name))")
      .eq("type", "receita")
      .eq("paid", false)
      .not("due_date", "is", null)
      .lte("due_date", fim),
  ]);

  // Falha de leitura não pode virar "Nada vencendo hoje.". Essa frase é uma
  // afirmação, e dizê-la porque a consulta quebrou é pior do que não dizer
  // nada — o layout já sabe cair para "Prazos: —" quando isto lança.
  const erro =
    tarefasRes.error ?? fornecedoresRes.error ?? pagamentosRes.error ?? null;
  if (erro) {
    throw new Error(`[vela:copiloto] leitura dos prazos falhou: ${erro.message}`);
  }

  for (const row of (tarefasRes.data ?? []) as unknown as {
    id: string;
    title: string;
    due_date: string;
    event_id: string;
    events: { date: string; status: string; archived: boolean | null };
  }[]) {
    if (eventoMorto(row.events)) continue;
    alertas.push({
      id: `tarefa-${row.id}`,
      tipo: "tarefa",
      texto: `Tarefa atrasada: ${row.title}`,
      href: `/eventos/${row.event_id}/organizacao?tarefa=${row.id}`,
      ref: row.due_date,
    });
  }

  for (const row of (fornecedoresRes.data ?? []) as unknown as {
    event_id: string;
    suppliers: { name: string } | null;
    events: {
      date: string;
      type: EventType;
      status: string;
      archived: boolean | null;
      clients: { name: string } | null;
    };
  }[]) {
    if (eventoMorto(row.events)) continue;
    alertas.push({
      id: `fornecedor-${row.event_id}-${row.suppliers?.name}`,
      tipo: "fornecedor",
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
    events: {
      type: EventType;
      status: string;
      archived: boolean | null;
      clients: { name: string } | null;
    } | null;
  }[]) {
    if (row.events && eventoMorto(row.events)) continue;
    const label = row.events
      ? ` — ${eventLabel(row.events.type, row.events.clients?.name)}`
      : "";
    const venceu = row.due_date < hoje;
    alertas.push({
      id: `pagamento-${row.id}`,
      tipo: "pagamento",
      // "venceu em" e "vence em" são fatos diferentes e a diferença é a
      // que decide se ela liga hoje ou anota para depois
      texto: `Cobrar ${formatCurrency(Number(row.value))} — ${venceu ? "venceu" : "vence"} ${formatDate(row.due_date)}${label}`,
      href: `/eventos/${row.event_id}/financeiro`,
      ref: row.due_date,
    });
  }

  return alertas.sort((a, b) => a.ref.localeCompare(b.ref));
}
