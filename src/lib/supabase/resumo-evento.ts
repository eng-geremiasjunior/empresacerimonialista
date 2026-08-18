// Dados do painel de Resumo do evento (redesign). Tudo real, via queries
// já existentes. Reaproveita o cálculo de Saúde do Evento.

import { addDays, differenceInCalendarDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getSaudeEvento } from "@/lib/supabase/evento";
import { calcularSaudeEvento, type Saude } from "@/lib/saude-evento";
import type { EventStatus, EventType } from "@/lib/types";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

// ------------------------------------------------------------
// Cabeçalho do evento (layout): saúde + jornada em 3 fases + contadores,
// tudo numa leva de queries. As fases reaproveitam os MESMOS agregados
// da Saúde do Evento — nenhum cálculo inventado:
//   Planejamento → % de tarefas concluídas (checklist)
//   Organização  → fornecedores confirmados + parcelas recebidas
//   Execução     → itens do roteiro concluídos no dia
//
// Cada fase expõe percentual E uma contagem própria, sempre vinda de
// query real (nunca texto fixo): é o que o stepper mostra embaixo do nó.
// ------------------------------------------------------------

export type FaseId = "planejamento" | "organizacao" | "execucao";

/** Selo do Resumo do Copiloto: cálculo por regras, nunca texto genérico. */
export type SeloCopiloto = { tipo: "ok" | "warn"; texto: string };

export type FaseProgresso = {
  id: FaseId;
  rotulo: string;
  pct: number;
  /** Ex.: "28 tarefas restantes". Vazio quando não há nada pendente. */
  contagem: string;
  /** Blocos ✔/⚠ do painel da fase. */
  selos: SeloCopiloto[];
};

export type FasesEvento = {
  lista: FaseProgresso[];
  /** Primeira fase não concluída — é a que o evento abre por padrão. */
  sugerida: FaseId;
};

export type CabecalhoEvento = {
  saude: Saude;
  fases: FasesEvento;
  contadores: EventoContadores;
};

const plural = (n: number, um: string, muitos: string) =>
  `${n} ${n === 1 ? um : muitos}`;

export async function getCabecalhoEvento(
  eventId: string,
  /** Data do evento (o layout já carregou) — alimenta "Faltam N dias". */
  dataEvento?: string | null
): Promise<CabecalhoEvento> {
  const supabase = createClient();
  const hoje = iso(new Date());
  const em7 = iso(addDays(new Date(), 7));

  const [tasksRes, linksRes, itemsRes, txRes, msgRes, confRes] = await Promise.all([
    // due_date entra para o Copiloto saber o que está vencido.
    supabase.from("tasks").select("status, due_date").eq("event_id", eventId),
    supabase.from("roteiro_links").select("confirmed").eq("event_id", eventId),
    // status_novo (031) é o estado real do item no dia: planejado,
    // em_andamento, concluido, problema. A contagem sozinha não diria
    // quanto da Execução já andou.
    supabase.from("roteiro_items").select("status_novo").eq("event_id", eventId),
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
    // respostas da cliente esperando conferência (091) — a aba
    // Planejamento mostra em quantos BLOCOS ela mexeu, não em quantos
    // campos: é o número de conferências que faltam fazer.
    supabase
      .from("evento_campo_valor")
      .select("evento_decisao_id")
      .eq("event_id", eventId)
      .eq("aguarda_conferencia", true),
  ]);

  const tasks = (tasksRes.data ?? []) as {
    status: string;
    due_date: string | null;
  }[];
  const links = (linksRes.data ?? []) as { confirmed: boolean }[];
  const tx = (txRes.data ?? []) as {
    type: string;
    paid: boolean;
    due_date: string | null;
  }[];
  const roteiro = (itemsRes.data ?? []) as { status_novo: string | null }[];
  const cronogramaItens = roteiro.length;

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

  // ---- Jornada em 3 fases (0-100 + contagem própria) ----
  // Fase sem nada montado fica em 0% e o stepper a rotula "A iniciar":
  // dizer 100% ali seria afirmar que está pronta quando nem começou — e
  // gerava a contradição de marcar 100% junto de um alerta de pendência.

  // PLANEJAMENTO — o checklist do evento.
  const planejamentoPct =
    tarefasTotal > 0 ? Math.round((tarefasConcluidas / tarefasTotal) * 100) : 0;
  const tarefasRestantes = tarefasTotal - tarefasConcluidas;

  // ORGANIZAÇÃO — fechar fornecedores e receber as parcelas do contrato.
  // São duas frentes: uma frente ainda não montada conta como pendente
  // (peso 1), senão ter só as parcelas em dia marcaria a fase inteira
  // como concluída sem nenhum fornecedor fechado.
  const receitas = tx.filter((t) => t.type === "receita");
  const receitasPagas = receitas.filter((t) => t.paid).length;
  const parcelasPendentes = receitas.length - receitasPagas;
  const fornPendentes = fornTotal - fornConfirmados;
  const organizacaoItens = fornTotal + receitas.length;
  const unidadesOrganizacao =
    (fornTotal > 0 ? fornTotal : 1) + (receitas.length > 0 ? receitas.length : 1);
  const organizacaoPct = Math.round(
    ((fornConfirmados + receitasPagas) / unidadesOrganizacao) * 100
  );

  // EXECUÇÃO — o roteiro do dia, item a item.
  const roteiroConcluidos = roteiro.filter(
    (i) => i.status_novo === "concluido"
  ).length;
  const execucaoPct =
    cronogramaItens > 0
      ? Math.round((roteiroConcluidos / cronogramaItens) * 100)
      : 0; // sem roteiro montado a Execução não começou
  const roteiroRestantes = cronogramaItens - roteiroConcluidos;
  const roteiroProblemas = roteiro.filter(
    (i) => i.status_novo === "problema"
  ).length;

  // Dias até o evento: é a contagem que a Execução mostra enquanto o dia
  // não chega ("Faltam 47 dias" no mockup).
  const diasParaEvento = dataEvento
    ? differenceInCalendarDays(
        new Date(`${dataEvento}T00:00:00`),
        new Date(`${hoje}T00:00:00`)
      )
    : null;

  // ---- Selos do Copiloto: ✔/⚠ por regra, sobre o mesmo dado ----
  const tarefasVencidas = tasks.filter(
    (t) =>
      t.status !== "concluido" && t.due_date !== null && t.due_date < hoje
  ).length;

  const selosPlanejamento: SeloCopiloto[] = [];
  if (tarefasTotal === 0) {
    selosPlanejamento.push({
      tipo: "warn",
      texto: "Checklist do evento ainda não montado",
    });
  } else {
    selosPlanejamento.push({
      tipo: tarefasConcluidas === tarefasTotal ? "ok" : "warn",
      texto: `${tarefasConcluidas} de ${tarefasTotal} ${tarefasTotal === 1 ? "tarefa concluída" : "tarefas concluídas"}`,
    });
    if (tarefasVencidas > 0) {
      selosPlanejamento.push({
        tipo: "warn",
        texto: plural(tarefasVencidas, "tarefa vencida", "tarefas vencidas"),
      });
    } else if (tarefasRestantes > 0) {
      selosPlanejamento.push({
        tipo: "ok",
        texto: "Nenhuma tarefa vencida",
      });
    }
  }

  const selosOrganizacao: SeloCopiloto[] = [];
  if (fornTotal === 0) {
    selosOrganizacao.push({
      tipo: "warn",
      texto: "Nenhum fornecedor vinculado ao evento",
    });
  } else {
    selosOrganizacao.push({
      tipo: fornConfirmados === fornTotal ? "ok" : "warn",
      texto: `${fornConfirmados} de ${fornTotal} ${fornTotal === 1 ? "fornecedor confirmado" : "fornecedores confirmados"}`,
    });
  }
  if (receitas.length === 0) {
    selosOrganizacao.push({
      tipo: "warn",
      texto: "Contrato sem parcelas lançadas",
    });
  } else {
    selosOrganizacao.push({
      tipo: receitasPagas === receitas.length ? "ok" : "warn",
      texto: `${receitasPagas} de ${receitas.length} ${receitas.length === 1 ? "parcela recebida" : "parcelas recebidas"}`,
    });
    if (vencidas.length > 0) {
      selosOrganizacao.push({
        tipo: "warn",
        texto: plural(vencidas.length, "parcela vencida", "parcelas vencidas"),
      });
    }
  }

  const selosExecucao: SeloCopiloto[] = [];
  if (cronogramaItens === 0) {
    selosExecucao.push({
      tipo: "warn",
      texto: "Roteiro do dia ainda não montado",
    });
  } else {
    selosExecucao.push({
      tipo: roteiroConcluidos === cronogramaItens ? "ok" : "warn",
      texto: `${roteiroConcluidos} de ${cronogramaItens} ${cronogramaItens === 1 ? "item concluído" : "itens concluídos"}`,
    });
    if (roteiroProblemas > 0) {
      selosExecucao.push({
        tipo: "warn",
        texto: plural(
          roteiroProblemas,
          "item com problema reportado",
          "itens com problema reportado"
        ),
      });
    }
  }
  if (diasParaEvento !== null) {
    selosExecucao.push({
      tipo: "ok",
      texto:
        diasParaEvento > 0
          ? `Faltam ${plural(diasParaEvento, "dia", "dias")} para o evento`
          : diasParaEvento === 0
            ? "O evento é hoje"
            : "Evento já realizado",
    });
  }

  const lista: FaseProgresso[] = [
    {
      id: "planejamento",
      rotulo: "Planejamento",
      pct: planejamentoPct,
      contagem:
        tarefasTotal === 0
          ? "Nenhuma tarefa cadastrada"
          : tarefasRestantes > 0
            ? `${plural(tarefasRestantes, "tarefa restante", "tarefas restantes")}`
            : "Checklist concluído",
      selos: selosPlanejamento,
    },
    {
      id: "organizacao",
      rotulo: "Organização",
      pct: organizacaoPct,
      contagem:
        organizacaoItens === 0
          ? "Sem fornecedores ou parcelas"
          : [
              fornPendentes > 0
                ? plural(fornPendentes, "fornecedor a confirmar", "fornecedores a confirmar")
                : null,
              parcelasPendentes > 0
                ? plural(parcelasPendentes, "parcela pendente", "parcelas pendentes")
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Tudo confirmado",
      selos: selosOrganizacao,
    },
    {
      id: "execucao",
      rotulo: "Execução",
      pct: execucaoPct,
      // Enquanto o dia não chega, a contagem útil é o tempo restante —
      // é o que o mockup mostra ("Faltam 47 dias").
      contagem:
        diasParaEvento !== null && diasParaEvento > 0
          ? `Faltam ${plural(diasParaEvento, "dia", "dias")}`
          : cronogramaItens === 0
            ? "Roteiro não montado"
            : roteiroRestantes > 0
              ? plural(roteiroRestantes, "item do roteiro", "itens do roteiro")
              : "Roteiro concluído",
      selos: selosExecucao,
    },
  ];

  // Fase sugerida: a primeira não concluída. É só o padrão de abertura —
  // a navegação entre fases é livre.
  const sugerida: FaseId =
    lista.find((f) => f.pct < 100)?.id ?? "execucao";

  const receberContador = tx.filter(
    (t) => t.type === "receita" && !t.paid && t.due_date && t.due_date <= em7
  ).length;

  const decisoesDaCliente = new Set(
    (confRes.data ?? []).map((c: { evento_decisao_id: string }) => c.evento_decisao_id)
  ).size;

  return {
    saude,
    fases: { lista, sugerida },
    contadores: {
      fornecedoresPendentes: fornTotal - fornConfirmados,
      comunicacaoNaoLidas: msgRes.count ?? 0,
      financeiroVencendo: receberContador,
      planejamentoDaCliente: decisoesDaCliente,
    },
  };
}

// Contadores de pendência para as abas (item 6). Leve — usado no layout.
export type EventoContadores = {
  fornecedoresPendentes: number;
  comunicacaoNaoLidas: number;
  financeiroVencendo: number;
  /** blocos do Planejamento com resposta da cliente sem conferir (091) */
  planejamentoDaCliente: number;
};

export async function getEventoContadores(
  eventId: string
): Promise<EventoContadores> {
  const supabase = createClient();
  const hoje = iso(new Date());
  const em7 = iso(addDays(new Date(), 7));

  const [linksRes, msgRes, txRes, confRes] = await Promise.all([
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
    supabase
      .from("evento_campo_valor")
      .select("evento_decisao_id")
      .eq("event_id", eventId)
      .eq("aguarda_conferencia", true),
  ]);

  const links = (linksRes.data ?? []) as { confirmed: boolean }[];

  return {
    fornecedoresPendentes: links.filter((l) => !l.confirmed).length,
    comunicacaoNaoLidas: msgRes.count ?? 0,
    financeiroVencendo: txRes.count ?? 0,
    // financeiroVencendo já cobre "vencendo em 7 dias ou vencidas"
    // (lte em7 inclui datas passadas).
    planejamentoDaCliente: new Set(
      (confRes.data ?? []).map((c: { evento_decisao_id: string }) => c.evento_decisao_id)
    ).size,
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
  responsavel: { nome: string; cargo: string; user_id: string | null } | null;
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
      "id, type, name, date, location, city, status, contract_value, guests, time, confirmation_days_before, confirmation_sent_at, clients(name, phone, whatsapp, email, instagram), responsavel:membros_equipe(nome, cargo, user_id)"
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
    (evData.responsavel as {
      nome: string;
      cargo: string;
      user_id: string | null;
    } | null) ?? null;

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
