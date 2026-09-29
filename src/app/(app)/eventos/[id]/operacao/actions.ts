"use server";

// Ações da Operação: os números do recurso, e de onde ele vem. A RLS por
// evento (pode_editar_evento) é a guarda real; aqui só gravamos e
// revalidamos.
//
// Regra que atravessa tudo aqui: nada é calculado às escondidas. O
// previsto só é recalculado quando ela pede (botão), e o lançamento no
// financeiro só nasce como PENDÊNCIA — dinheiro não se move sozinho.
//
// Desde a 184 a linha diz de onde vem: comprar para a festa, do estoque
// da empresa (reserva) ou o fornecedor entrega. Só a compra abre
// pendência financeira — o gatilho do banco sai cedo nas outras.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { codigoDoItem } from "@/lib/estoque-core";

export type AcaoResult = { error: string } | { success: true; id?: string };

const CAMPOS_NUMERICOS = [
  "previsto",
  "comprado",
  "entrada",
  "sobra",
  "custo_unitario",
  "indice",
] as const;

type CampoNumerico = (typeof CAMPOS_NUMERICOS)[number];

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/operacao`);
  revalidatePath(`/eventos/${eventId}/organizacao`);
  revalidatePath(`/eventos/${eventId}/financeiro`);
  revalidatePath("/estoque");
  revalidatePath("/estoque/eventos");
}

/** Um número por vez: a tela salva no blur, sem formulário nem "Salvar". */
export async function salvarNumero(
  eventId: string,
  recursoId: string,
  campo: string,
  valor: number | null
): Promise<AcaoResult> {
  if (!CAMPOS_NUMERICOS.includes(campo as CampoNumerico)) {
    return { error: "Campo inválido." };
  }
  if (valor != null && (!Number.isFinite(valor) || valor < 0)) {
    return { error: "O número não pode ser negativo." };
  }

  // O previsto digitado é PEDIDO DA CLIENTE — é base_origem='manual' que
  // faz o Recalcular respeitá-lo (143). Ao limpar o número, a origem volta
  // a nulo: senão o item ficaria fora do dimensionamento para sempre, sem
  // número e sem quem o calcule.
  //
  // E o pedido dela não tem base (145): guardar aqui o público do último
  // dimensionamento deixaria o item eternamente "defasado" para os três
  // leitores que só olham base_quantidade — sem ninguém que os feche,
  // porque o Recalcular agora pula esta linha de propósito.
  const patch: Record<string, number | string | null> = { [campo]: valor };
  if (campo === "previsto") {
    patch.base_origem = valor == null ? null : "manual";
    if (valor != null) patch.base_quantidade = null;
  }

  const supabase = createClient();
  // `select` depois do update para saber QUANTAS linhas mudaram: com RLS,
  // um update barrado volta sem erro e sem linhas — e sem isto a tela
  // diria "salvo" para uma gravação que nunca aconteceu.
  const { data, error } = await supabase
    .from("evento_recurso")
    .update(patch)
    .eq("id", recursoId)
    .eq("event_id", eventId)
    .select("id");

  if (error) {
    console.error("[vela:operacao]", error.message);
    return { error: "Não foi possível salvar." };
  }
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar este evento." };
  }
  revalidar(eventId);
  return { success: true };
}

/** A hora em que acabou — a ruptura que ninguém registra. */
export async function marcarRuptura(
  eventId: string,
  recursoId: string,
  hora: string | null
): Promise<AcaoResult> {
  if (hora && !/^\d{2}:\d{2}$/.test(hora)) {
    return { error: "Informe a hora como HH:MM." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_recurso")
    .update({ acabou_em: hora })
    .eq("id", recursoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível salvar a hora." };
  revalidar(eventId);
  return { success: true };
}

export async function definirFornecedor(
  eventId: string,
  recursoId: string,
  supplierId: string | null
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_recurso")
    .update({ supplier_id: supplierId || null })
    .eq("id", recursoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível salvar o fornecedor." };
  revalidar(eventId);
  return { success: true };
}

export async function salvarObservacao(
  eventId: string,
  recursoId: string,
  texto: string
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_recurso")
    .update({ observacao: texto.trim().slice(0, 500) || null })
    .eq("id", recursoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível salvar a observação." };
  revalidar(eventId);
  return { success: true };
}

/**
 * Recalcular o previsto de tudo pelo público de hoje. É o único caminho
 * que sobrescreve número digitado — por isso vive num botão, com aviso
 * na tela, e nunca acontece sozinho.
 */
export async function recalcularPrevisto(
  eventId: string,
  forcar: boolean
): Promise<{ error: string } | { success: true; atualizados: number }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("dimensionar_recursos_evento", {
    p_event_id: eventId,
    p_forcar: forcar,
  });
  if (error) {
    console.error("[vela:operacao] dimensionar:", error.message);
    return { error: "Não foi possível recalcular." };
  }
  revalidar(eventId);
  return { success: true, atualizados: Number(data ?? 0) };
}

/** Traz os itens que o método ganhou depois que este evento já existia. */
export async function trazerDoMetodo(
  eventId: string
): Promise<{ error: string } | { success: true; novos: number }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("instanciar_recursos_evento", {
    p_event_id: eventId,
  });
  if (error) return { error: "Não foi possível buscar os itens do método." };
  revalidar(eventId);
  return { success: true, novos: Number(data ?? 0) };
}

/**
 * codigo: chave estável dentro do evento (unique event_id + codigo) — e é
 * por ele que a estatística reconhece o mesmo item em eventos diferentes,
 * e que o item acha o acervo (184). Por isso DETERMINÍSTICO. Mesmo nome
 * duas vezes no MESMO evento: sufixo, só aqui, onde ele é inevitável.
 */
async function codigoLivre(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  nome: string
): Promise<string> {
  const base = codigoDoItem(nome);
  const { data: usados } = await supabase
    .from("evento_recurso")
    .select("codigo")
    .eq("event_id", eventId)
    .like("codigo", `${base}%`);
  const tomados = new Set((usados ?? []).map((u) => u.codigo as string));
  let codigo = base;
  for (let i = 2; tomados.has(codigo); i++) codigo = `${base}_${i}`;
  return codigo;
}

export async function criarRecurso(
  eventId: string,
  dados: { nome: string; unidade: string; regra: string; indice: number }
): Promise<AcaoResult> {
  const nome = dados.nome.trim();
  if (!nome) return { error: "Dê um nome ao item." };
  if (!["fixo", "por_pessoa", "por_unidade"].includes(dados.regra)) {
    return { error: "Regra inválida." };
  }

  const supabase = createClient();
  const codigo = await codigoLivre(supabase, eventId, nome);

  // quantidade fixa: o número digitado JÁ É o previsto — sem isto o item
  // nascia sem previsto, e o total do custo e o "comprei tudo" ficavam
  // esperando um número que ela já tinha dado
  const fixo = dados.regra === "fixo" && dados.indice > 0;
  const { data: criado, error } = await supabase
    .from("evento_recurso")
    .insert({
      event_id: eventId,
      codigo,
      nome,
      unidade: dados.unidade.trim().slice(0, 20) || "unidades",
      regra: dados.regra,
      indice: dados.indice,
      ordem: 900,
      ...(fixo ? { previsto: dados.indice, base_origem: "fixo" } : {}),
    })
    .select("id")
    .single();

  if (error || !criado) {
    console.error("[vela:operacao] criar:", error?.message);
    return { error: "Não foi possível criar o item." };
  }
  revalidar(eventId);
  // o id volta para quem cria em lote (a extração de contrato) poder
  // gravar o comprado na sequência
  return { success: true, id: criado.id };
}

export async function removerRecurso(
  eventId: string,
  recursoId: string
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_recurso")
    .delete()
    .eq("id", recursoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível remover o item." };
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* De onde vem cada item (184)                                         */
/* ------------------------------------------------------------------ */

export type Origem = "compra" | "estoque" | "fornecedor";

/**
 * "O fornecedor entrega" / voltar a "comprar". Marcar como entregue pelo
 * fornecedor garante a quantidade (comprado = previsto) sem abrir
 * pendência: o gatilho sai cedo fora da compra.
 */
export async function definirOrigem(
  eventId: string,
  recursoId: string,
  origem: Exclude<Origem, "estoque">
): Promise<AcaoResult> {
  const supabase = createClient();
  const { data: atual } = await supabase
    .from("evento_recurso")
    .select("previsto")
    .eq("id", recursoId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!atual) return { error: "Item não encontrado." };

  const patch: Record<string, unknown> = { origem_suprimento: origem };
  if (origem === "fornecedor") patch.comprado = atual.previsto ?? null;
  else patch.comprado = null;

  const { data, error } = await supabase
    .from("evento_recurso")
    .update(patch)
    .eq("id", recursoId)
    .eq("event_id", eventId)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível salvar." };
  revalidar(eventId);
  return { success: true };
}

export type ResultadoDaReserva =
  | { error: string }
  | { success: true; reservaId: string; falta: number };

/**
 * Usar do estoque: reserva o item para este evento. Com `recursoId`, a
 * linha da Operação passa a vir do estoque; sem ele (o "Usar" da tela
 * do Estoque), nasce uma linha avulsa na Operação para a reserva ter
 * onde aparecer. Reserva NÃO mexe no saldo — desconta do disponível — e
 * nunca abre pendência financeira.
 *
 * Faltar quantidade não barra: avisa (a Wedy faz igual). Quem decide se
 * aluga o resto é ela.
 */
export async function usarDoEstoque(
  eventId: string,
  itemId: string,
  quantidade: number,
  recursoId?: string | null
): Promise<ResultadoDaReserva> {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { error: "Informe a quantidade." };
  }
  const supabase = createClient();

  const [{ data: item }, { data: evento }] = await Promise.all([
    supabase.from("estoque_item").select("id, nome, unidade, codigo").eq("id", itemId).maybeSingle(),
    supabase.from("events").select("id, date").eq("id", eventId).maybeSingle(),
  ]);
  if (!item) return { error: "Item do estoque não encontrado." };
  if (!evento) return { error: "Evento não encontrado." };

  // a linha da Operação que esta reserva supre
  let recurso = recursoId ?? null;
  if (!recurso) {
    const { data: existente } = await supabase
      .from("estoque_reserva")
      .select("evento_recurso_id")
      .eq("event_id", eventId)
      .eq("item_id", itemId)
      .maybeSingle();
    recurso = (existente?.evento_recurso_id as string | null) ?? null;
  }
  if (!recurso) {
    const codigo = await codigoLivre(supabase, eventId, item.nome as string);
    const { data: criado, error } = await supabase
      .from("evento_recurso")
      .insert({
        event_id: eventId,
        codigo,
        nome: item.nome,
        unidade: item.unidade,
        regra: "fixo",
        indice: quantidade,
        base_origem: "fixo",
        previsto: quantidade,
        ordem: 900,
        origem_suprimento: "estoque",
        comprado: quantidade,
      })
      .select("id")
      .single();
    if (error || !criado) return { error: "Não foi possível criar a linha na Operação." };
    recurso = criado.id as string;
  }

  const { data: reserva, error: erroReserva } = await supabase
    .from("estoque_reserva")
    .upsert(
      { event_id: eventId, item_id: itemId, quantidade, evento_recurso_id: recurso },
      { onConflict: "event_id,item_id" }
    )
    .select("id")
    .single();
  if (erroReserva || !reserva) {
    console.error("[eorganizei:estoque] reservar:", erroReserva?.message);
    return { error: "Não foi possível reservar." };
  }

  // a linha passa a vir do estoque: garantida, sem compra
  await supabase
    .from("evento_recurso")
    .update({ origem_suprimento: "estoque", comprado: quantidade })
    .eq("id", recurso)
    .eq("event_id", eventId);

  const { data: disp } = await supabase.rpc("estoque_disponivel", {
    p_item: itemId,
    p_data: evento.date,
  });
  // o disponível já desconta esta reserva; negativo = quanto falta
  const falta = disp == null ? 0 : Math.max(0, -Number(disp));

  revalidar(eventId);
  return { success: true, reservaId: reserva.id as string, falta };
}

/** Saiu do depósito para a festa (ou voltou para a prateleira). */
export async function marcarSeparado(
  eventId: string,
  reservaId: string,
  separado: boolean
): Promise<AcaoResult> {
  const { data, error } = await createClient()
    .from("estoque_reserva")
    .update({ separado_em: separado ? new Date().toISOString() : null })
    .eq("id", reservaId)
    .eq("event_id", eventId)
    .is("fechado_em", null)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível marcar." };
  revalidar(eventId);
  return { success: true };
}

/** Desfazer a reserva: a linha volta a "comprar". */
export async function desfazerReserva(eventId: string, reservaId: string): Promise<AcaoResult> {
  const supabase = createClient();
  const { data: r } = await supabase
    .from("estoque_reserva")
    .select("evento_recurso_id, fechado_em")
    .eq("id", reservaId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!r) return { error: "Reserva não encontrada." };
  if (r.fechado_em) return { error: "Esta reserva já foi fechada." };

  const { error } = await supabase.from("estoque_reserva").delete().eq("id", reservaId).eq("event_id", eventId);
  if (error) return { error: "Não foi possível desfazer." };
  if (r.evento_recurso_id) {
    await supabase
      .from("evento_recurso")
      .update({ origem_suprimento: "compra", comprado: null })
      .eq("id", r.evento_recurso_id)
      .eq("event_id", eventId);
  }
  revalidar(eventId);
  return { success: true };
}

/**
 * Depois da festa: o que voltou, o que foi consumido, o que se perdeu.
 * É o que baixa do saldo (função do banco, idempotente). No consumível a
 * contagem do dia também ganha entrada e sobra, para a estatística de
 * consumo por pessoa continuar aprendendo.
 */
export async function fecharReserva(
  eventId: string,
  reservaId: string,
  numeros: { devolvido?: number | null; consumido?: number | null; perdido?: number | null }
): Promise<AcaoResult> {
  const supabase = createClient();
  const { data: r } = await supabase
    .from("estoque_reserva")
    .select("quantidade, evento_recurso_id, fechado_em, estoque_item ( estoque_categoria ( reutilizavel ) )")
    .eq("id", reservaId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!r) return { error: "Reserva não encontrada." };
  if (r.fechado_em) return { success: true };

  for (const v of [numeros.devolvido, numeros.consumido, numeros.perdido]) {
    if (v != null && (!Number.isFinite(v) || v < 0)) return { error: "O número não pode ser negativo." };
  }

  const { error } = await supabase.rpc("estoque_fechar_reserva", {
    p_reserva: reservaId,
    p_devolvido: numeros.devolvido ?? null,
    p_consumido: numeros.consumido ?? null,
    p_perdido: numeros.perdido ?? null,
  });
  if (error) {
    console.error("[eorganizei:estoque] fechar:", error.message);
    return { error: "Não foi possível fechar." };
  }

  const item = Array.isArray(r.estoque_item) ? r.estoque_item[0] : r.estoque_item;
  const cat = item?.estoque_categoria;
  const reutilizavel = (Array.isArray(cat) ? cat[0] : cat)?.reutilizavel ?? true;
  if (!reutilizavel && r.evento_recurso_id) {
    const quantidade = Number(r.quantidade);
    const consumido = Math.min(quantidade, numeros.consumido ?? quantidade);
    await supabase
      .from("evento_recurso")
      .update({ entrada: quantidade, sobra: Math.max(0, quantidade - consumido) })
      .eq("id", r.evento_recurso_id)
      .eq("event_id", eventId);
  }
  revalidar(eventId);
  return { success: true };
}
