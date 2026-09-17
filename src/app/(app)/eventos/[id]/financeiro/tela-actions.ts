"use server";

// As escritas da tela do Financeiro do evento.
//
// Uma forma para todas as entradas: a tela tem um modal só, e cada
// operação dele cai numa função daqui. O que já existia continua onde
// estava e é chamado direto pela tela (confirmarPagamento,
// salvarComprovante, salvarVerbaTotal) — não duplico ação.
//
// Todas devolvem o id quando criam um lançamento: é ele que o comprovante
// precisa para se pendurar em seguida.

import { addMonths, format } from "date-fns";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { error: string } | { success: true; id?: string };

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/financeiro`);
}

const ehData = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function valido(valor: number): boolean {
  return Number.isFinite(valor) && valor > 0;
}

/* ------------------------------------------------------------------
 * Caixa do evento: o repasse da cliente
 * ---------------------------------------------------------------- */

/**
 * O dinheiro que a cliente põe no caixa do evento. É RECEITA da conta do
 * evento — não é receita dela, e por isso nunca entra na assessoria.
 */
export async function registrarEntradaDoCasal(
  eventId: string,
  input: { valor: number; data: string; descricao?: string }
): Promise<Resultado> {
  if (!valido(input.valor)) return { error: "Informe o valor recebido." };
  if (!ehData(input.data)) return { error: "Informe a data." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      event_id: eventId,
      type: "receita",
      conta: "fornecedor",
      category: "entrada",
      description: input.descricao?.trim() || "Entrada do casal",
      value: input.valor,
      due_date: input.data,
      paid: true,
      paid_at: input.data,
      tipo_lancamento: "entrada",
      origem_pagamento: "cliente_direto",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[vela:entrada-do-casal]", error?.message);
    return { error: "Não foi possível registrar a entrada." };
  }
  revalidar(eventId);
  return { success: true, id: data.id as string };
}

/* ------------------------------------------------------------------
 * Saídas da verba
 * ---------------------------------------------------------------- */

export type SaidaDaVerba = {
  descricao: string;
  valor: number;
  vencimento: string;
  /** vazio = despesa avulsa (sem fornecedor), que a 167 passou a aceitar */
  supplierId: string | null;
  objetivoId: string | null;
  /** o dinheiro sai do caixa dela ou a cliente paga direto */
  doCaixa: boolean;
  jaPaga: boolean;
};

/** Despesa ou parcela da verba do evento. */
export async function lancarNaVerba(
  eventId: string,
  input: SaidaDaVerba
): Promise<Resultado> {
  if (!input.descricao.trim()) return { error: "Informe a descrição." };
  if (!valido(input.valor)) return { error: "Informe um valor válido." };
  if (!ehData(input.vencimento)) return { error: "Informe o vencimento." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      event_id: eventId,
      type: "despesa",
      conta: "fornecedor",
      category: "outro",
      description: input.descricao.trim(),
      value: input.valor,
      due_date: input.vencimento,
      paid: input.jaPaga,
      paid_at: input.jaPaga ? input.vencimento : null,
      supplier_id: input.supplierId,
      objetivo_id: input.objetivoId,
      tipo_lancamento: "parcela",
      origem_pagamento: input.doCaixa ? "caixa" : "cliente_direto",
    })
    .select("id")
    .single();

  if (error || !data) {
    // A 167 é o que permite a despesa avulsa; sem ela, o CHECK recusa.
    if (error?.message.includes("fornecedor_obrigatorio")) {
      return {
        error:
          "Despesa da verba sem fornecedor ainda não é aceita por este banco. Aplique a migração 167 ou escolha um fornecedor.",
      };
    }
    console.error("[vela:lancar-na-verba]", error?.message);
    return { error: "Não foi possível lançar. Confira os campos." };
  }
  revalidar(eventId);
  return { success: true, id: data.id as string };
}

/**
 * Gera as parcelas do que FALTA do contrato: contrato − o que já foi
 * lançado, em N mensais iguais a partir da data escolhida. A sobra do
 * arredondamento vai inteira para a última, senão 1.000 em 3× viram
 * 999,99.
 */
export async function gerarParcelasDoFornecedor(
  eventId: string,
  input: {
    supplierId: string;
    objetivoId: string | null;
    restante: number;
    quantidade: number;
    primeiroVencimento: string;
    nomeBase: string;
    jaLancadas: number;
    /** o evento tem caixa: as parcelas saem dele, como as despesas */
    doCaixa: boolean;
  }
): Promise<Resultado> {
  const n = Math.max(1, Math.min(24, Math.round(input.quantidade)));
  if (!valido(input.restante)) {
    return { error: "Não falta valor a lançar neste contrato." };
  }
  if (!ehData(input.primeiroVencimento)) return { error: "Informe a data." };

  const cada = Number((input.restante / n).toFixed(2));
  const ultima = Number((input.restante - cada * (n - 1)).toFixed(2));
  const base = new Date(input.primeiroVencimento + "T00:00:00");
  const total = input.jaLancadas + n;

  const linhas = Array.from({ length: n }, (_, i) => ({
    event_id: eventId,
    type: "despesa",
    conta: "fornecedor",
    category: "outro",
    description: `Parcela ${input.jaLancadas + i + 1} de ${total}`,
    value: i === n - 1 ? ultima : cada,
    due_date: format(addMonths(base, i), "yyyy-MM-dd"),
    paid: false,
    supplier_id: input.supplierId,
    objetivo_id: input.objetivoId,
    tipo_lancamento: "parcela",
    origem_pagamento: input.doCaixa ? "caixa" : "cliente_direto",
    installment_number: input.jaLancadas + i + 1,
    installment_total: total,
  }));

  const supabase = createClient();
  const { error } = await supabase.from("transactions").insert(linhas);
  if (error) {
    console.error("[vela:gerar-parcelas-fornecedor]", error.message);
    return { error: "Não foi possível gerar as parcelas." };
  }
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------
 * Contratos
 * ---------------------------------------------------------------- */

/**
 * O contrato do fornecedor dentro do evento. É a resposta para "onde eu
 * lanço o valor do contrato?" — que na tela antiga estava três níveis
 * abaixo, dentro de um accordion.
 *
 * Quando `nome` vem sem `supplierId`, o fornecedor entra no cadastro
 * também: ela não precisa sair da tela para cadastrar antes.
 */
export async function salvarContratoFornecedor(
  eventId: string,
  input: {
    supplierId: string | null;
    nome: string;
    objetivoId: string | null;
    valor: number;
    assinadoEm: string | null;
  }
): Promise<Resultado> {
  if (!input.supplierId && !input.nome.trim()) {
    return { error: "Informe o fornecedor." };
  }
  if (!valido(input.valor)) return { error: "Informe o valor do contrato." };

  const supabase = createClient();
  let supplierId = input.supplierId;

  if (!supplierId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada. Entre de novo." };

    const { data: novo, error: erroForn } = await supabase
      .from("suppliers")
      .insert({ cerimonialista_id: user.id, name: input.nome.trim() })
      .select("id")
      .single();
    if (erroForn || !novo) {
      console.error("[vela:contrato-fornecedor:cadastro]", erroForn?.message);
      return { error: "Não foi possível cadastrar o fornecedor." };
    }
    supplierId = novo.id as string;
  }

  const linha: Record<string, unknown> = {
    event_id: eventId,
    supplier_id: supplierId,
    valor_alocado: input.valor,
    updated_at: new Date().toISOString(),
  };
  // Colunas da 167: se o banco ainda não as tem, o upsert vai sem elas.
  const comNovas = {
    ...linha,
    assinado_em: input.assinadoEm,
    objetivo_id: input.objetivoId,
  };

  let erro = (
    await supabase
      .from("evento_fornecedor_orcamento")
      .upsert(comNovas, { onConflict: "event_id,supplier_id" })
  ).error;

  if (erro && (erro.code === "42703" || erro.code === "PGRST204")) {
    erro = (
      await supabase
        .from("evento_fornecedor_orcamento")
        .upsert(linha, { onConflict: "event_id,supplier_id" })
    ).error;
  }

  if (erro) {
    console.error("[vela:contrato-fornecedor]", erro.message);
    return { error: "Não foi possível salvar o contrato." };
  }

  revalidar(eventId);
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { success: true, id: supplierId };
}

/** O contrato de assessoria: o que ela cobra da cliente neste evento. */
export async function salvarContratoAssessoria(
  eventId: string,
  input: { valor: number; assinadoEm: string | null }
): Promise<Resultado> {
  if (!valido(input.valor)) return { error: "Informe o valor do contrato." };

  const supabase = createClient();
  let erro = (
    await supabase
      .from("events")
      .update({
        contract_value: input.valor,
        contrato_assinado_em: input.assinadoEm,
      })
      .eq("id", eventId)
  ).error;

  if (erro && (erro.code === "42703" || erro.code === "PGRST204")) {
    erro = (
      await supabase
        .from("events")
        .update({ contract_value: input.valor })
        .eq("id", eventId)
    ).error;
  }

  if (erro) {
    console.error("[vela:contrato-assessoria]", erro.message);
    return { error: "Não foi possível salvar o contrato." };
  }
  revalidar(eventId);
  return { success: true };
}

/** Parcela do casal para ela — a receita da assessoria. */
export async function lancarParcelaDaAssessoria(
  eventId: string,
  input: { descricao: string; valor: number; vencimento: string; jaPaga: boolean }
): Promise<Resultado> {
  if (!valido(input.valor)) return { error: "Informe um valor válido." };
  if (!ehData(input.vencimento)) return { error: "Informe o vencimento." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      event_id: eventId,
      type: "receita",
      conta: "assessoria",
      category: "contrato",
      description: input.descricao.trim() || "Parcela",
      value: input.valor,
      due_date: input.vencimento,
      paid: input.jaPaga,
      paid_at: input.jaPaga ? input.vencimento : null,
      tipo_lancamento: "parcela",
      origem_pagamento: "cliente_direto",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[vela:parcela-assessoria]", error?.message);
    return { error: "Não foi possível lançar a parcela." };
  }
  revalidar(eventId);
  return { success: true, id: data.id as string };
}

/**
 * As parcelas do contrato de assessoria, de uma vez: o que falta lançar
 * dividido em N mensais iguais. Mesma fórmula da verba — a sobra do
 * arredondamento vai inteira para a última parcela.
 */
export async function gerarParcelasDaAssessoria(
  eventId: string,
  input: {
    restante: number;
    quantidade: number;
    primeiroVencimento: string;
    jaLancadas: number;
  }
): Promise<Resultado> {
  const n = Math.max(1, Math.min(24, Math.round(input.quantidade)));
  if (!valido(input.restante)) {
    return { error: "Não falta valor a lançar neste contrato." };
  }
  if (!ehData(input.primeiroVencimento)) return { error: "Informe a data." };

  const cada = Number((input.restante / n).toFixed(2));
  const ultima = Number((input.restante - cada * (n - 1)).toFixed(2));
  const base = new Date(input.primeiroVencimento + "T00:00:00");
  const total = input.jaLancadas + n;

  const linhas = Array.from({ length: n }, (_, i) => ({
    event_id: eventId,
    type: "receita",
    conta: "assessoria",
    category: "contrato",
    description: `Parcela ${input.jaLancadas + i + 1} de ${total}`,
    value: i === n - 1 ? ultima : cada,
    due_date: format(addMonths(base, i), "yyyy-MM-dd"),
    paid: false,
    tipo_lancamento: "parcela",
    origem_pagamento: "cliente_direto",
    installment_number: input.jaLancadas + i + 1,
    installment_total: total,
  }));

  const supabase = createClient();
  const { error } = await supabase.from("transactions").insert(linhas);
  if (error) {
    console.error("[vela:gerar-parcelas-assessoria]", error.message);
    return { error: "Não foi possível gerar as parcelas." };
  }
  revalidar(eventId);
  return { success: true };
}
