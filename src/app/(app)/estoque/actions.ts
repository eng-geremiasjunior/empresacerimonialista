"use server";

// Ações do Estoque da empresa (184). A RLS por cargo é a guarda real
// (proprietária, coordenadora e cerimonialista escrevem; assistente lê);
// aqui só se grava e se revalida. Um update barrado pela RLS volta sem
// erro e sem linhas — por isso todo update pede `select("id")` de volta.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { codigoDoItem, UNIDADES } from "@/lib/estoque-core";
import { getDisponivel, getHistoricoDoItem, type MovimentoDoItem } from "@/lib/supabase/estoque";
import { usarDoEstoque, type ResultadoDaReserva } from "@/app/(app)/eventos/[id]/operacao/actions";

type Resultado = { error: string } | { success: true; id?: string };

function revalidar() {
  revalidatePath("/estoque");
  revalidatePath("/estoque/eventos");
}

const unidadeLimpa = (u: string) => u.trim().toLowerCase().slice(0, 20) || UNIDADES[0];
const numeroOuNulo = (v: number | null | undefined): number | null =>
  v == null || !Number.isFinite(v) ? null : v;

/** As categorias de partida, na primeira abertura (função do banco, idempotente). */
export async function garantirCategorias(): Promise<void> {
  await createClient().rpc("estoque_semear_categorias");
  revalidar();
}

/* ------------------------------------------------------------------ */
/* Itens                                                                */
/* ------------------------------------------------------------------ */

export type DadosDoItem = {
  nome: string;
  categoriaId: string | null;
  unidade: string;
  custoUnitario: number | null;
  minimo: number | null;
  validade: string | null;
  observacao: string | null;
};

function validarItem(d: DadosDoItem): string | null {
  if (d.nome.trim().length < 2) return "Dê um nome ao item.";
  if (d.custoUnitario != null && d.custoUnitario < 0) return "O custo não pode ser negativo.";
  if (d.minimo != null && d.minimo < 0) return "O mínimo não pode ser negativo.";
  if (d.validade && !/^\d{4}-\d{2}-\d{2}$/.test(d.validade)) return "Confira a data de validade.";
  return null;
}

export async function criarItem(
  d: DadosDoItem & { quantidadeInicial: number | null }
): Promise<Resultado> {
  const problema = validarItem(d);
  if (problema) return { error: problema };
  const supabase = createClient();
  const codigo = codigoDoItem(d.nome);
  const { data: ja } = await supabase.from("estoque_item").select("id, nome").eq("codigo", codigo).maybeSingle();
  if (ja) return { error: `Já existe "${ja.nome}" no estoque.` };

  const { data: criado, error } = await supabase
    .from("estoque_item")
    .insert({
      codigo,
      nome: d.nome.trim().slice(0, 80),
      categoria_id: d.categoriaId || null,
      unidade: unidadeLimpa(d.unidade),
      custo_unitario: numeroOuNulo(d.custoUnitario),
      minimo: numeroOuNulo(d.minimo),
      validade: d.validade || null,
      observacao: d.observacao?.trim().slice(0, 300) || null,
    })
    .select("id")
    .single();
  if (error || !criado) {
    console.error("[eorganizei:estoque] criar item:", error?.message);
    return { error: "Não foi possível criar o item." };
  }
  if (d.quantidadeInicial != null && d.quantidadeInicial > 0) {
    await supabase.from("estoque_movimento").insert({
      item_id: criado.id,
      tipo: "entrada",
      quantidade: d.quantidadeInicial,
      custo_unitario: numeroOuNulo(d.custoUnitario),
      motivo: "estoque inicial",
    });
  }
  revalidar();
  return { success: true, id: criado.id as string };
}

export async function editarItem(id: string, d: DadosDoItem): Promise<Resultado> {
  const problema = validarItem(d);
  if (problema) return { error: problema };
  const supabase = createClient();
  const codigo = codigoDoItem(d.nome);
  const { data: outro } = await supabase
    .from("estoque_item")
    .select("id")
    .eq("codigo", codigo)
    .neq("id", id)
    .maybeSingle();
  if (outro) return { error: "Já existe outro item com esse nome." };

  const { data, error } = await supabase
    .from("estoque_item")
    .update({
      codigo,
      nome: d.nome.trim().slice(0, 80),
      categoria_id: d.categoriaId || null,
      unidade: unidadeLimpa(d.unidade),
      custo_unitario: numeroOuNulo(d.custoUnitario),
      minimo: numeroOuNulo(d.minimo),
      validade: d.validade || null,
      observacao: d.observacao?.trim().slice(0, 300) || null,
    })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível salvar." };
  revalidar();
  return { success: true };
}

/** O único jeito de mexer no saldo à mão: um ajuste com motivo. */
export async function ajustarSaldo(id: string, delta: number, motivo: string): Promise<Resultado> {
  if (!Number.isFinite(delta) || delta === 0) return { error: "Informe o novo saldo." };
  if (motivo.trim().length < 2) return { error: "Diga o motivo do ajuste." };
  const { error } = await createClient().from("estoque_movimento").insert({
    item_id: id,
    tipo: "ajuste",
    quantidade: delta,
    motivo: motivo.trim().slice(0, 200),
  });
  if (error) return { error: "Não foi possível ajustar." };
  revalidar();
  return { success: true };
}

/** Apaga o que nunca se moveu; o que tem história só se desativa. */
export async function removerItem(id: string): Promise<Resultado & { desativado?: boolean }> {
  const supabase = createClient();
  const [{ count: movs }, { count: res }] = await Promise.all([
    supabase.from("estoque_movimento").select("id", { count: "exact", head: true }).eq("item_id", id),
    supabase.from("estoque_reserva").select("id", { count: "exact", head: true }).eq("item_id", id),
  ]);
  if ((movs ?? 0) === 0 && (res ?? 0) === 0) {
    const { error } = await supabase.from("estoque_item").delete().eq("id", id);
    if (error) return { error: "Não foi possível remover." };
    revalidar();
    return { success: true };
  }
  const { data, error } = await supabase.from("estoque_item").update({ ativo: false }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Não foi possível desativar." };
  revalidar();
  return { success: true, desativado: true };
}

export async function reativarItem(id: string): Promise<Resultado> {
  const { data, error } = await createClient().from("estoque_item").update({ ativo: true }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Não foi possível reativar." };
  revalidar();
  return { success: true };
}

export async function historicoDoItem(id: string): Promise<MovimentoDoItem[]> {
  return getHistoricoDoItem(id);
}

export async function disponivelNaData(itemId: string, dataIso: string): Promise<number | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return null;
  return getDisponivel(itemId, dataIso);
}

/* ------------------------------------------------------------------ */
/* Categorias                                                           */
/* ------------------------------------------------------------------ */

export async function criarCategoria(nome: string, reutilizavel: boolean): Promise<Resultado> {
  const n = nome.trim().slice(0, 60);
  if (n.length < 2) return { error: "Dê um nome à categoria." };
  const supabase = createClient();
  const { data: ultima } = await supabase
    .from("estoque_categoria")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("estoque_categoria")
    .insert({ nome: n, reutilizavel, ordem: ((ultima?.ordem as number | undefined) ?? 0) + 10 })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível criar." };
  }
  revalidar();
  return { success: true, id: data.id as string };
}

export async function editarCategoria(id: string, nome: string, reutilizavel: boolean): Promise<Resultado> {
  const n = nome.trim().slice(0, 60);
  if (n.length < 2) return { error: "Dê um nome à categoria." };
  const { data, error } = await createClient()
    .from("estoque_categoria")
    .update({ nome: n, reutilizavel })
    .eq("id", id)
    .select("id");
  if (error) return { error: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível salvar." };
  if (!data?.length) return { error: "Não foi possível salvar." };
  revalidar();
  return { success: true };
}

/** Sobe ou desce uma posição: a ordem é a da lista de separação. */
export async function moverCategoria(id: string, direcao: "cima" | "baixo"): Promise<Resultado> {
  const supabase = createClient();
  const { data } = await supabase.from("estoque_categoria").select("id, ordem").order("ordem").order("nome");
  const lista = (data ?? []) as { id: string; ordem: number }[];
  const i = lista.findIndex((c) => c.id === id);
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return { success: true };
  // renumera tudo de 10 em 10, trocando as duas: nunca fica empate
  const nova = lista.slice();
  [nova[i], nova[j]] = [nova[j], nova[i]];
  for (let k = 0; k < nova.length; k++) {
    if (nova[k].ordem !== (k + 1) * 10) {
      await supabase.from("estoque_categoria").update({ ordem: (k + 1) * 10 }).eq("id", nova[k].id);
    }
  }
  revalidar();
  return { success: true };
}

export async function removerCategoria(id: string): Promise<Resultado> {
  const supabase = createClient();
  const { count } = await supabase.from("estoque_item").select("id", { count: "exact", head: true }).eq("categoria_id", id);
  if ((count ?? 0) > 0) return { error: "Mova os itens desta categoria antes de apagá-la." };
  const { error } = await supabase.from("estoque_categoria").delete().eq("id", id);
  if (error) return { error: "Não foi possível apagar." };
  revalidar();
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Importar — o controle que ela já tem                                 */
/* ------------------------------------------------------------------ */

export type LinhaParaImportar = {
  nome: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number | null;
  categoriaId: string | null;
  /** já existe: soma ao item, em vez de criar outro */
  itemExistenteId: string | null;
};

export async function importarItens(
  linhas: LinhaParaImportar[]
): Promise<{ error: string } | { success: true; novos: number; somados: number }> {
  if (linhas.length === 0) return { error: "Nada para importar." };
  if (linhas.length > 500) return { error: "Importe até 500 itens por vez." };
  const supabase = createClient();
  let novos = 0;
  let somados = 0;

  for (const l of linhas) {
    const nome = l.nome.trim().slice(0, 80);
    if (!nome || !Number.isFinite(l.quantidade) || l.quantidade <= 0) continue;
    const custo = numeroOuNulo(l.custoUnitario);
    let itemId = l.itemExistenteId;

    if (!itemId) {
      const codigo = codigoDoItem(nome);
      const { data: ja } = await supabase.from("estoque_item").select("id").eq("codigo", codigo).maybeSingle();
      if (ja) itemId = ja.id as string;
    }

    if (itemId) {
      if (custo != null) {
        await supabase.from("estoque_item").update({ custo_unitario: custo }).eq("id", itemId);
      }
      somados++;
    } else {
      const { data: criado, error } = await supabase
        .from("estoque_item")
        .insert({
          codigo: codigoDoItem(nome),
          nome,
          categoria_id: l.categoriaId || null,
          unidade: unidadeLimpa(l.unidade),
          custo_unitario: custo,
        })
        .select("id")
        .single();
      if (error || !criado) {
        console.error("[eorganizei:estoque] importar:", error?.message);
        return { error: `Não foi possível criar "${nome}".` };
      }
      itemId = criado.id as string;
      novos++;
    }

    const { error: erroMov } = await supabase.from("estoque_movimento").insert({
      item_id: itemId,
      tipo: "entrada",
      quantidade: l.quantidade,
      custo_unitario: custo,
      motivo: "importado do controle",
    });
    if (erroMov) return { error: `Não foi possível gravar a quantidade de "${nome}".` };
  }
  revalidar();
  return { success: true, novos, somados };
}

/* ------------------------------------------------------------------ */
/* Usar num evento                                                      */
/* ------------------------------------------------------------------ */

export type EventoParaReservar = { id: string; nome: string; data: string };

/** Os eventos abertos de hoje em diante, para o "Usar". */
export async function eventosParaReservar(): Promise<EventoParaReservar[]> {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const { data } = await createClient()
    .from("events")
    .select("id, name, date, type, clients ( name )")
    .in("status", ["orcamento", "confirmado"])
    .gte("date", hoje)
    .order("date")
    .limit(60);
  type L = { id: string; name: string | null; date: string; type: string; clients: { name: string } | { name: string }[] | null };
  return ((data ?? []) as unknown as L[]).map((e) => {
    const cliente = Array.isArray(e.clients) ? e.clients[0] : e.clients;
    return { id: e.id, nome: e.name || cliente?.name || e.type, data: e.date };
  });
}

export async function reservarParaEvento(
  eventId: string,
  itemId: string,
  quantidade: number
): Promise<ResultadoDaReserva> {
  const r = await usarDoEstoque(eventId, itemId, quantidade);
  revalidar();
  return r;
}

/* ------------------------------------------------------------------ */
/* Compras (fatia 2) — a nota que repõe o acervo                        */
/* ------------------------------------------------------------------ */

export type CompraParaRegistrar = {
  data: string;
  fornecedorNome: string | null;
  numeroNota: string | null;
  chaveNfe: string | null;
  total: number | null;
  origem: "xml" | "pdf" | "foto" | "planilha" | "manual";
  itens: LinhaParaImportar[];
};

function revalidarCompras() {
  revalidar();
  revalidatePath("/estoque/compras");
  revalidatePath("/financeiro");
}

/**
 * Grava a compra e uma entrada por item. Item que já existe recebe a
 * quantidade e o custo novo; item novo nasce aqui. A nota repetida (mesma
 * chave) é recusada com a data em que já entrou.
 */
export async function registrarCompra(c: CompraParaRegistrar): Promise<{ error: string } | { success: true; id: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.data)) return { error: "Confira a data da compra." };
  const itens = c.itens.filter((l) => l.nome.trim() && Number.isFinite(l.quantidade) && l.quantidade > 0);
  if (itens.length === 0) return { error: "A compra precisa de pelo menos um item com quantidade." };
  if (itens.length > 300) return { error: "Registre até 300 itens por compra." };
  const chave = c.chaveNfe ? c.chaveNfe.replace(/\D/g, "") : null;
  if (chave && chave.length !== 44) return { error: "A chave da nota tem 44 dígitos." };

  const supabase = createClient();
  if (chave) {
    const { data: ja } = await supabase.from("estoque_compra").select("data").eq("chave_nfe", chave).maybeSingle();
    if (ja) return { error: `Esta nota já entrou em ${String(ja.data).split("-").reverse().join("/")}.` };
  }

  const somaItens = itens.reduce((s, l) => s + (l.custoUnitario ?? 0) * l.quantidade, 0);
  const total = c.total != null && c.total > 0 ? c.total : Math.round(somaItens * 100) / 100;

  const { data: compra, error } = await supabase
    .from("estoque_compra")
    .insert({
      data: c.data,
      fornecedor_nome: c.fornecedorNome?.trim().slice(0, 120) || null,
      numero_nota: c.numeroNota?.trim().slice(0, 30) || null,
      chave_nfe: chave,
      total,
      origem: c.origem,
    })
    .select("id")
    .single();
  if (error || !compra) {
    console.error("[eorganizei:estoque] compra:", error?.message);
    return { error: error?.code === "23505" ? "Esta nota já foi registrada." : "Não foi possível registrar a compra." };
  }

  for (const l of itens) {
    const nome = l.nome.trim().slice(0, 80);
    const custo = numeroOuNulo(l.custoUnitario);
    let itemId = l.itemExistenteId;
    if (!itemId) {
      const { data: ja } = await supabase.from("estoque_item").select("id").eq("codigo", codigoDoItem(nome)).maybeSingle();
      if (ja) itemId = ja.id as string;
    }
    if (itemId) {
      if (custo != null) await supabase.from("estoque_item").update({ custo_unitario: custo }).eq("id", itemId);
    } else {
      const { data: criado, error: erroItem } = await supabase
        .from("estoque_item")
        .insert({ codigo: codigoDoItem(nome), nome, categoria_id: l.categoriaId || null, unidade: unidadeLimpa(l.unidade), custo_unitario: custo })
        .select("id")
        .single();
      if (erroItem || !criado) return { error: `Não foi possível criar "${nome}".` };
      itemId = criado.id as string;
    }
    const { error: erroMov } = await supabase.from("estoque_movimento").insert({
      item_id: itemId,
      tipo: "entrada",
      quantidade: l.quantidade,
      custo_unitario: custo,
      compra_id: compra.id,
      motivo: c.fornecedorNome ? `compra · ${c.fornecedorNome.trim().slice(0, 60)}` : "compra",
    });
    if (erroMov) return { error: `Não foi possível gravar a quantidade de "${nome}".` };
  }
  revalidarCompras();
  return { success: true, id: compra.id as string };
}

/** O arquivo da nota já subiu para o bucket (pasta da empresa); guarda o caminho. */
export async function anexarDocumentoDaCompra(compraId: string, path: string): Promise<Resultado> {
  if (!/^[0-9a-f-]{36}\/estoque\/[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$/i.test(path)) return { error: "Caminho inválido." };
  const { data, error } = await createClient().from("estoque_compra").update({ documento_path: path }).eq("id", compraId).select("id");
  if (error || !data?.length) return { error: "Não foi possível guardar a nota." };
  revalidarCompras();
  return { success: true };
}

/** Uma URL assinada (10 min) para abrir a nota guardada. */
export async function urlDaNota(compraId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("estoque_compra").select("documento_path").eq("id", compraId).maybeSingle();
  const path = data?.documento_path as string | null | undefined;
  if (!path) return null;
  const { data: assinada } = await supabase.storage.from("comprovantes").createSignedUrl(path, 60 * 10);
  return assinada?.signedUrl ?? null;
}

/** A compra vira despesa no Financeiro da empresa — só com o clique dela. */
export async function lancarCompra(compraId: string): Promise<Resultado> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  const { data: c } = await supabase
    .from("estoque_compra")
    .select("id, data, fornecedor_nome, total, lancamento_id, lancada_fora")
    .eq("id", compraId)
    .maybeSingle();
  if (!c) return { error: "Compra não encontrada." };
  if (c.lancamento_id || c.lancada_fora) return { success: true };
  const total = Number(c.total);
  if (!(total > 0)) return { error: "Informe o total da compra antes de lançar." };

  const { count } = await supabase.from("estoque_movimento").select("id", { count: "exact", head: true }).eq("compra_id", compraId);
  const { data: lanc, error } = await supabase
    .from("business_transactions")
    .insert({
      cerimonialista_id: user.id,
      type: "despesa",
      category: "estoque",
      description: `Compra de estoque${c.fornecedor_nome ? ` · ${c.fornecedor_nome}` : ""} · ${count ?? 0} ${count === 1 ? "item" : "itens"}`,
      value: total,
      due_date: c.data,
      paid: true,
      paid_at: new Date().toISOString(),
      recurring: false,
    })
    .select("id")
    .single();
  if (error || !lanc) {
    console.error("[eorganizei:estoque] lançar:", error?.message);
    return { error: "Não foi possível lançar no Financeiro." };
  }
  const { error: erroVinc } = await supabase.from("estoque_compra").update({ lancamento_id: lanc.id }).eq("id", compraId);
  if (erroVinc) return { error: "Lançou, mas não ficou marcado na compra." };
  revalidarCompras();
  return { success: true };
}

/** Ela já lançou por fora: some da fila sem lançamento. */
export async function marcarLancadaFora(compraId: string): Promise<Resultado> {
  const { data, error } = await createClient().from("estoque_compra").update({ lancada_fora: true }).eq("id", compraId).select("id");
  if (error || !data?.length) return { error: "Não foi possível marcar." };
  revalidarCompras();
  return { success: true };
}

/** Desfaz a compra e as entradas dela — só enquanto não virou lançamento. */
export async function desfazerCompra(compraId: string): Promise<Resultado> {
  const supabase = createClient();
  const { data: c } = await supabase.from("estoque_compra").select("lancamento_id, lancada_fora").eq("id", compraId).maybeSingle();
  if (!c) return { error: "Compra não encontrada." };
  if (c.lancamento_id || c.lancada_fora) return { error: "Esta compra já foi lançada. Apague o lançamento no Financeiro antes." };
  const { error: e1 } = await supabase.from("estoque_movimento").delete().eq("compra_id", compraId);
  if (e1) return { error: "Não foi possível desfazer as entradas." };
  const { error: e2 } = await supabase.from("estoque_compra").delete().eq("id", compraId);
  if (e2) return { error: "Não foi possível apagar a compra." };
  revalidarCompras();
  return { success: true };
}
