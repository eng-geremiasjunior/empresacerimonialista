// Query de servidor dos recursos do evento — a conta mora em
// recursos-core.ts (puro, client-safe); aqui só se lê e se normaliza.

import { createClient } from "@/lib/supabase/server";
import type { OrigemSuprimento, Recurso, RegraRecurso, ReservaDoRecurso } from "@/lib/recursos-core";

const umObjeto = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

const num = (v: number | string | null | undefined): number | null =>
  v == null ? null : Number(v);

type ReservaRow = {
  id: string;
  item_id: string;
  quantidade: number | string;
  separado_em: string | null;
  fechado_em: string | null;
  devolvido: number | string | null;
  consumido: number | string | null;
  perdido: number | string | null;
  estoque_item:
    | { nome: string; estoque_categoria: { reutilizavel: boolean } | { reutilizavel: boolean }[] | null }
    | { nome: string; estoque_categoria: { reutilizavel: boolean } | { reutilizavel: boolean }[] | null }[]
    | null;
};

type RecursoRow = {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  regra: string;
  indice: number | string;
  base_quantidade: number | null;
  base_origem: string | null;
  previsto: number | string | null;
  comprado: number | string | null;
  entrada: number | string | null;
  sobra: number | string | null;
  custo_unitario: number | string | null;
  acabou_em: string | null;
  supplier_id: string | null;
  observacao: string | null;
  ordem: number | null;
  suppliers: { name: string } | { name: string }[] | null;
  evento_objetivo: { nome: string } | { nome: string }[] | null;
  // 184 — ausentes enquanto a migração não foi aplicada
  origem_suprimento?: string | null;
  compravel?: boolean | null;
  estoque_reserva?: ReservaRow | ReservaRow[] | null;
};

const SELECT_BASE = `
  id, codigo, nome, unidade, regra, indice,
  base_quantidade, base_origem,
  previsto, comprado, entrada, sobra,
  custo_unitario, acabou_em, supplier_id, observacao, ordem,
  suppliers ( name ),
  evento_objetivo ( nome )
`;

// a 184: de onde o item vem e a reserva do estoque que o supre
const SELECT_184 = `${SELECT_BASE},
  origem_suprimento, compravel,
  estoque_reserva ( id, item_id, quantidade, separado_em, fechado_em, devolvido, consumido, perdido,
    estoque_item ( nome, estoque_categoria ( reutilizavel ) ) )
`;

function paraReserva(r: ReservaRow | null): ReservaDoRecurso | null {
  if (!r) return null;
  const item = umObjeto(r.estoque_item);
  const cat = umObjeto(item?.estoque_categoria);
  return {
    id: r.id,
    itemId: r.item_id,
    itemNome: item?.nome ?? "Item do estoque",
    reutilizavel: cat?.reutilizavel ?? true,
    quantidade: Number(r.quantidade),
    separadoEm: r.separado_em,
    fechadoEm: r.fechado_em,
    devolvido: num(r.devolvido),
    consumido: num(r.consumido),
    perdido: num(r.perdido),
  };
}

function paraRecurso(r: RecursoRow): Recurso {
  const origem = r.origem_suprimento;
  return {
    id: r.id,
    codigo: r.codigo,
    nome: r.nome,
    unidade: r.unidade,
    regra: (r.regra as RegraRecurso) ?? "por_pessoa",
    indice: Number(r.indice ?? 0),
    baseQuantidade: r.base_quantidade,
    baseOrigem: r.base_origem,
    previsto: num(r.previsto),
    comprado: num(r.comprado),
    entrada: num(r.entrada),
    sobra: num(r.sobra),
    custoUnitario: num(r.custo_unitario),
    acabouEm: r.acabou_em ? r.acabou_em.slice(0, 5) : null,
    supplierId: r.supplier_id,
    fornecedorNome: umObjeto(r.suppliers)?.name ?? null,
    observacao: r.observacao,
    grupo: umObjeto(r.evento_objetivo)?.nome ?? null,
    ordem: r.ordem ?? 0,
    origemSuprimento:
      origem === "estoque" || origem === "fornecedor" ? (origem as OrigemSuprimento) : "compra",
    compravel: r.compravel ?? true,
    reserva: paraReserva(umObjeto(r.estoque_reserva)),
  };
}

/** Todos os recursos do evento, na ordem do método. */
export async function getRecursos(eventId: string): Promise<Recurso[]> {
  const supabase = createClient();
  const consulta = (select: string) =>
    supabase
      .from("evento_recurso")
      .select(select)
      .eq("event_id", eventId)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

  let { data, error } = await consulta(SELECT_184);
  // sem a 184 as colunas e a relação não existem: lê como antes
  if (error && /origem_suprimento|compravel|estoque_reserva|relationship/i.test(error.message ?? "")) {
    ({ data, error } = await consulta(SELECT_BASE));
  }
  if (error) {
    console.error("[vela:recursos]", error.message);
    return [];
  }
  return ((data ?? []) as unknown as RecursoRow[]).map(paraRecurso);
}

/**
 * O público que dimensiona, com a origem — a tela precisa DIZER se
 * usou a lista confirmada ou a estimativa, senão a precedência vira
 * mágica silenciosa.
 */
export async function getPublico(
  eventId: string
): Promise<{ quantidade: number; origem: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("publico_do_evento", {
    p_event_id: eventId,
  });
  if (error) {
    console.error("[vela:recursos] publico:", error.message);
    return null;
  }
  const linha = (data as { quantidade: number; origem: string }[] | null)?.[0];
  return linha ?? null;
}

export type HistoricoConsumo = {
  n: number;
  medianaPorPessoa: number | null;
  ultimoPorPessoa: number | null;
  ultimoIndice: number | null;
  ultimoEvento: string | null;
  ultimaData: string | null;
};

/**
 * A média (mediana) de consumo por pessoa dos eventos anteriores.
 * A regra da tela é n >= 3: abaixo disso o número não sugere nada, só
 * mostra o histórico bruto.
 */
export async function getHistoricoConsumo(
  codigo: string,
  tipoEvento: string | null
): Promise<HistoricoConsumo | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("consumo_do_historico", {
    p_codigo: codigo,
    p_tipo_evento: tipoEvento,
  });
  if (error) {
    console.error("[vela:recursos] historico:", error.message);
    return null;
  }
  const l = (data as Record<string, unknown>[] | null)?.[0];
  if (!l) return null;
  return {
    n: Number(l.n ?? 0),
    medianaPorPessoa: l.mediana_por_pessoa == null ? null : Number(l.mediana_por_pessoa),
    ultimoPorPessoa: l.ultimo_por_pessoa == null ? null : Number(l.ultimo_por_pessoa),
    ultimoIndice: l.ultimo_indice == null ? null : Number(l.ultimo_indice),
    ultimoEvento: (l.ultimo_evento as string) ?? null,
    ultimaData: (l.ultima_data as string) ?? null,
  };
}

/** Um item do acervo como a Operação o vê: saldo e o disponível na data da festa. */
export type ItemParaOperacao = {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  categoriaNome: string | null;
  reutilizavel: boolean;
  saldo: number;
  disponivel: number;
};

/**
 * Os itens ativos do estoque com o disponível na data do evento. Lista
 * vazia quando a 184 não foi aplicada — a Operação então não oferece
 * "usar do estoque", e nada mais muda.
 */
export async function getItensParaOperacao(eventoData: string | null): Promise<ItemParaOperacao[]> {
  const supabase = createClient();
  const [{ data: itens, error }, { data: saldos }] = await Promise.all([
    supabase
      .from("estoque_item")
      .select("id, codigo, nome, unidade, estoque_categoria ( nome, reutilizavel )")
      .eq("ativo", true)
      .order("nome"),
    supabase.rpc("estoque_saldos"),
  ]);
  if (error || !itens?.length) return [];
  const saldoPorItem = new Map<string, number>();
  for (const s of (saldos ?? []) as { item_id: string; saldo: number | string }[]) {
    saldoPorItem.set(s.item_id, Number(s.saldo));
  }
  type L = { id: string; codigo: string; nome: string; unidade: string; estoque_categoria: { nome: string; reutilizavel: boolean } | { nome: string; reutilizavel: boolean }[] | null };
  const lista = (itens as unknown as L[]).map((i) => {
    const cat = umObjeto(i.estoque_categoria);
    return {
      id: i.id,
      codigo: i.codigo,
      nome: i.nome,
      unidade: i.unidade,
      categoriaNome: cat?.nome ?? null,
      reutilizavel: cat?.reutilizavel ?? true,
      saldo: saldoPorItem.get(i.id) ?? 0,
      disponivel: saldoPorItem.get(i.id) ?? 0,
    };
  });
  if (eventoData) {
    await Promise.all(
      lista.map(async (i) => {
        const { data } = await supabase.rpc("estoque_disponivel", { p_item: i.id, p_data: eventoData });
        if (data != null) i.disponivel = Number(data);
      })
    );
  }
  return lista;
}
