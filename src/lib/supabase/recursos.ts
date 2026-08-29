// Query de servidor dos recursos do evento — a conta mora em
// recursos-core.ts (puro, client-safe); aqui só se lê e se normaliza.

import { createClient } from "@/lib/supabase/server";
import type { Recurso, RegraRecurso } from "@/lib/recursos-core";

const umObjeto = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? v[0] ?? null : v;

const num = (v: number | string | null): number | null =>
  v == null ? null : Number(v);

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
};

const SELECT = `
  id, codigo, nome, unidade, regra, indice,
  base_quantidade, base_origem,
  previsto, comprado, entrada, sobra,
  custo_unitario, acabou_em, supplier_id, observacao, ordem,
  suppliers ( name ),
  evento_objetivo ( nome )
`;

function paraRecurso(r: RecursoRow): Recurso {
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
  };
}

/** Todos os recursos do evento, na ordem do método. */
export async function getRecursos(eventId: string): Promise<Recurso[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_recurso")
    .select(SELECT)
    .eq("event_id", eventId)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

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
