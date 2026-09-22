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
import { CANCELAMENTO_PENDENTE } from "@/lib/assinatura/marcadores";

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
      // Nada vai para o histórico de assinaturas aqui. O cancelamento já
      // foi gravado lá no dia em que ela cancelou; gravar de novo contava
      // a mesma conta duas vezes no churn do painel do dono (17/09/2026).
      // Esta rotina só termina, na operadora, o que já estava decidido.
      canceladasAgora++;
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

  // O TESTE COM CARTÃO (21/09/2026): ela pediu para desagendar a primeira
  // cobrança e a operadora não confirmou na hora. A linha continua em
  // teste (não perde os dias nem a promoção), com a anotação; aqui se
  // insiste até a operadora cancelar, e então a linha volta a ser um
  // teste sem cartão.
  let testesDesagendados = 0;
  let testesSemResposta = 0;
  const { data: pendentes } = await db
    .from("assinaturas")
    .select("id, gateway_subscription_id")
    .eq("status", "trial")
    .not("gateway_subscription_id", "is", null)
    .ilike("observacao", `${CANCELAMENTO_PENDENTE}%`);
  for (const t of pendentes ?? []) {
    const id = t.gateway_subscription_id as string;
    const r = await cancelarAssinatura(id);
    if (!r.ok) {
      testesSemResposta++;
      continue;
    }
    const { error: erroLimpar } = await db
      .from("assinaturas")
      .update({
        gateway_subscription_id: null,
        cartao_final: null,
        cartao_bandeira: null,
        proximo_vencimento: null,
        promocao_codigo: null,
        promocao_inicio: null,
        valor_mensal: 0,
        observacao: "cobrança do teste cancelada pela cliente (confirmada pela rotina diária)",
        updated_at: new Date().toISOString(),
      })
      .eq("id", t.id)
      .eq("status", "trial");
    if (erroLimpar) console.error("[vela:assinatura] limpar cobrança do teste:", erroLimpar.message);
    else testesDesagendados++;
  }

  return NextResponse.json({
    ok: true,
    conferidas,
    jaMortas,
    canceladasAgora,
    semResposta,
    teimosas,
    testesDesagendados,
    testesSemResposta,
  });
}
