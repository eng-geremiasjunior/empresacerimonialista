// Queries server-side do módulo Fornecedores: listagem com busca/filtros/
// paginação, detalhe e categorias em uso. CRUD fica nas server actions.

import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import type { Fornecedor } from "@/lib/fornecedores-shared";
import type { FornecedoresParams } from "@/lib/fornecedores-url";

const PER_PAGE_OPTIONS = [20, 50, 100];

const COLUMNS =
  "id, name, descricao, tipo_operacional, status, faixa_preco, phone, whatsapp, email, cpf, endereco, cidade";

type Row = Omit<Fornecedor, "categorias"> & {
  supplier_categorias: { categoria: string }[] | null;
};

function mapRow(row: unknown): Fornecedor {
  const r = row as Row;
  return {
    id: r.id,
    name: r.name,
    descricao: r.descricao,
    tipo_operacional: r.tipo_operacional,
    status: r.status,
    faixa_preco: r.faixa_preco,
    phone: r.phone,
    whatsapp: r.whatsapp,
    email: r.email,
    cpf: r.cpf,
    endereco: r.endereco,
    cidade: r.cidade,
    categorias: (r.supplier_categorias ?? []).map((c) => c.categoria),
  };
}

export type FornecedoresListResult = {
  rows: Fornecedor[];
  total: number;
  migrationPendente: boolean;
};

function sanitize(q: string) {
  return q.trim().replace(/[,()]/g, "");
}

// Nº de eventos vinculados (via roteiro_links) para um conjunto de
// fornecedores. Uma query, agregado em memória.
async function contarEventosPorFornecedor(
  supabase: ReturnType<typeof createClient>,
  supplierIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (supplierIds.length === 0) return counts;
  const { data } = await supabase
    .from("roteiro_links")
    .select("supplier_id")
    .in("supplier_id", supplierIds);
  for (const r of (data ?? []) as { supplier_id: string }[]) {
    counts.set(r.supplier_id, (counts.get(r.supplier_id) ?? 0) + 1);
  }
  return counts;
}

export async function getFornecedoresList(
  params: FornecedoresParams
): Promise<FornecedoresListResult> {
  const supabase = createClient();

  const perPage = PER_PAGE_OPTIONS.includes(Number(params.perPage))
    ? Number(params.perPage)
    : 20;
  const page = Math.max(1, Number(params.page) || 1);

  const q = sanitize(params.q);

  // Se filtrar por categoria, primeiro descobrimos os supplier_ids que
  // têm alguma das categorias pedidas (join manual — evita duplicar linhas).
  let idsPorCategoria: string[] | null = null;
  const categorias = params.categoria
    ? params.categoria.split(",").filter(Boolean)
    : [];
  if (categorias.length > 0) {
    const { data: catRows } = await supabase
      .from("supplier_categorias")
      .select("supplier_id")
      .in("categoria", categorias);
    idsPorCategoria = [
      ...new Set((catRows ?? []).map((c) => c.supplier_id as string)),
    ];
    if (idsPorCategoria.length === 0) {
      return { rows: [], total: 0, migrationPendente: false };
    }
  }

  // Busca todos os fornecedores que casam com os filtros (o RLS já limita
  // à empresa). Contagem de eventos e ordenação "mais usados" precisam do
  // conjunto completo; a paginação é feita em memória. Volume esperado
  // (dezenas a poucas centenas) torna isso barato.
  let query = supabase
    .from("suppliers")
    .select(`${COLUMNS}, supplier_categorias(categoria)`)
    .limit(2000);

  if (params.tipo) query = query.eq("tipo_operacional", params.tipo);
  if (params.status) query = query.eq("status", params.status);
  if (params.faixa) query = query.eq("faixa_preco", params.faixa);
  if (idsPorCategoria) query = query.in("id", idsPorCategoria);
  if (q) query = query.or(`name.ilike.%${q}%,descricao.ilike.%${q}%`);

  const { data, error } = await query;

  const migrationPendente =
    error?.code === "42703" || error?.code === "PGRST200";
  if (migrationPendente) {
    return { rows: [], total: 0, migrationPendente: true };
  }

  const todos = (data ?? []).map(mapRow);
  const counts = await contarEventosPorFornecedor(
    supabase,
    todos.map((f) => f.id)
  );
  for (const f of todos) f.eventos_atendidos = counts.get(f.id) ?? 0;

  // Ordenação: "eventos" (mais usados, desc) ou nome (default).
  todos.sort((a, b) =>
    params.sort === "eventos"
      ? (b.eventos_atendidos ?? 0) - (a.eventos_atendidos ?? 0) ||
        a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name)
  );

  const total = todos.length;
  const inicio = (page - 1) * perPage;
  const rows = todos.slice(inicio, inicio + perPage);

  return { rows, total, migrationPendente: false };
}

export async function getFornecedor(id: string): Promise<Fornecedor | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("suppliers")
    .select(`${COLUMNS}, supplier_categorias(categoria)`)
    .eq("id", id)
    .maybeSingle();
  return data ? mapRow(data) : null;
}

// ------------------------------------------------------------
// Histórico do fornecedor (página de detalhe) — dados reais via
// roteiro_links (vínculo evento↔fornecedor). Nada de mock.
// ------------------------------------------------------------

export type EventoDoFornecedor = {
  id: string;
  label: string;
  date: string;
  status: string;
  confirmado: boolean;
  futuro: boolean;
};

export type HistoricoFornecedor = {
  eventosAtendidos: number;
  proximoEvento: EventoDoFornecedor | null;
  ultimoEvento: EventoDoFornecedor | null;
  // % de eventos em que o fornecedor confirmou presença (roteiro_links.confirmed).
  // null quando não há eventos (não faz sentido calcular).
  taxaConfirmacao: number | null;
  totalConfirmados: number;
  eventos: EventoDoFornecedor[];
};

export async function getHistoricoFornecedor(
  supplierId: string
): Promise<HistoricoFornecedor> {
  const supabase = createClient();
  const hoje = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const { data } = await supabase
    .from("roteiro_links")
    .select("confirmed, events(id, type, date, status, clients(name))")
    .eq("supplier_id", supplierId);

  const rows = (data ?? []) as unknown as {
    confirmed: boolean;
    events: {
      id: string;
      type: EventType;
      date: string;
      status: string;
      clients: { name: string } | null;
    } | null;
  }[];

  const eventos: EventoDoFornecedor[] = rows
    .filter((r) => r.events)
    .map((r) => ({
      id: r.events!.id,
      label: `${EVENT_TYPE_LABELS[r.events!.type] ?? r.events!.type} — ${r.events!.clients?.name ?? "Sem cliente"}`,
      date: r.events!.date,
      status: r.events!.status,
      confirmado: r.confirmed,
      futuro: r.events!.date >= hojeIso,
    }))
    // Mais próximo/recente primeiro: futuros ascendentes, depois passados desc.
    .sort((a, b) => {
      if (a.futuro !== b.futuro) return a.futuro ? -1 : 1;
      return a.futuro
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    });

  const futuros = eventos.filter((e) => e.futuro);
  const passados = eventos.filter((e) => !e.futuro);
  const totalConfirmados = eventos.filter((e) => e.confirmado).length;

  return {
    eventosAtendidos: eventos.length,
    proximoEvento: futuros[0] ?? null,
    ultimoEvento: passados[0] ?? null,
    taxaConfirmacao:
      eventos.length > 0
        ? Math.round((totalConfirmados / eventos.length) * 100)
        : null,
    totalConfirmados,
    eventos,
  };
}

// Categorias distintas já em uso na empresa (para popular o filtro).
export async function getCategoriasEmUso(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("supplier_categorias")
    .select("categoria");
  return [...new Set((data ?? []).map((c) => c.categoria as string))].sort();
}
