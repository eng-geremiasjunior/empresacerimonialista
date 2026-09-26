"use server";

// A tela Dinheiro do portal v2 (178). Quem trava é o banco: as funções
// portal_* só aceitam quem é cliente do evento e só a verba (nunca a
// assessoria); o lado "só de vocês" tem RLS só da família.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Retorno = { ok: true } | { error: string };

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/investimento`);
  revalidatePath(`/portal/${eventoId}`);
}

const ERROS: Record<string, string> = {
  inexistente: "Não encontramos esse pagamento.",
  comprovante: "Comprovante inválido.",
  ja_pago: "Esse pagamento já está marcado.",
  pelo_caixa: "Esse pagamento sai do caixa da cerimonialista.",
  data_futura: "A data do pagamento não pode ser depois de hoje.",
  nada_a_desfazer: "Não há o que desfazer.",
};

function valorValido(v: number): boolean {
  return Number.isFinite(v) && v >= 0 && v <= 10_000_000;
}

export async function marcarPago(
  eventoId: string,
  transacaoId: string,
  f: { pagoEm: string | null; comprovantePath: string | null; comprovanteNome: string | null }
): Promise<Retorno> {
  if (f.pagoEm && !/^\d{4}-\d{2}-\d{2}$/.test(f.pagoEm)) return { error: "Confira a data." };
  if (f.comprovantePath && !f.comprovantePath.startsWith(`${eventoId}/familia/`)) {
    return { error: "Comprovante inválido." };
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_marcar_pago", {
    p_transaction_id: transacaoId,
    p_pago_em: f.pagoEm,
    p_comprovante_path: f.comprovantePath,
    p_comprovante_nome: f.comprovanteNome,
  });
  const r = data as { ok: boolean; erro?: string } | null;
  if (error || !r?.ok) return { error: ERROS[r?.erro ?? ""] ?? "Não foi possível marcar agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function desfazerPago(eventoId: string, transacaoId: string): Promise<Retorno> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_desfazer_pago", { p_transaction_id: transacaoId });
  const r = data as { ok: boolean; erro?: string } | null;
  if (error || !r?.ok) return { error: ERROS[r?.erro ?? ""] ?? "Não foi possível desfazer agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function pedirAjuste(
  eventoId: string,
  f: { supplierId: string | null; rotulo: string; texto: string }
): Promise<Retorno> {
  const texto = f.texto.trim().slice(0, 600);
  if (!texto) return { error: "Conte o que precisa mudar." };
  const supabase = createClient();
  const { error } = await supabase.from("dinheiro_pedido").insert({
    event_id: eventoId,
    tipo: "ajuste",
    supplier_id: f.supplierId,
    rotulo: f.rotulo.trim().slice(0, 80) || "Pagamento",
    texto,
  });
  if (error) return { error: "Não foi possível enviar agora. Tente de novo." };
  revalidar(eventoId);
  return { ok: true };
}

export async function tirarPedido(eventoId: string, pedidoId: string): Promise<Retorno> {
  const supabase = createClient();
  const { error } = await supabase.from("dinheiro_pedido").delete().eq("id", pedidoId).eq("estado", "aguardando");
  if (error) return { error: "Não foi possível tirar agora." };
  revalidar(eventoId);
  return { ok: true };
}

/* ---------------- só de vocês ---------------- */

export async function salvarOrcamento(eventoId: string, valor: number | null): Promise<Retorno> {
  if (valor !== null && (!Number.isFinite(valor) || valor < 0 || valor > 100_000_000)) {
    return { error: "Confira o valor." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("familia_orcamento")
    .upsert({ event_id: eventoId, valor }, { onConflict: "event_id" });
  if (error) return { error: "Não foi possível salvar agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function adicionarGasto(
  eventoId: string,
  f: { nome: string; valor: number; categoria?: string | null }
): Promise<Retorno> {
  const nome = f.nome.trim().slice(0, 80);
  if (!nome) return { error: "Dê um nome ao gasto." };
  if (!valorValido(f.valor)) return { error: "Confira o valor." };
  const supabase = createClient();
  const { error } = await supabase.from("familia_gasto").insert({
    event_id: eventoId,
    nome,
    valor: f.valor,
    categoria: f.categoria?.trim().slice(0, 80) || null,
  });
  if (error) return { error: "Não foi possível adicionar agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function alternarGastoPago(eventoId: string, gastoId: string, pago: boolean): Promise<Retorno> {
  const supabase = createClient();
  const { error } = await supabase.from("familia_gasto").update({ pago }).eq("id", gastoId);
  if (error) return { error: "Não foi possível salvar agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function apagarGasto(eventoId: string, gastoId: string): Promise<Retorno> {
  const supabase = createClient();
  const { error } = await supabase.from("familia_gasto").delete().eq("id", gastoId);
  if (error) return { error: "Não foi possível apagar agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function enviarGasto(eventoId: string, gastoId: string): Promise<Retorno> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_enviar_gasto", { p_gasto_id: gastoId });
  const r = data as { ok: boolean } | null;
  if (error || !r?.ok) return { error: "Não foi possível enviar agora." };
  revalidar(eventoId);
  return { ok: true };
}
