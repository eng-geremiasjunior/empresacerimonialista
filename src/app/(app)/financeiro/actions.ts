"use server";

// Ações do financeiro da EMPRESA (business_transactions).
// Nunca escrevem em `transactions` (financeiro de eventos).

import { revalidatePath } from "next/cache";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

type Resultado = { error?: string };

function revalidate() {
  revalidatePath("/financeiro");
  revalidatePath("/eventos/dashboard");
}

export type LancamentoInput = {
  type: "receita" | "despesa";
  category: string;
  description: string | null;
  value: number;
  due_date: string;
  recurring: boolean;
};

function validar(input: LancamentoInput): string | null {
  if (input.type !== "receita" && input.type !== "despesa") {
    return "Tipo inválido";
  }
  if (!input.category) return "Escolha uma categoria";
  if (!Number.isFinite(input.value) || input.value <= 0) {
    return "Informe um valor maior que zero";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due_date)) return "Data inválida";
  return null;
}

export async function criarLancamentoEmpresa(
  input: LancamentoInput
): Promise<Resultado> {
  const erro = validar(input);
  if (erro) return { error: erro };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase.from("business_transactions").insert({
    cerimonialista_id: user.id,
    type: input.type,
    category: input.category,
    description: input.description?.trim() || null,
    value: input.value,
    due_date: input.due_date,
    paid: true,
    paid_at: new Date().toISOString(),
    recurring: input.recurring,
  });

  if (error) return { error: "Não foi possível salvar o lançamento" };
  revalidate();
  return {};
}

export async function editarLancamentoEmpresa(
  id: string,
  input: LancamentoInput
): Promise<Resultado> {
  const erro = validar(input);
  if (erro) return { error: erro };

  const supabase = createClient();
  const { error } = await supabase
    .from("business_transactions")
    .update({
      category: input.category,
      description: input.description?.trim() || null,
      value: input.value,
      due_date: input.due_date,
      recurring: input.recurring,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações" };
  revalidate();
  return {};
}

export async function excluirLancamentoEmpresa(id: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("business_transactions")
    .delete()
    .eq("id", id);

  if (error) return { error: "Não foi possível excluir" };
  revalidate();
  return {};
}

// "Puxar receita dos eventos do mês": soma os valores JÁ RECEBIDOS em
// `transactions` (financeiro dos eventos) no mês atual — apenas como
// referência — e grava aqui um lançamento próprio, editável, sem vínculo
// com os eventos.
export async function puxarReceitaEventosMes(): Promise<
  Resultado & { valor?: number }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const inicio = iso(startOfMonth(new Date()));
  const fim = iso(endOfMonth(new Date()));

  const { data } = await supabase
    .from("transactions")
    .select("value")
    .eq("type", "receita")
    .eq("paid", true)
    .gte("due_date", inicio)
    .lte("due_date", fim);

  const total = (data ?? []).reduce((s, r) => s + Number(r.value ?? 0), 0);
  if (total <= 0) {
    return { error: "Nenhum valor recebido nos eventos este mês" };
  }

  const mesLabel = format(new Date(), "MM/yyyy");
  const { error } = await supabase.from("business_transactions").insert({
    cerimonialista_id: user.id,
    type: "receita",
    category: "servico_prestado",
    description: `Receita dos eventos — ${mesLabel}`,
    value: total,
    due_date: iso(new Date()),
    paid: true,
    paid_at: new Date().toISOString(),
    recurring: false,
  });

  if (error) return { error: "Não foi possível registrar a receita" };
  revalidate();
  return { valor: total };
}

// Atalho "Lançar mesmo valor este mês" das despesas recorrentes.
export async function lancarDespesaFixa(
  category: string,
  value: number,
  due_date: string,
  recurring: boolean
): Promise<Resultado> {
  return criarLancamentoEmpresa({
    type: "despesa",
    category,
    description: null,
    value,
    due_date,
    recurring,
  });
}
