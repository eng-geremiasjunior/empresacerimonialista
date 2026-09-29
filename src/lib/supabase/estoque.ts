import "server-only";

// O estoque da empresa (184) — leituras pela sessão (RLS por cargo). A
// conta mora em estoque-core.ts; aqui só se lê e se normaliza.

import { createClient } from "@/lib/supabase/server";
import type {
  CategoriaEstoque,
  ConflitoDeEstoque,
  ItemEstoque,
  ReservaDoEvento,
} from "@/lib/estoque-core";

const num = (v: number | string | null | undefined): number => (v == null ? 0 : Number(v));
const numOuNulo = (v: number | string | null | undefined): number | null => (v == null ? null : Number(v));
const umObjeto = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/** A 184 ainda não foi aplicada: a tela avisa em vez de cair. */
function migracaoAusente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    /could not find|does not exist/i.test(error.message ?? "")
  );
}

type CategoriaRow = { id: string; nome: string; reutilizavel: boolean; ordem: number };
type ItemRow = {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  categoria_id: string | null;
  minimo: number | string | null;
  custo_unitario: number | string | null;
  validade: string | null;
  observacao: string | null;
  ativo: boolean;
};
type SaldoRow = {
  item_id: string;
  saldo: number | string;
  entradas: number | string;
  reservado: number | string;
  fora: number | string;
  disponivel_hoje: number | string | null;
  minimo_efetivo: number | string;
  abaixo_do_minimo: boolean;
  ultimo_custo: number | string | null;
  reservas_abertas: number;
};

export type EstoqueDaEmpresa = {
  categorias: CategoriaEstoque[];
  itens: ItemEstoque[];
  migracaoPendente: boolean;
};

export async function getEstoque(): Promise<EstoqueDaEmpresa> {
  const supabase = createClient();
  const [cats, itens, saldos] = await Promise.all([
    supabase.from("estoque_categoria").select("id, nome, reutilizavel, ordem").order("ordem").order("nome"),
    supabase
      .from("estoque_item")
      .select("id, codigo, nome, unidade, categoria_id, minimo, custo_unitario, validade, observacao, ativo")
      .order("nome"),
    supabase.rpc("estoque_saldos"),
  ]);
  if (migracaoAusente(cats.error) || migracaoAusente(itens.error) || migracaoAusente(saldos.error)) {
    return { categorias: [], itens: [], migracaoPendente: true };
  }
  if (cats.error || itens.error || saldos.error) {
    console.error("[eorganizei:estoque]", (cats.error ?? itens.error ?? saldos.error)?.message);
  }

  const porItem = new Map<string, SaldoRow>();
  for (const s of (saldos.data ?? []) as SaldoRow[]) porItem.set(s.item_id, s);
  const contagem = new Map<string, number>();
  for (const i of (itens.data ?? []) as ItemRow[]) {
    if (i.categoria_id && i.ativo) contagem.set(i.categoria_id, (contagem.get(i.categoria_id) ?? 0) + 1);
  }
  const categorias: CategoriaEstoque[] = ((cats.data ?? []) as CategoriaRow[]).map((c) => ({
    id: c.id,
    nome: c.nome,
    reutilizavel: c.reutilizavel,
    ordem: c.ordem,
    itens: contagem.get(c.id) ?? 0,
  }));
  const catPorId = new Map(categorias.map((c) => [c.id, c]));

  const lista: ItemEstoque[] = ((itens.data ?? []) as ItemRow[]).map((i) => {
    const s = porItem.get(i.id);
    const cat = i.categoria_id ? catPorId.get(i.categoria_id) ?? null : null;
    const saldo = num(s?.saldo);
    return {
      id: i.id,
      codigo: i.codigo,
      nome: i.nome,
      unidade: i.unidade,
      categoriaId: i.categoria_id,
      categoriaNome: cat?.nome ?? null,
      reutilizavel: cat?.reutilizavel ?? true,
      minimo: numOuNulo(i.minimo),
      custoUnitario: numOuNulo(i.custo_unitario) ?? numOuNulo(s?.ultimo_custo),
      validade: i.validade,
      observacao: i.observacao,
      ativo: i.ativo,
      saldo,
      entradas: num(s?.entradas),
      reservado: num(s?.reservado),
      fora: num(s?.fora),
      disponivelHoje: s?.disponivel_hoje == null ? saldo : Number(s.disponivel_hoje),
      minimoEfetivo: num(s?.minimo_efetivo),
      abaixoDoMinimo: !!s?.abaixo_do_minimo,
      reservasAbertas: s?.reservas_abertas ?? 0,
    };
  });

  return { categorias, itens: lista, migracaoPendente: false };
}

type ReservaRow = {
  id: string;
  item_id: string;
  quantidade: number | string;
  separado_em: string | null;
  fechado_em: string | null;
  devolvido: number | string | null;
  consumido: number | string | null;
  perdido: number | string | null;
  evento_recurso_id: string | null;
  estoque_item:
    | { nome: string; unidade: string; estoque_categoria: { nome: string; ordem: number; reutilizavel: boolean } | { nome: string; ordem: number; reutilizavel: boolean }[] | null }
    | { nome: string; unidade: string; estoque_categoria: { nome: string; ordem: number; reutilizavel: boolean } | { nome: string; ordem: number; reutilizavel: boolean }[] | null }[]
    | null;
};

function paraReserva(r: ReservaRow): ReservaDoEvento {
  const item = umObjeto(r.estoque_item);
  const cat = umObjeto(item?.estoque_categoria);
  return {
    id: r.id,
    itemId: r.item_id,
    itemNome: item?.nome ?? "Item",
    unidade: item?.unidade ?? "unidades",
    categoriaNome: cat?.nome ?? null,
    categoriaOrdem: cat?.ordem ?? 9999,
    reutilizavel: cat?.reutilizavel ?? true,
    quantidade: num(r.quantidade),
    separadoEm: r.separado_em,
    fechadoEm: r.fechado_em,
    devolvido: numOuNulo(r.devolvido),
    consumido: numOuNulo(r.consumido),
    perdido: numOuNulo(r.perdido),
    eventoRecursoId: r.evento_recurso_id,
  };
}

const SELECT_RESERVA = `
  id, item_id, quantidade, separado_em, fechado_em, devolvido, consumido, perdido, evento_recurso_id,
  estoque_item ( nome, unidade, estoque_categoria ( nome, ordem, reutilizavel ) )
`;

/** O que vai para este evento, na ordem das categorias (a da separação). */
export async function getReservasDoEvento(eventId: string): Promise<ReservaDoEvento[]> {
  const { data, error } = await createClient()
    .from("estoque_reserva")
    .select(SELECT_RESERVA)
    .eq("event_id", eventId);
  if (error) {
    if (!migracaoAusente(error)) console.error("[eorganizei:estoque] reservas:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as ReservaRow[])
    .map(paraReserva)
    .sort((a, b) => a.categoriaOrdem - b.categoriaOrdem || a.itemNome.localeCompare(b.itemNome, "pt"));
}

export async function getConflitosDoEvento(eventId: string): Promise<ConflitoDeEstoque[]> {
  const { data, error } = await createClient().rpc("estoque_conflitos", { p_event_id: eventId });
  if (error) {
    if (!migracaoAusente(error)) console.error("[eorganizei:estoque] conflitos:", error.message);
    return [];
  }
  return ((data ?? []) as { item_id: string; item_nome: string; pedido: number | string; saldo: number | string; falta: number | string; com_quem: string | null }[]).map((c) => ({
    itemId: c.item_id,
    itemNome: c.item_nome,
    pedido: num(c.pedido),
    saldo: num(c.saldo),
    falta: num(c.falta),
    comQuem: c.com_quem,
  }));
}

/** O disponível de um item numa data (null = item de outra empresa). */
export async function getDisponivel(itemId: string, dataIso: string): Promise<number | null> {
  const { data, error } = await createClient().rpc("estoque_disponivel", { p_item: itemId, p_data: dataIso });
  if (error) return null;
  return data == null ? null : Number(data);
}

export type EventoComReserva = {
  id: string;
  nome: string;
  data: string;
  itens: number;
  separados: number;
  fechados: number;
  conflitos: ConflitoDeEstoque[];
};

/** Os eventos com reserva aberta: próximos e os que já passaram sem fechar. */
export async function getEventosComReserva(): Promise<EventoComReserva[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("estoque_reserva")
    .select("event_id, separado_em, fechado_em, events ( id, name, date, status, clients ( name ) )")
    .is("fechado_em", null);
  if (error) {
    if (!migracaoAusente(error)) console.error("[eorganizei:estoque] por evento:", error.message);
    return [];
  }
  type Linha = {
    event_id: string;
    separado_em: string | null;
    fechado_em: string | null;
    events: { id: string; name: string | null; date: string; status: string; clients: { name: string } | { name: string }[] | null } | null;
  };
  const porEvento = new Map<string, EventoComReserva>();
  for (const l of (data ?? []) as unknown as Linha[]) {
    const ev = umObjeto(l.events);
    if (!ev || !["orcamento", "confirmado"].includes(ev.status)) continue;
    const atual = porEvento.get(ev.id) ?? {
      id: ev.id,
      nome: ev.name || umObjeto(ev.clients)?.name || "Evento",
      data: ev.date,
      itens: 0,
      separados: 0,
      fechados: 0,
      conflitos: [],
    };
    atual.itens++;
    if (l.separado_em) atual.separados++;
    porEvento.set(ev.id, atual);
  }
  const lista = [...porEvento.values()].sort((a, b) => a.data.localeCompare(b.data));
  await Promise.all(lista.map(async (e) => (e.conflitos = await getConflitosDoEvento(e.id))));
  return lista;
}

export type MovimentoDoItem = {
  id: string;
  tipo: "entrada" | "baixa" | "perda" | "ajuste";
  quantidade: number;
  custoUnitario: number | null;
  motivo: string | null;
  quando: string;
  eventoNome: string | null;
  compraId: string | null;
};

/** O histórico de um item (os 60 últimos movimentos). */
export async function getHistoricoDoItem(itemId: string): Promise<MovimentoDoItem[]> {
  const { data, error } = await createClient()
    .from("estoque_movimento")
    .select("id, tipo, quantidade, custo_unitario, motivo, created_at, compra_id, events ( name, clients ( name ) )")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return [];
  type Linha = {
    id: string;
    tipo: MovimentoDoItem["tipo"];
    quantidade: number | string;
    custo_unitario: number | string | null;
    motivo: string | null;
    created_at: string;
    compra_id: string | null;
    events: { name: string | null; clients: { name: string } | { name: string }[] | null } | { name: string | null; clients: { name: string } | { name: string }[] | null }[] | null;
  };
  return ((data ?? []) as unknown as Linha[]).map((m) => {
    const ev = umObjeto(m.events);
    return {
      id: m.id,
      tipo: m.tipo,
      quantidade: num(m.quantidade),
      custoUnitario: numOuNulo(m.custo_unitario),
      motivo: m.motivo,
      quando: m.created_at,
      eventoNome: ev ? ev.name || umObjeto(ev.clients)?.name || "evento" : null,
      compraId: m.compra_id,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Compras (fatia 2)                                                    */
/* ------------------------------------------------------------------ */

export type CompraDoEstoque = {
  id: string;
  data: string;
  fornecedorNome: string | null;
  numeroNota: string | null;
  chaveNfe: string | null;
  total: number;
  origem: "xml" | "pdf" | "foto" | "planilha" | "manual";
  documentoPath: string | null;
  lancamentoId: string | null;
  lancadaFora: boolean;
  itens: number;
  /** os três primeiros nomes, para a linha da lista */
  resumo: string;
  criadaEm: string;
};

type CompraRow = {
  id: string;
  data: string;
  fornecedor_nome: string | null;
  numero_nota: string | null;
  chave_nfe: string | null;
  total: number | string;
  origem: CompraDoEstoque["origem"];
  documento_path: string | null;
  lancamento_id: string | null;
  lancada_fora: boolean;
  created_at: string;
};

async function comprasComItens(rows: CompraRow[]): Promise<CompraDoEstoque[]> {
  if (rows.length === 0) return [];
  const { data: movs } = await createClient()
    .from("estoque_movimento")
    .select("compra_id, quantidade, estoque_item ( nome )")
    .in("compra_id", rows.map((r) => r.id));
  type M = { compra_id: string; quantidade: number | string; estoque_item: { nome: string } | { nome: string }[] | null };
  const porCompra = new Map<string, string[]>();
  for (const m of (movs ?? []) as unknown as M[]) {
    const nome = umObjeto(m.estoque_item)?.nome ?? "item";
    const l = porCompra.get(m.compra_id) ?? [];
    l.push(nome);
    porCompra.set(m.compra_id, l);
  }
  return rows.map((r) => {
    const nomes = porCompra.get(r.id) ?? [];
    return {
      id: r.id,
      data: r.data,
      fornecedorNome: r.fornecedor_nome,
      numeroNota: r.numero_nota,
      chaveNfe: r.chave_nfe,
      total: num(r.total),
      origem: r.origem,
      documentoPath: r.documento_path,
      lancamentoId: r.lancamento_id,
      lancadaFora: r.lancada_fora,
      itens: nomes.length,
      resumo: nomes.slice(0, 3).join(", ") + (nomes.length > 3 ? ` e mais ${nomes.length - 3}` : ""),
      criadaEm: r.created_at,
    };
  });
}

const SELECT_COMPRA = "id, data, fornecedor_nome, numero_nota, chave_nfe, total, origem, documento_path, lancamento_id, lancada_fora, created_at";

/** As últimas 100 compras. */
export async function getCompras(): Promise<{ compras: CompraDoEstoque[]; migracaoPendente: boolean }> {
  const { data, error } = await createClient()
    .from("estoque_compra")
    .select(SELECT_COMPRA)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (migracaoAusente(error)) return { compras: [], migracaoPendente: true };
    console.error("[eorganizei:estoque] compras:", error.message);
    return { compras: [], migracaoPendente: false };
  }
  return { compras: await comprasComItens((data ?? []) as CompraRow[]), migracaoPendente: false };
}

/** As compras que ainda não viraram lançamento no Financeiro da empresa. */
export async function getComprasALancar(): Promise<CompraDoEstoque[]> {
  const { data, error } = await createClient()
    .from("estoque_compra")
    .select(SELECT_COMPRA)
    .is("lancamento_id", null)
    .eq("lancada_fora", false)
    .order("data", { ascending: false })
    .limit(50);
  if (error) return [];
  return comprasComItens((data ?? []) as CompraRow[]);
}
