import { differenceInCalendarDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import {
  calcularSaudeEvento,
  type Saude,
  type SaudeInput,
} from "@/lib/saude-evento";
import { hojeBR } from "@/lib/tempo";

function groupByEvent<T extends { event_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.event_id) ?? [];
    list.push(row);
    map.set(row.event_id, list);
  }
  return map;
}

// Saúde de VÁRIOS eventos em uma leva de 4 queries (não 4×N) — usado pela
// listagem paginada de eventos, onde N pode ser até 100 por página.
// PostgREST corta em 1000 linhas por padrão e NÃO avisa: a resposta
// volta 200, com menos dados. Numa saúde calculada sobre listas
// truncadas o resultado seria só um pouco errado, que é o pior tipo.
// O teto explícito abaixo não resolve o problema — torna o corte
// visível no log quando ele acontecer. A solução de verdade (view ou
// RPC agregada por event_id) fica para quando a base crescer.
const TETO_LINHAS = 5000;

function avisarSeCortou(nome: string, linhas: unknown[] | null) {
  if ((linhas?.length ?? 0) >= TETO_LINHAS) {
    console.error(
      `[vela:saude] ${nome} bateu o teto de ${TETO_LINHAS} linhas — o cálculo saiu incompleto`
    );
  }
}

export async function getSaudeBulk(
  eventIds: string[]
): Promise<Record<string, Saude>> {
  if (eventIds.length === 0) return {};

  const supabase = createClient();
  const todayIso = hojeBR();

  const [tasksRes, linksRes, txRes, itemsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("event_id, status")
      .in("event_id", eventIds)
      .limit(TETO_LINHAS),
    supabase
      .from("roteiro_links")
      // suppliers(id) não é decoração: é a régua do hub. Vínculo cujo
      // cadastro a RLS não devolve não conta como fornecedor — sem isso o
      // anel daqui e o texto do hub discordavam na MESMA página.
      .select("event_id, confirmed, suppliers(id)")
      .in("event_id", eventIds)
      .limit(TETO_LINHAS),
    supabase
      .from("transactions")
      // só RECEITA: "parcela vencida" no texto da saúde sempre quis dizer
      // dinheiro que a cliente não pagou. Sem este filtro, uma despesa em
      // aberto derrubava a saúde aqui e não no cartão do evento — duas
      // contas do MESMO score, divergindo (o print mostrava um evento com
      // anel 100 dentro da lista de "pendentes")
      .select("event_id, due_date, paid, type")
      .eq("type", "receita")
      .in("event_id", eventIds)
      .limit(TETO_LINHAS),
    supabase
      .from("roteiro_items")
      .select("event_id")
      .in("event_id", eventIds)
      .limit(TETO_LINHAS),
  ]);

  avisarSeCortou("tasks", tasksRes.data);
  avisarSeCortou("roteiro_links", linksRes.data);
  avisarSeCortou("transactions", txRes.data);
  avisarSeCortou("roteiro_items", itemsRes.data);

  const tasksBy = groupByEvent(
    (tasksRes.data ?? []) as { event_id: string; status: string }[]
  );
  const linksBy = groupByEvent(
    (
      (linksRes.data ?? []) as unknown as {
        event_id: string;
        confirmed: boolean;
        suppliers: { id: string } | null;
      }[]
    ).filter((l) => l.suppliers)
  );
  const txBy = groupByEvent(
    (txRes.data ?? []) as {
      event_id: string;
      due_date: string | null;
      paid: boolean;
    }[]
  );
  const itemsBy = groupByEvent(
    (itemsRes.data ?? []) as { event_id: string }[]
  );

  const result: Record<string, Saude> = {};
  for (const eventId of eventIds) {
    const tasks = tasksBy.get(eventId) ?? [];
    const links = linksBy.get(eventId) ?? [];
    const tx = txBy.get(eventId) ?? [];
    const items = itemsBy.get(eventId) ?? [];

    const vencidas = tx.filter(
      (t) => !t.paid && t.due_date !== null && t.due_date < todayIso
    );
    let diasMaisVencida: number | null = null;
    for (const t of vencidas) {
      const dias = differenceInCalendarDays(
        new Date(`${todayIso}T00:00:00`),
        new Date(`${t.due_date}T00:00:00`)
      );
      if (diasMaisVencida === null || dias > diasMaisVencida) {
        diasMaisVencida = dias;
      }
    }

    const input: SaudeInput = {
      tarefasTotal: tasks.length,
      tarefasConcluidas: tasks.filter((t) => t.status === "concluido").length,
      fornecedoresTotal: links.length,
      fornecedoresConfirmados: links.filter((l) => l.confirmed).length,
      parcelasVencidas: vencidas.length,
      diasParcelaMaisVencida: diasMaisVencida,
      roteiroItens: items.length,
    };

    result[eventId] = calcularSaudeEvento(input);
  }

  return result;
}

// Saúde de UM evento (hub do evento, dashboard) — reaproveita o bulk.
export async function getSaudeEvento(eventId: string): Promise<Saude> {
  const result = await getSaudeBulk([eventId]);
  return (
    result[eventId] ??
    calcularSaudeEvento({
      tarefasTotal: 0,
      tarefasConcluidas: 0,
      fornecedoresTotal: 0,
      fornecedoresConfirmados: 0,
      parcelasVencidas: 0,
      diasParcelaMaisVencida: null,
      roteiroItens: 0,
    })
  );
}
