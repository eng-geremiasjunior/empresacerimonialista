"use server";

// O que a família pede pelo portal sobre dinheiro (178) — o lado da
// equipe. Ajuste de um fornecedor: ela responde. Gasto enviado: ela lança
// na verba (vira despesa avulsa, com o que a família disse) ou responde.
// A RLS da 178 deixa só a equipe do evento responder, e o gatilho não
// deixa mudar o que a família escreveu.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hojeBR } from "@/lib/tempo";
import { lancarNaVerba } from "./tela-actions";

export type PedidoDaFamilia = {
  id: string;
  tipo: "ajuste" | "gasto";
  rotulo: string;
  texto: string | null;
  valor: number | null;
  pago: boolean;
  autor: string | null;
  estado: "aguardando" | "lancado" | "respondido";
  resposta: string | null;
  criadoEm: string;
};

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/financeiro`);
  revalidatePath(`/portal/${eventId}/investimento`);
}

export async function carregarPedidosDaFamilia(eventId: string): Promise<PedidoDaFamilia[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("dinheiro_pedido")
    .select("id, tipo, rotulo, texto, valor, pago, autor_nome, estado, resposta, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(20);
  // sem a 178 aplicada, não há pedido nenhum
  if (error || !data) return [];
  return (data as {
    id: string;
    tipo: "ajuste" | "gasto";
    rotulo: string;
    texto: string | null;
    valor: number | null;
    pago: boolean;
    autor_nome: string | null;
    estado: PedidoDaFamilia["estado"];
    resposta: string | null;
    created_at: string;
  }[]).map((p) => ({
    id: p.id,
    tipo: p.tipo,
    rotulo: p.rotulo,
    texto: p.texto,
    valor: p.valor === null ? null : Number(p.valor),
    pago: p.pago,
    autor: p.autor_nome,
    estado: p.estado,
    resposta: p.resposta,
    criadoEm: p.created_at,
  }));
}

export async function responderPedidoDaFamilia(
  eventId: string,
  pedidoId: string,
  resposta: string
): Promise<{ ok: true } | { error: string }> {
  const texto = resposta.trim().slice(0, 600);
  if (!texto) return { error: "Escreva a resposta para a família." };
  const supabase = createClient();
  const { error } = await supabase
    .from("dinheiro_pedido")
    .update({ estado: "respondido", resposta: texto })
    .eq("id", pedidoId)
    .eq("event_id", eventId);
  if (error) return { error: "Não foi possível responder agora." };
  revalidar(eventId);
  return { ok: true };
}

/** O gasto que a família enviou vira despesa da verba. */
export async function lancarPedidoDaFamilia(
  eventId: string,
  pedidoId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("dinheiro_pedido")
    .select("id, tipo, rotulo, texto, valor, pago, estado")
    .eq("id", pedidoId)
    .eq("event_id", eventId)
    .maybeSingle();
  const pedido = p as { tipo: string; rotulo: string; texto: string | null; valor: number | null; pago: boolean; estado: string } | null;
  if (!pedido || pedido.tipo !== "gasto" || pedido.estado !== "aguardando") {
    return { error: "Esse pedido já foi resolvido." };
  }
  const r = await lancarNaVerba(eventId, {
    descricao: [pedido.rotulo, pedido.texto].filter(Boolean).join(" · ").slice(0, 120),
    valor: Number(pedido.valor ?? 0),
    vencimento: hojeBR(),
    supplierId: null,
    objetivoId: null,
    doCaixa: false,
    jaPaga: pedido.pago,
  });
  if ("error" in r) return { error: r.error ?? "Não foi possível lançar." };
  const { error } = await supabase
    .from("dinheiro_pedido")
    .update({ estado: "lancado", transaction_id: r.id ?? null })
    .eq("id", pedidoId);
  if (error) return { error: "Lançado na verba, mas o pedido não foi fechado. Recarregue a página." };
  revalidar(eventId);
  return { ok: true };
}
