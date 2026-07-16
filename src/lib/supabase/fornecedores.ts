// Queries server-side do módulo Fornecedores: listagem com busca/filtros/
// paginação, detalhe e categorias em uso. CRUD fica nas server actions.

import { createClient } from "@/lib/supabase/server";
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

export async function getFornecedoresList(
  params: FornecedoresParams
): Promise<FornecedoresListResult> {
  const supabase = createClient();

  const perPage = PER_PAGE_OPTIONS.includes(Number(params.perPage))
    ? Number(params.perPage)
    : 20;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

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

  let query = supabase
    .from("suppliers")
    .select(`${COLUMNS}, supplier_categorias(categoria)`, { count: "exact" });

  if (params.tipo) query = query.eq("tipo_operacional", params.tipo);
  if (params.status) query = query.eq("status", params.status);
  if (params.faixa) query = query.eq("faixa_preco", params.faixa);
  if (idsPorCategoria) query = query.in("id", idsPorCategoria);
  // Busca varre nome E descrição.
  if (q) query = query.or(`name.ilike.%${q}%,descricao.ilike.%${q}%`);

  query = query.order("name", { ascending: true }).range(from, to);

  const { data, count, error } = await query;

  // Coluna nova ausente (42703) ou relação supplier_categorias ausente
  // (PGRST200) => migração 026 pendente.
  const migrationPendente =
    error?.code === "42703" || error?.code === "PGRST200";

  return {
    rows: migrationPendente ? [] : (data ?? []).map(mapRow),
    total: migrationPendente ? 0 : count ?? 0,
    migrationPendente,
  };
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

// Categorias distintas já em uso na empresa (para popular o filtro).
export async function getCategoriasEmUso(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("supplier_categorias")
    .select("categoria");
  return [...new Set((data ?? []).map((c) => c.categoria as string))].sort();
}
