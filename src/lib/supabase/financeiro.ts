// Financeiro DOS EVENTOS (tabela transactions, vinculada a event_id).
// O financeiro da empresa vive em financeiro-empresa.ts
// (business_transactions) — módulos paralelos, nunca misturar.

import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/types";

export type Transacao = {
  id: string;
  event_id: string;
  type: "receita" | "despesa";
  description: string | null;
  category: string;
  value: number;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  installment_number: number | null;
  installment_total: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  event_label: string | null;
};

const TX_COLUMNS =
  "id, event_id, type, description, category, value, due_date, paid, paid_at, payment_method, installment_number, installment_total, supplier_id, suppliers(name), events(type, clients(name))";

function mapRow(row: unknown): Transacao {
  const r = row as {
    id: string;
    event_id: string;
    type: "receita" | "despesa";
    description: string | null;
    category: string;
    value: number;
    due_date: string | null;
    paid: boolean;
    paid_at: string | null;
    payment_method: string | null;
    installment_number: number | null;
    installment_total: number | null;
    supplier_id: string | null;
    suppliers: { name: string } | null;
    events: { type: EventType; clients: { name: string } | null } | null;
  };
  return {
    id: r.id,
    event_id: r.event_id,
    type: r.type,
    description: r.description,
    category: r.category,
    value: Number(r.value),
    due_date: r.due_date,
    paid: r.paid,
    paid_at: r.paid_at,
    payment_method: r.payment_method,
    installment_number: r.installment_number,
    installment_total: r.installment_total,
    supplier_id: r.supplier_id,
    supplier_name: r.suppliers?.name ?? null,
    event_label: r.events
      ? `${EVENT_TYPE_LABELS[r.events.type]} — ${r.events.clients?.name ?? "Sem cliente"}`
      : null,
  };
}

// ------------------------------------------------------------
// Aba Financeiro do evento
// ------------------------------------------------------------

export type FinanceiroEvento = {
  contrato: number | null;
  recebido: number;
  aReceber: number;
  despesasTotal: number;
  receitas: Transacao[];
  despesas: Transacao[];
  migrationPendente: boolean;
};

export async function getFinanceiroEvento(
  eventId: string
): Promise<FinanceiroEvento> {
  const supabase = createClient();

  const [evRes, txRes] = await Promise.all([
    supabase.from("events").select("contract_value").eq("id", eventId).single(),
    supabase
      .from("transactions")
      .select(TX_COLUMNS)
      .eq("event_id", eventId)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  // Coluna nova ausente (42703) ou FK do supplier_id inexistente (PGRST200)
  // => migração 017 pendente (página degrada com aviso).
  const migrationPendente =
    txRes.error?.code === "42703" || txRes.error?.code === "PGRST200";
  const rows = migrationPendente ? [] : (txRes.data ?? []).map(mapRow);

  const receitas = rows.filter((t) => t.type === "receita");
  const despesas = rows.filter((t) => t.type === "despesa");

  return {
    contrato:
      (evRes.data as { contract_value: number | null } | null)
        ?.contract_value ?? null,
    recebido: receitas.filter((t) => t.paid).reduce((s, t) => s + t.value, 0),
    aReceber: receitas.filter((t) => !t.paid).reduce((s, t) => s + t.value, 0),
    despesasTotal: despesas.reduce((s, t) => s + t.value, 0),
    receitas,
    despesas,
    migrationPendente,
  };
}

// A antiga página global /financeiro (agregação de eventos) foi
// substituída pelo Financeiro da Empresa — ver financeiro-empresa.ts.
