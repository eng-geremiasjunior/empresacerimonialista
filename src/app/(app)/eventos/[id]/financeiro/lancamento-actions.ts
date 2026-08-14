"use server";

// Criar lançamento, fechar o evento, conciliar extrato.
//
// Tudo que a tela nova precisa escrever mora aqui. O que já existia
// (marcarPago, criarTransacao) continua onde estava — não duplico ação.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { error: string } | { success: true; id?: string };

/* ------------------------------------------------------------------
 * Lançamento
 * ---------------------------------------------------------------- */

export type NovoLancamentoInput = {
  direcao: "entrada" | "saida";
  descricao: string;
  valor: number;
  vencimento: string;
  supplierId: string | null;
  objetivoId: string | null;
  tipo: "sinal" | "parcela" | "saldo" | "extra" | "entrada";
  /** só faz sentido em saída: de onde sai o dinheiro */
  origem: "cliente_direto" | "caixa";
  jaPago: boolean;
  /** quando > 1, gera a série toda com vencimento mensal */
  parcelas: number;
};

export async function criarLancamento(
  eventId: string,
  input: NovoLancamentoInput
): Promise<Resultado> {
  if (!input.descricao.trim()) return { error: "Informe a descrição." };
  if (!Number.isFinite(input.valor) || input.valor <= 0) {
    return { error: "Informe um valor válido." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.vencimento)) {
    return { error: "Informe a data." };
  }

  const supabase = createClient();
  const n = Math.max(1, Math.min(36, Math.round(input.parcelas)));
  const entrada = input.direcao === "entrada";

  // Despesa da verba do evento exige fornecedor (CHECK da 063): sem saber
  // a quem, não dá para prestar contas. Sem fornecedor, a saída é custo
  // dela — conta da assessoria —, e aí não abate o caixa do evento.
  if (!entrada && input.origem === "caixa" && !input.supplierId) {
    return {
      error:
        "Escolha o fornecedor: sem ele, o pagamento não sai da verba do evento e sim do seu próprio custo.",
    };
  }

  const conta =
    input.supplierId || (entrada && input.origem === "caixa")
      ? "fornecedor"
      : "assessoria";

  const linhas = Array.from({ length: n }, (_, i) => {
    const d = new Date(input.vencimento + "T00:00:00");
    d.setMonth(d.getMonth() + i);
    return {
      event_id: eventId,
      type: entrada ? "receita" : "despesa",
      description:
        n > 1 ? `${input.descricao.trim()} ${i + 1}/${n}` : input.descricao.trim(),
      value: Number((input.valor / (n > 1 ? n : 1)).toFixed(2)),
      due_date: d.toISOString().slice(0, 10),
      paid: i === 0 ? input.jaPago : false,
      paid_at: i === 0 && input.jaPago ? new Date().toISOString() : null,
      category: "outro",
      conta,
      supplier_id: input.supplierId,
      objetivo_id: input.objetivoId,
      tipo_lancamento: n > 1 && i > 0 ? "parcela" : input.tipo,
      origem_pagamento: entrada ? "cliente_direto" : input.origem,
      installment_number: n > 1 ? i + 1 : null,
      installment_total: n > 1 ? n : null,
    };
  });

  const { error } = await supabase.from("transactions").insert(linhas);
  if (error) return { error: "Não foi possível lançar." };

  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true };
}

export async function excluirLancamento(
  eventId: string,
  id: string
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("event_id", eventId);
  if (error) return { error: "Não foi possível excluir." };
  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true };
}

/** O teto da verba combinado com a cliente. */
export async function salvarVerbaTotal(
  eventId: string,
  valor: number | null
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ verba_total: valor })
    .eq("id", eventId);
  if (error) return { error: "Não foi possível salvar a verba." };
  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true };
}

/* ------------------------------------------------------------------
 * Fechamento
 * ---------------------------------------------------------------- */

export async function fecharEvento(
  eventId: string,
  input: {
    sobraDestino: "devolvida" | "virou_extra" | "nao_houve";
    observacao: string;
  }
): Promise<Resultado> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: n } = await supabase.rpc("numeros_do_fechamento", {
    p_event_id: eventId,
  });
  const num = n as Record<string, number | null> | null;
  if (!num) return { error: "Não foi possível calcular os números." };

  // fotografia do momento: os números de hoje mudam se alguém editar um
  // lançamento antigo, e prestação de contas entregue não muda depois
  const { error } = await supabase.from("evento_fechamento").upsert(
    {
      event_id: eventId,
      fechado_por: user?.id ?? null,
      fechado_em: new Date().toISOString(),
      verba_prevista: num.verba_total ?? num.alocado ?? 0,
      verba_realizada: num.pago_fornecedores ?? 0,
      receita_assessoria: num.receita_assessoria ?? 0,
      custos_diretos: num.custos_diretos ?? 0,
      sobra_destino: input.sobraDestino,
      observacao: input.observacao.trim() || null,
    },
    { onConflict: "event_id" }
  );

  if (error) return { error: "Não foi possível fechar o evento." };
  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true };
}

export async function reabrirFechamento(eventId: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_fechamento")
    .delete()
    .eq("event_id", eventId);
  if (error) return { error: "Não foi possível reabrir." };
  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true };
}

/* ------------------------------------------------------------------
 * Conciliação por extrato
 * ---------------------------------------------------------------- */

export type LinhaExtrato = {
  fitid: string | null;
  data: string;
  valor: number;
  descricao: string;
};

/**
 * Guarda as linhas do extrato. O fitid é o identificador da transação no
 * padrão OFX — é ele que impede a mesma linha de entrar duas vezes
 * quando ela reimporta o arquivo do mês.
 */
export async function importarExtrato(
  eventId: string,
  arquivo: string,
  linhas: LinhaExtrato[]
): Promise<Resultado & { importadas?: number; repetidas?: number }> {
  if (linhas.length === 0) return { error: "O arquivo não tem lançamentos." };

  const supabase = createClient();
  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string }[] | null)?.[0];
  if (!cargo?.empresa_id) return { error: "Empresa não encontrada." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const datas = linhas.map((l) => l.data).sort();
  const { data: imp, error: eImp } = await supabase
    .from("extrato_importacao")
    .insert({
      empresa_id: cargo.empresa_id,
      event_id: eventId,
      arquivo_nome: arquivo,
      periodo_de: datas[0],
      periodo_ate: datas[datas.length - 1],
      importado_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (eImp || !imp) return { error: "Não foi possível registrar a importação." };

  // uma a uma: o índice único por fitid recusa as repetidas, e queremos
  // saber quantas foram em vez de perder o lote inteiro
  let importadas = 0;
  let repetidas = 0;
  for (const l of linhas) {
    const { error } = await supabase.from("extrato_linha").insert({
      importacao_id: imp.id,
      empresa_id: cargo.empresa_id,
      fitid: l.fitid,
      data: l.data,
      valor: l.valor,
      descricao: l.descricao,
    });
    if (error) repetidas++;
    else importadas++;
  }

  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true, id: imp.id, importadas, repetidas };
}

/** Liga a linha do extrato ao lançamento e marca pago. */
export async function conciliar(
  eventId: string,
  linhaId: string,
  transactionId: string
): Promise<Resultado> {
  const supabase = createClient();

  const { data: linha } = await supabase
    .from("extrato_linha")
    .select("data, valor")
    .eq("id", linhaId)
    .single();
  if (!linha) return { error: "Linha do extrato não encontrada." };

  const { error: e1 } = await supabase
    .from("transactions")
    .update({
      paid: true,
      paid_at: linha.data,
      value: Math.abs(Number(linha.valor)),
    })
    .eq("id", transactionId)
    .eq("event_id", eventId);
  if (e1) return { error: "Não foi possível marcar como pago." };

  await supabase
    .from("extrato_linha")
    .update({
      transaction_id: transactionId,
      conciliado_em: new Date().toISOString(),
    })
    .eq("id", linhaId);

  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true };
}

export async function ignorarLinhaExtrato(
  eventId: string,
  linhaId: string
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("extrato_linha")
    .update({ ignorada: true })
    .eq("id", linhaId);
  if (error) return { error: "Não foi possível ignorar." };
  revalidatePath(`/eventos/${eventId}/financeiro`);
  return { success: true };
}

/** As linhas ainda não conciliadas, com os candidatos de cada uma. */
export async function linhasParaConciliar(eventId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("extrato_linha")
    .select("id, data, valor, descricao, transaction_id, ignorada")
    .eq("ignorada", false)
    .is("transaction_id", null)
    .order("data", { ascending: false })
    .limit(100);

  const linhas = (data ?? []) as {
    id: string;
    data: string;
    valor: number;
    descricao: string | null;
  }[];

  // os candidatos vêm da RPC, que já filtra por evento visível
  const comCandidatos = await Promise.all(
    linhas.map(async (l) => {
      const { data: cands } = await supabase.rpc("sugerir_conciliacao", {
        p_linha_id: l.id,
      });
      return {
        ...l,
        valor: Number(l.valor),
        candidatos: ((cands ?? []) as Record<string, unknown>[]).map((c) => ({
          id: c.transaction_id as string,
          descricao: (c.descricao as string) ?? "Lançamento",
          valor: Number(c.valor),
          vencimento: c.vencimento as string,
          fornecedor: (c.fornecedor as string) ?? null,
          evento: (c.evento as string) ?? "",
          distancia: c.distancia_dias as number,
        })),
      };
    })
  );

  return comCandidatos;
}
