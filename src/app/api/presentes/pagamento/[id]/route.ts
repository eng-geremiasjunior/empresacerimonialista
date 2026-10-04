import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lerPedido } from "@/lib/pagarme-lista";
import { gravarEstadoDoPresente } from "@/lib/supabase/presente-pagamento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// O convidado espera o Pix cair: a página pergunta aqui a cada poucos
// segundos. O webhook acelera, mas a verdade é a API da Pagar.me: se o
// pagamento ainda está aguardando, relemos o pedido — no máximo uma vez a
// cada 4 s por pagamento, e a vez é tomada no banco (um UPDATE que só um
// pedido ganha), para uma rajada de perguntas não virar uma rajada de
// leituras na Pagar.me. Devolve SÓ o estado — o id é um uuid sorteado, e
// nada do convidado nem do casal sai daqui.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RELER_A_CADA_MS = 4000;

function servico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });
}

const resposta = (status: string, codigo = 200) =>
  NextResponse.json({ status }, { status: codigo, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id ?? "")) return resposta("desconhecido", 404);
  const db = servico();
  const agora = new Date().toISOString();

  // a vez de reler: só quem marca conferido_em agora segue para a Pagar.me
  const { data: vez } = await db
    .from("presente_pagamento")
    .update({ conferido_em: agora })
    .eq("id", params.id)
    .eq("status", "aguardando")
    .not("pagarme_order_id", "is", null)
    .or(`conferido_em.is.null,conferido_em.lt."${new Date(Date.now() - RELER_A_CADA_MS).toISOString()}"`)
    .select("id, status, pagarme_order_id, expira_em, meio")
    .maybeSingle();

  if (!vez) {
    const { data } = await db.from("presente_pagamento").select("status").eq("id", params.id).maybeSingle();
    const p = data as { status: string } | null;
    return p ? resposta(p.status) : resposta("desconhecido", 404);
  }

  const v = vez as { id: string; status: string; pagarme_order_id: string; expira_em: string | null; meio: string | null };
  const r = await lerPedido(v.pagarme_order_id);
  if (!r.ok) return resposta(v.status);
  return resposta(await gravarEstadoDoPresente(db, v, r.dados));
}
