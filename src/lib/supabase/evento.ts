import { differenceInCalendarDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import {
  calcularSaudeEvento,
  type Saude,
  type SaudeInput,
} from "@/lib/saude-evento";

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
export async function getSaudeBulk(
  eventIds: string[]
): Promise<Record<string, Saude>> {
  if (eventIds.length === 0) return {};

  const supabase = createClient();
  const todayIso = format(new Date(), "yyyy-MM-dd");

  const [tasksRes, linksRes, txRes, itemsRes] = await Promise.all([
    supabase.from("tasks").select("event_id, status").in("event_id", eventIds),
    supabase
      .from("roteiro_links")
      .select("event_id, confirmed")
      .in("event_id", eventIds),
    supabase
      .from("transactions")
      .select("event_id, due_date, paid")
      .in("event_id", eventIds),
    supabase.from("roteiro_items").select("event_id").in("event_id", eventIds),
  ]);

  const tasksBy = groupByEvent(
    (tasksRes.data ?? []) as { event_id: string; status: string }[]
  );
  const linksBy = groupByEvent(
    (linksRes.data ?? []) as { event_id: string; confirmed: boolean }[]
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
