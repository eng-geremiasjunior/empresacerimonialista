// A outra metade da promessa do cancelamento.
//
// A tela nunca recusa um cancelamento (decisão do dono, 06/09/2026): se a
// operadora falhar, a assinatura é cancelada aqui do mesmo jeito. Isso
// abriria um buraco perigoso — cancelada aqui, viva lá, cobrança no mês
// seguinte, que é exatamente o processo que a regra queria evitar. Esta
// rotina é quem fecha o buraco: todo dia ela pega o que está cancelado
// aqui e ainda tem assinatura na operadora, pergunta se aquilo continua
// vivo e, se estiver, manda cancelar de novo.
//
// Só insiste; nunca reabre. Se a operadora disser que está viva e o
// cancelamento falhar outra vez, o dono é avisado e amanhã se tenta de
// novo. Nada aqui mexe em quem está pagando: o filtro é status
// 'cancelada'.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assinaturaViva, cancelarAssinatura } from "@/lib/pagarme";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const fetchCache = "force-no-store";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no ambiente" },
      { status: 500 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const db = serviceClient();
  if (!db) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 500 }
    );
  }

  // Sem chave da operadora a rotina não tem o que conferir — e dizer isso
  // é melhor que derrubar o despachante inteiro todo dia.
  if (!process.env.PAGARME_SECRET_KEY) {
    return NextResponse.json({ ok: true, pulou: "PAGARME_SECRET_KEY ausente" });
  }

  const { data: linhas, error } = await db
    .from("assinaturas")
    .select("id, empresa_id, gateway_subscription_id")
    .eq("status", "cancelada")
    .not("gateway_subscription_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let conferidas = 0;
  let jaMortas = 0;
  let canceladasAgora = 0;
  let semResposta = 0;
  const teimosas: string[] = [];

  for (const l of linhas ?? []) {
    const id = l.gateway_subscription_id as string;
    conferidas++;

    const viva = await assinaturaViva(id);
    if (viva === null) {
      // não deu para saber (rede, instabilidade). Não saber nunca vira
      // "está morta" — tenta de novo amanhã.
      semResposta++;
      continue;
    }
    if (!viva) {
      jaMortas++;
      continue;
    }

    const r = await cancelarAssinatura(id);
    if (r.ok) {
      canceladasAgora++;
      await db.from("assinatura_eventos").insert({
        assinatura_id: l.id,
        empresa_id: l.empresa_id,
        tipo: "cancelamento",
        nota: "a rotina diária confirmou o cancelamento na operadora",
      });
      continue;
    }

    // Terceira teimosa: a assinatura está viva lá e não aceita morrer.
    // Aqui é mão humana no painel da operadora.
    teimosas.push(id);
    console.error("[vela:assinatura] cancelamento pendente na operadora:", id, r.erro);
    const { data: dono } = await db
      .from("membros_equipe")
      .select("user_id")
      .eq("empresa_id", l.empresa_id)
      .eq("is_owner", true)
      .eq("status", "ativo")
      .maybeSingle();
    if (dono?.user_id) {
      await db.from("notifications").insert({
        cerimonialista_id: dono.user_id,
        type: "pagamento",
        title: "Assinatura cancelada aqui, ainda viva na operadora",
        message:
          "Tentamos cancelar de novo e a operadora recusou. Enquanto isso não se resolver no painel dela, pode haver cobrança. Confira hoje.",
        link: "/assinatura",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    conferidas,
    jaMortas,
    canceladasAgora,
    semResposta,
    teimosas,
  });
}
