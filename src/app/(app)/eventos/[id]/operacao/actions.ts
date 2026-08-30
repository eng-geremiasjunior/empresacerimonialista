"use server";

// Ações da Operação: os números do recurso. A RLS por evento
// (pode_editar_evento) é a guarda real; aqui só gravamos e revalidamos.
//
// Regra que atravessa tudo aqui: nada é calculado às escondidas. O
// previsto só é recalculado quando ela pede (botão), e o lançamento no
// financeiro só nasce como PENDÊNCIA — dinheiro não se move sozinho.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AcaoResult = { error: string } | { success: true };

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

  const supabase = createClient();
  // `select` depois do update para saber QUANTAS linhas mudaram: com RLS,
  // um update barrado volta sem erro e sem linhas — e sem isto a tela
  // diria "salvo" para uma gravação que nunca aconteceu.
  const { data, error } = await supabase
    .from("evento_recurso")
    .update({ [campo]: valor })
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

export async function criarRecurso(
  eventId: string,
  dados: { nome: string; unidade: string; regra: string; indice: number }
): Promise<AcaoResult> {
  const nome = dados.nome.trim();
  if (!nome) return { error: "Dê um nome ao item." };
  if (!["fixo", "por_pessoa", "por_unidade"].includes(dados.regra)) {
    return { error: "Regra inválida." };
  }

  // codigo: chave estável dentro do evento (unique event_id + codigo) —
  // e é por ele que a estatística reconhece o mesmo item em eventos
  // diferentes. Por isso DETERMINÍSTICO: "Gelo em escama" tem o mesmo
  // código em toda festa, senão o histórico nunca acumula. A faixa de
  // acentos vai em escape unicode, não em caractere literal.
  const base =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "item";

  const supabase = createClient();

  // Mesmo nome duas vezes no MESMO evento: o unique barraria. Sufixo só
  // aqui, onde ele é inevitável.
  const { data: usados } = await supabase
    .from("evento_recurso")
    .select("codigo")
    .eq("event_id", eventId)
    .like("codigo", `${base}%`);

  const tomados = new Set((usados ?? []).map((u) => u.codigo as string));
  let codigo = base;
  for (let i = 2; tomados.has(codigo); i++) codigo = `${base}_${i}`;

  const { error } = await supabase.from("evento_recurso").insert({
    event_id: eventId,
    codigo,
    nome,
    unidade: dados.unidade.trim().slice(0, 20) || "unidades",
    regra: dados.regra,
    indice: dados.indice,
    ordem: 900,
  });

  if (error) {
    console.error("[vela:operacao] criar:", error.message);
    return { error: "Não foi possível criar o item." };
  }
  revalidar(eventId);
  return { success: true };
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
