// Financeiro da EMPRESA (business_transactions) — queries server-side.
// Receita própria e despesas operacionais do negócio da cerimonialista.
// Totalmente separado de financeiro.ts, que serve APENAS o financeiro
// de eventos (tabela transactions). Nunca misturar as duas tabelas.
// Tipos e categorias vivem em @/lib/financeiro-empresa-shared (client-safe).

import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { FinanceiroEmpresaParams } from "@/lib/financeiro-empresa-url";
import {
  DESPESAS_FIXAS_SLUGS,
  type BusinessTransacao,
  type DespesaFixaInfo,
  type MesEmpresa,
  type ResumoEmpresa,
  type SaldoEmpresaMes,
} from "@/lib/financeiro-empresa-shared";

export type {
  BusinessTransacao,
  DespesaFixaInfo,
  MesEmpresa,
  ResumoEmpresa,
  SaldoEmpresaMes,
};

const iso = (d: Date) => format(d, "yyyy-MM-dd");

const COLUMNS =
  "id, type, category, description, value, due_date, paid, recurring, created_at";

function mapRow(row: unknown): BusinessTransacao {
  const r = row as BusinessTransacao & { value: number | string };
  return { ...r, value: Number(r.value) };
}

// Tabela ainda não criada (migração 020 pendente)?
// 42P01/42703 = erro direto do Postgres; PGRST205 = tabela ausente no
// schema cache do PostgREST (é o que o Supabase devolve na prática).
const isMigrationError = (code?: string) =>
  code === "42P01" || code === "42703" || code === "PGRST205";

// ------------------------------------------------------------
// Resumo (cards do topo)
// ------------------------------------------------------------

export async function getResumoEmpresa(): Promise<ResumoEmpresa> {
  const supabase = createClient();
  const inicio = iso(startOfMonth(new Date()));
  const fim = iso(endOfMonth(new Date()));

  const { data, error } = await supabase
    .from("business_transactions")
    .select("type, value")
    .gte("due_date", inicio)
    .lte("due_date", fim);

  if (error) {
    return {
      receitaMes: 0,
      despesasMes: 0,
      saldoMes: 0,
      migrationPendente: isMigrationError(error.code),
    };
  }

  const rows = (data ?? []) as { type: string; value: number | string }[];
  const soma = (tipo: string) =>
    rows
      .filter((r) => r.type === tipo)
      .reduce((s, r) => s + Number(r.value), 0);

  const receitaMes = soma("receita");
  const despesasMes = soma("despesa");
  return {
    receitaMes,
    despesasMes,
    saldoMes: receitaMes - despesasMes,
    migrationPendente: false,
  };
}

// ------------------------------------------------------------
// Receitas do mês (seção editável)
// ------------------------------------------------------------

export async function getReceitasEmpresaMes(): Promise<BusinessTransacao[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("business_transactions")
    .select(COLUMNS)
    .eq("type", "receita")
    .gte("due_date", iso(startOfMonth(new Date())))
    .lte("due_date", iso(endOfMonth(new Date())))
    .order("due_date", { ascending: false });

  return (data ?? []).map(mapRow);
}

// ------------------------------------------------------------
// Despesas fixas (atalhos por categoria)
// ------------------------------------------------------------

export async function getDespesasFixas(): Promise<DespesaFixaInfo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("business_transactions")
    .select("category, value, due_date, recurring")
    .eq("type", "despesa")
    .order("due_date", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as {
    category: string;
    value: number | string;
    due_date: string | null;
    recurring: boolean;
  }[];
  const mesAtual = format(new Date(), "yyyy-MM");

  return DESPESAS_FIXAS_SLUGS.map((slug) => {
    const daCategoria = rows.filter((r) => r.category === slug);
    const ultima = daCategoria[0];
    return {
      slug,
      ultimoValor: ultima ? Number(ultima.value) : null,
      ultimaData: ultima?.due_date ?? null,
      recorrente: daCategoria.some((r) => r.recurring),
      lancadaEsteMes: daCategoria.some((r) =>
        r.due_date?.startsWith(mesAtual)
      ),
    };
  });
}

// ------------------------------------------------------------
// Histórico com filtros e paginação
// ------------------------------------------------------------

const PER_PAGE_OPTIONS = [20, 50, 100];

export type HistoricoEmpresaResult = {
  rows: BusinessTransacao[];
  total: number;
};

export async function getHistoricoEmpresa(
  params: FinanceiroEmpresaParams
): Promise<HistoricoEmpresaResult> {
  const supabase = createClient();

  const perPage = PER_PAGE_OPTIONS.includes(Number(params.perPage))
    ? Number(params.perPage)
    : 20;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("business_transactions")
    .select(COLUMNS, { count: "exact" });

  if (params.tipo === "receita" || params.tipo === "despesa") {
    query = query.eq("type", params.tipo);
  }
  if (params.categoria) query = query.eq("category", params.categoria);

  if (params.periodo === "mes") {
    query = query
      .gte("due_date", iso(startOfMonth(new Date())))
      .lte("due_date", iso(endOfMonth(new Date())));
  } else if (
    params.periodo === "custom" &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.to)
  ) {
    query = query.gte("due_date", params.from).lte("due_date", params.to);
  }

  query = query
    .order("due_date", { ascending: false, nullsFirst: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) return { rows: [], total: 0 };

  return { rows: (data ?? []).map(mapRow), total: count ?? 0 };
}

// ------------------------------------------------------------
// Gráfico: receita vs. despesas da empresa, últimos 6 meses
// ------------------------------------------------------------

export async function getEmpresa6Meses(): Promise<MesEmpresa[]> {
  const supabase = createClient();
  const inicio = iso(startOfMonth(subMonths(new Date(), 5)));

  const { data } = await supabase
    .from("business_transactions")
    .select("type, value, due_date")
    .gte("due_date", inicio);

  const rows = (data ?? []) as {
    type: "receita" | "despesa";
    value: number | string;
    due_date: string | null;
  }[];

  const meses: MesEmpresa[] = [];
  for (let i = 5; i >= 0; i--) {
    const base = subMonths(new Date(), i);
    const key = format(base, "yyyy-MM");
    const doMes = rows.filter((r) => r.due_date?.startsWith(key));
    meses.push({
      mes: format(base, "MMM"),
      receita: doMes
        .filter((r) => r.type === "receita")
        .reduce((s, r) => s + Number(r.value), 0),
      despesas: doMes
        .filter((r) => r.type === "despesa")
        .reduce((s, r) => s + Number(r.value), 0),
    });
  }
  return meses;
}

// ------------------------------------------------------------
// Saldo do mês para o card do Dashboard ("Saúde financeira da empresa").
// Retorna null quando a migração 020 ainda não rodou (card se esconde).
// ------------------------------------------------------------

export async function getSaldoEmpresaMes(): Promise<SaldoEmpresaMes> {
  // Exclusivo da proprietária (Etapa 4): para outros cargos o card do
  // dashboard se esconde. Cargo null (sem equipe) mantém o acesso.
  const { getMeuCargo } = await import("@/lib/supabase/equipe");
  const { cargo } = await getMeuCargo();
  if (cargo !== null && cargo !== "proprietaria") return null;

  const resumo = await getResumoEmpresa();
  if (resumo.migrationPendente) return null;
  return {
    receitaMes: resumo.receitaMes,
    despesasMes: resumo.despesasMes,
    saldoMes: resumo.saldoMes,
  };
}
