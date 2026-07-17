// Dados dos cards da listagem de Eventos, em bulk (poucas queries para N
// eventos): saúde + próxima ação + fornecedores + financeiro. Reaproveita
// os mesmos agregados da Saúde do Evento. Tudo real.

import { addDays, differenceInCalendarDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { calcularSaudeEvento, type Saude } from "@/lib/saude-evento";
import { calcularProximaAcao, type ProximaAcao } from "@/lib/proxima-acao";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export type FinanceiroCard = {
  temReceitas: boolean;
  pagoPct: number;
  entradaPaga: boolean | null; // null = sem entrada registrada
  proximaParcelaData: string | null;
};

export type EventoCardData = {
  saude: Saude;
  proximaAcao: ProximaAcao;
  fornecedoresConfirmados: number;
  fornecedoresTotal: number;
  financeiro: FinanceiroCard;
};

function group<T extends { event_id: string }>(rows: T[]) {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const l = m.get(r.event_id) ?? [];
    l.push(r);
    m.set(r.event_id, l);
  }
  return m;
}

export async function getEventosCardData(
  events: { id: string; date: string }[]
): Promise<Record<string, EventoCardData>> {
  if (events.length === 0) return {};
  const supabase = createClient();
  const ids = events.map((e) => e.id);
  const hoje = iso(new Date());
  const em2 = iso(addDays(new Date(), 2));
  const em7 = iso(addDays(new Date(), 7));

  const [tasksRes, linksRes, txRes, itemsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("event_id, status, priority, due_date, title")
      .in("event_id", ids),
    supabase
      .from("roteiro_links")
      .select("event_id, confirmed, suppliers(name)")
      .in("event_id", ids),
    supabase
      .from("transactions")
      .select("event_id, type, category, paid, due_date, value")
      .in("event_id", ids),
    supabase.from("roteiro_items").select("event_id").in("event_id", ids),
  ]);

  const tasksBy = group(
    (tasksRes.data ?? []) as {
      event_id: string;
      status: string;
      priority: string;
      due_date: string | null;
      title: string;
    }[]
  );
  const linksBy = group(
    (linksRes.data ?? []) as unknown as {
      event_id: string;
      confirmed: boolean;
      suppliers: { name: string } | null;
    }[]
  );
  const txBy = group(
    (txRes.data ?? []) as {
      event_id: string;
      type: string;
      category: string;
      paid: boolean;
      due_date: string | null;
      value: number;
    }[]
  );
  const itemsBy = group((itemsRes.data ?? []) as { event_id: string }[]);

  const result: Record<string, EventoCardData> = {};

  for (const ev of events) {
    const tasks = tasksBy.get(ev.id) ?? [];
    const links = linksBy.get(ev.id) ?? [];
    const tx = txBy.get(ev.id) ?? [];
    const items = itemsBy.get(ev.id) ?? [];

    // --- Saúde (mesmo cálculo do resto do sistema) ---
    const receitasNaoPagas = tx.filter(
      (t) => t.type === "receita" && !t.paid && t.due_date
    );
    const vencidas = receitasNaoPagas.filter((t) => t.due_date! < hoje);
    let diasMaisVencida: number | null = null;
    for (const t of vencidas) {
      const d = differenceInCalendarDays(
        new Date(`${hoje}T00:00:00`),
        new Date(`${t.due_date}T00:00:00`)
      );
      if (diasMaisVencida === null || d > diasMaisVencida) diasMaisVencida = d;
    }
    const fornecedoresTotal = links.length;
    const fornecedoresConfirmados = links.filter((l) => l.confirmed).length;

    const saude = calcularSaudeEvento({
      tarefasTotal: tasks.length,
      tarefasConcluidas: tasks.filter((t) => t.status === "concluido").length,
      fornecedoresTotal,
      fornecedoresConfirmados,
      parcelasVencidas: vencidas.length,
      diasParcelaMaisVencida: diasMaisVencida,
      roteiroItens: items.length,
    });

    // --- Próxima ação (regra de prioridade) ---
    // 1. parcela vencida ou vencendo em até 2 dias (a de vencimento mais próximo)
    const parcelaUrgente = receitasNaoPagas
      .filter((t) => t.due_date! <= em2)
      .sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];

    // 2. fornecedor pendente com evento em até 7 dias
    const eventoEmBreve = ev.date >= hoje && ev.date <= em7;
    const fornecedorPendente = eventoEmBreve
      ? links.find((l) => !l.confirmed && l.suppliers)?.suppliers?.name ?? null
      : null;

    // 3. tarefa de alta prioridade vencendo hoje ou atrasada
    const tarefaUrgente = tasks
      .filter(
        (t) =>
          t.priority === "alta" &&
          t.status !== "concluido" &&
          t.due_date &&
          t.due_date <= hoje
      )
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0];

    const proximaAcao = calcularProximaAcao({
      hojeIso: hoje,
      em2diasIso: em2,
      em7diasIso: em7,
      eventoDate: ev.date,
      parcelaUrgenteData: parcelaUrgente?.due_date ?? null,
      fornecedorPendenteNome: fornecedorPendente,
      tarefaUrgenteTitulo: tarefaUrgente?.title ?? null,
      cronogramaVazio: items.length === 0,
    });

    // --- Financeiro resumido ---
    const receitas = tx.filter((t) => t.type === "receita");
    const totalReceitas = receitas.reduce((s, t) => s + Number(t.value), 0);
    const recebido = receitas
      .filter((t) => t.paid)
      .reduce((s, t) => s + Number(t.value), 0);
    const entrada = tx.find((t) => t.category === "entrada");
    const proximaParcela = receitas
      .filter((t) => !t.paid && t.due_date && t.due_date >= hoje)
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0];

    result[ev.id] = {
      saude,
      proximaAcao,
      fornecedoresConfirmados,
      fornecedoresTotal,
      financeiro: {
        temReceitas: receitas.length > 0,
        pagoPct:
          totalReceitas > 0 ? Math.round((recebido / totalReceitas) * 100) : 0,
        entradaPaga: entrada ? entrada.paid : null,
        proximaParcelaData: proximaParcela?.due_date ?? null,
      },
    };
  }

  return result;
}
