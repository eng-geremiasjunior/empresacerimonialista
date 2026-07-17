// Dados do painel de Resumo do evento (redesign). Tudo real, via queries
// já existentes. Reaproveita o cálculo de Saúde do Evento.

import { addDays, differenceInCalendarDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getSaudeEvento } from "@/lib/supabase/evento";
import { calcularSaudeEvento, type Saude } from "@/lib/saude-evento";
import type { EventStatus, EventType } from "@/lib/types";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

// ------------------------------------------------------------
// Cabeçalho do evento (layout): saúde + 3 fases do ciclo + contadores,
// tudo numa leva de queries. As fases reaproveitam os MESMOS agregados
// da Saúde do Evento — nenhum cálculo inventado:
//   Planejamento → % de tarefas concluídas (checklist)
//   Operação     → prontidão do dia: fornecedores confirmados + cronograma
//   Pós-evento   → fechamento financeiro: receitas recebidas
// ------------------------------------------------------------

export type FasesEvento = {
  planejamento: number;
  operacao: number;
  posEvento: number;
};

export type CabecalhoEvento = {
  saude: Saude;
  fases: FasesEvento;
  contadores: EventoContadores;
};

export async function getCabecalhoEvento(
  eventId: string
): Promise<CabecalhoEvento> {
  const supabase = createClient();
  const hoje = iso(new Date());
  const em7 = iso(addDays(new Date(), 7));

  const [tasksRes, linksRes, itemsRes, txRes, msgRes] = await Promise.all([
    supabase.from("tasks").select("status").eq("event_id", eventId),
    supabase.from("roteiro_links").select("confirmed").eq("event_id", eventId),
    supabase
      .from("roteiro_items")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("transactions")
      .select("type, paid, due_date")
      .eq("event_id", eventId),
    supabase
      .from("event_messages")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("sender_type", "fornecedor")
      .is("read_at", null),
  ]);

  const tasks = (tasksRes.data ?? []) as { status: string }[];
  const links = (linksRes.data ?? []) as { confirmed: boolean }[];
  const tx = (txRes.data ?? []) as {
    type: string;
    paid: boolean;
    due_date: string | null;
  }[];
  const cronogramaItens = itemsRes.count ?? 0;

  const tarefasTotal = tasks.length;
  const tarefasConcluidas = tasks.filter((t) => t.status === "concluido").length;
  const fornTotal = links.length;
  const fornConfirmados = links.filter((l) => l.confirmed).length;
  const vencidas = tx.filter(
    (t) => t.type === "receita" && !t.paid && t.due_date && t.due_date < hoje
  );
  let diasMaisVencida: number | null = null;
  for (const t of vencidas) {
    const d = differenceInCalendarDays(
      new Date(`${hoje}T00:00:00`),
      new Date(`${t.due_date}T00:00:00`)
    );
    if (diasMaisVencida === null || d > diasMaisVencida) diasMaisVencida = d;
  }

  const saude = calcularSaudeEvento({
    tarefasTotal,
    tarefasConcluidas,
    fornecedoresTotal: fornTotal,
    fornecedoresConfirmados: fornConfirmados,
    parcelasVencidas: vencidas.length,
    diasParcelaMaisVencida: diasMaisVencida,
    roteiroItens: cronogramaItens,
  });

  // Fases (0-100)
  const planejamento =
    tarefasTotal > 0
      ? Math.round((tarefasConcluidas / tarefasTotal) * 100)
      : 100;
  const fornNorm = fornTotal > 0 ? (fornConfirmados / fornTotal) * 100 : 100;
  const cronNorm = cronogramaItens > 0 ? 100 : 0;
  const operacao = Math.round((fornNorm + cronNorm) / 2);
  const receitas = tx.filter((t) => t.type === "receita");
  const receitasPagas = receitas.filter((t) => t.paid).length;
  const posEvento =
    receitas.length > 0
      ? Math.round((receitasPagas / receitas.length) * 100)
      : 100;

  const receberContador = tx.filter(
    (t) => t.type === "receita" && !t.paid && t.due_date && t.due_date <= em7
  ).length;

  return {
    saude,
    fases: { planejamento, operacao, posEvento },
    contadores: {
      fornecedoresPendentes: fornTotal - fornConfirmados,
      comunicacaoNaoLidas: msgRes.count ?? 0,
      financeiroVencendo: receberContador,
    },
  };
}

// Contadores de pendência para as abas (item 6). Leve — usado no layout.
export type EventoContadores = {
  fornecedoresPendentes: number;
  comunicacaoNaoLidas: number;
  financeiroVencendo: number;
};

export async function getEventoContadores(
  eventId: string
): Promise<EventoContadores> {
  const supabase = createClient();
  const hoje = iso(new Date());
  const em7 = iso(addDays(new Date(), 7));

  const [linksRes, msgRes, txRes] = await Promise.all([
    supabase.from("roteiro_links").select("confirmed").eq("event_id", eventId),
    supabase
      .from("event_messages")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("sender_type", "fornecedor")
      .is("read_at", null),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("type", "receita")
      .eq("paid", false)
      .lte("due_date", em7),
  ]);

  const links = (linksRes.data ?? []) as { confirmed: boolean }[];

  return {
    fornecedoresPendentes: links.filter((l) => !l.confirmed).length,
    comunicacaoNaoLidas: msgRes.count ?? 0,
    financeiroVencendo: txRes.count ?? 0,
    // financeiroVencendo já cobre "vencendo em 7 dias ou vencidas"
    // (lte em7 inclui datas passadas).
  };
}

// ------------------------------------------------------------
// Resumo completo (página)
// ------------------------------------------------------------

export type ProximaTarefa = {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
};

export type ResumoEvento = {
  event: {
    id: string;
    type: EventType;
    name: string | null;
    date: string;
    location: string | null;
    city: string | null;
    status: EventStatus;
    contract_value: number | null;
    guests: number | null;
    time: string | null;
  };
  client: {
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    instagram: string | null;
  } | null;
  responsavel: { nome: string; cargo: string } | null;
  saude: Saude;
  // Critérios OK reais (para a lista verde do Status Operacional)
  criterios: {
    temTarefas: boolean;
    tarefasOk: boolean;
    temFornecedores: boolean;
    fornecedoresOk: boolean;
    financeiroOk: boolean;
    cronogramaOk: boolean;
  };
  operacional: {
    cronogramaItens: number;
    checklistFeitas: number;
    checklistTotal: number;
    fornecedoresTotal: number;
    fornecedoresConfirmados: number;
    fornecedoresPendentes: number;
    comunicacaoNaoLidas: number;
  };
  formaPagamento: string | null;
  proximas: {
    hoje: ProximaTarefa[];
    amanha: ProximaTarefa[];
    proximos7: ProximaTarefa[];
    confirmacaoAgendada: string | null; // data do envio automático, se na janela
  };
};

export async function getResumoEvento(
  eventId: string
): Promise<ResumoEvento | null> {
  const supabase = createClient();
  const hojeD = new Date();
  const hoje = iso(hojeD);
  const amanha = iso(addDays(hojeD, 1));
  const em7 = iso(addDays(hojeD, 7));

  const evRes = await supabase
    .from("events")
    .select(
      "id, type, name, date, location, city, status, contract_value, guests, time, confirmation_days_before, confirmation_sent_at, clients(name, phone, whatsapp, email, instagram), responsavel:membros_equipe(nome, cargo)"
    )
    .eq("id", eventId)
    .single();

  // Degrada se a relação do responsável não existir (migração 022 pendente).
  let evData = evRes.data as Record<string, unknown> | null;
  if (evRes.error?.code === "PGRST200" || evRes.error?.code === "42703") {
    const alt = await supabase
      .from("events")
      .select(
        "id, type, name, date, location, city, status, contract_value, guests, time, confirmation_days_before, confirmation_sent_at, clients(name, phone, whatsapp, email, instagram)"
      )
      .eq("id", eventId)
      .single();
    evData = alt.data as Record<string, unknown> | null;
  }
  if (!evData) return null;

  const [tasksRes, linksRes, itemsRes, txRes, msgRes, saude] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, status, due_date, due_time")
        .eq("event_id", eventId),
      supabase.from("roteiro_links").select("confirmed").eq("event_id", eventId),
      supabase
        .from("roteiro_items")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId),
      supabase
        .from("transactions")
        .select("category, installment_total, paid, due_date, type")
        .eq("event_id", eventId),
      supabase
        .from("event_messages")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("sender_type", "fornecedor")
        .is("read_at", null),
      getSaudeEvento(eventId),
    ]);

  const tasks = (tasksRes.data ?? []) as {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    due_time: string | null;
  }[];
  const links = (linksRes.data ?? []) as { confirmed: boolean }[];
  const tx = (txRes.data ?? []) as {
    category: string;
    installment_total: number | null;
    paid: boolean;
    due_date: string | null;
    type: string;
  }[];

  const checklistTotal = tasks.length;
  const checklistFeitas = tasks.filter((t) => t.status === "concluido").length;
  const fornecedoresTotal = links.length;
  const fornecedoresConfirmados = links.filter((l) => l.confirmed).length;
  const cronogramaItens = itemsRes.count ?? 0;
  const parcelasVencidas = tx.filter(
    (t) => t.type === "receita" && !t.paid && t.due_date && t.due_date < hoje
  ).length;

  // Forma de pagamento (real): nº de parcelas do contrato. Usa
  // installment_total (robusto: cada parcela guarda o total) com fallback
  // para a contagem de linhas.
  const contratoRows = tx.filter((t) => t.category === "contrato");
  const parcelasContrato =
    contratoRows.length > 0
      ? Math.max(
          ...contratoRows.map((t) => t.installment_total ?? contratoRows.length)
        )
      : 0;
  const temEntrada = tx.some((t) => t.category === "entrada");
  const formaPagamento =
    parcelasContrato > 0
      ? `${parcelasContrato}x parcelado${temEntrada ? " (com entrada)" : ""}`
      : temEntrada
        ? "Entrada registrada"
        : null;

  // Próximas atividades (tarefas não concluídas, por janela de tempo)
  const abertas = tasks.filter(
    (t) => t.status !== "concluido" && t.due_date
  ) as { id: string; title: string; due_date: string; due_time: string | null }[];
  const mapTarefa = (t: (typeof abertas)[number]): ProximaTarefa => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    due_time: t.due_time,
  });
  const ordena = (a: ProximaTarefa, b: ProximaTarefa) =>
    (a.due_time ?? "99").localeCompare(b.due_time ?? "99");

  const hojeT = abertas.filter((t) => t.due_date === hoje).map(mapTarefa).sort(ordena);
  const amanhaT = abertas.filter((t) => t.due_date === amanha).map(mapTarefa).sort(ordena);
  const proximos7T = abertas
    .filter((t) => t.due_date > amanha && t.due_date <= em7)
    .map(mapTarefa)
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || ordena(a, b));

  // Confirmação automática de fornecedores agendada na janela de 7 dias?
  const diasAntes = (evData.confirmation_days_before as number | null) ?? 7;
  const dataEvento = evData.date as string;
  const jaEnviada = evData.confirmation_sent_at != null;
  let confirmacaoAgendada: string | null = null;
  if (!jaEnviada && fornecedoresTotal > 0) {
    const disparo = iso(addDays(new Date(`${dataEvento}T00:00:00`), -diasAntes));
    if (disparo >= hoje && disparo <= em7) confirmacaoAgendada = disparo;
  }

  const client = (evData.clients as ResumoEvento["client"]) ?? null;
  const responsavel =
    (evData.responsavel as { nome: string; cargo: string } | null) ?? null;

  return {
    event: {
      id: evData.id as string,
      type: evData.type as EventType,
      name: (evData.name as string | null) ?? null,
      date: dataEvento,
      location: (evData.location as string | null) ?? null,
      city: (evData.city as string | null) ?? null,
      status: evData.status as EventStatus,
      contract_value: (evData.contract_value as number | null) ?? null,
      guests: (evData.guests as number | null) ?? null,
      time: (evData.time as string | null) ?? null,
    },
    client,
    responsavel,
    saude,
    criterios: {
      temTarefas: checklistTotal > 0,
      tarefasOk: checklistTotal === 0 || checklistFeitas === checklistTotal,
      temFornecedores: fornecedoresTotal > 0,
      fornecedoresOk:
        fornecedoresTotal === 0 ||
        fornecedoresConfirmados === fornecedoresTotal,
      financeiroOk: parcelasVencidas === 0,
      cronogramaOk: cronogramaItens > 0,
    },
    operacional: {
      cronogramaItens,
      checklistFeitas,
      checklistTotal,
      fornecedoresTotal,
      fornecedoresConfirmados,
      fornecedoresPendentes: fornecedoresTotal - fornecedoresConfirmados,
      comunicacaoNaoLidas: msgRes.count ?? 0,
    },
    formaPagamento,
    proximas: {
      hoje: hojeT,
      amanha: amanhaT,
      proximos7: proximos7T,
      confirmacaoAgendada,
    },
  };
}
