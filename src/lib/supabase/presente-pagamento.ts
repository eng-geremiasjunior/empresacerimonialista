import "server-only";

// O estado de um pagamento de presente (197), gravado a partir do que a
// Pagar.me diz — nunca do que o navegador ou o aviso dizem. Quem grava (a
// rota que a página do convidado pergunta, o webhook e a rotina diária)
// passa por aqui, para as passagens valerem igual nos três:
//
//   aguardando → pago, expirado ou falhou
//   expirado / falhou → pago   (a confirmação que chegou depois do prazo:
//                               o dinheiro está com a família)
//   pago → estornado           (a Pagar.me devolveu ou houve contestação)
//
// "pago" nunca volta para trás por outro caminho, e cada gravação confere
// o estado de antes (duas gravações ao mesmo tempo não se atropelam).

import type { SupabaseClient } from "@supabase/supabase-js";
import { estadoDoPedido, foiEstornado, type PedidoGateway } from "@/lib/pagarme-lista";

export type EstadoDoPresente = "aguardando" | "pago" | "expirado" | "falhou" | "estornado";

export async function gravarEstadoDoPresente(
  db: SupabaseClient,
  pagamento: { id: string; status: string; expira_em: string | null },
  pedido: PedidoGateway
): Promise<EstadoDoPresente> {
  const agora = new Date().toISOString();
  const antes = pagamento.status as EstadoDoPresente;

  let novo: EstadoDoPresente;
  if (antes === "pago") {
    if (!foiEstornado(pedido)) return "pago";
    novo = "estornado";
  } else if (antes === "estornado") {
    return "estornado";
  } else {
    novo = estadoDoPedido(pedido, pagamento.expira_em);
    const vale = antes === "aguardando" ? novo !== "aguardando" : novo === "pago";
    if (!vale) return antes;
  }

  const { data } = await db
    .from("presente_pagamento")
    .update({
      status: novo,
      conferido_em: agora,
      ...(novo === "pago" ? { pago_em: pedido.charges?.[0]?.paid_at ?? agora } : {}),
      updated_at: agora,
    })
    .eq("id", pagamento.id)
    .eq("status", antes)
    .select("status");
  if (data && data.length > 0) return novo;
  // outra gravação chegou antes: vale o que está no banco agora
  const { data: atual } = await db.from("presente_pagamento").select("status").eq("id", pagamento.id).maybeSingle();
  return ((atual as { status?: EstadoDoPresente } | null)?.status ?? antes) as EstadoDoPresente;
}
