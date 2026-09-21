import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { faturasPagas, lerAssinatura } from "@/lib/pagarme";
import { conversaoDaAssinatura } from "@/lib/conversao-da-assinatura";
import { hojeBR } from "@/lib/tempo";

export const dynamic = "force-dynamic";

// A rede de segurança do teste com cartão.
//
// No oitavo dia a operadora cobra o cartão e avisa pelo webhook, que abre
// a conta como assinante. Se o aviso não chegar (fila, rede, painel da
// operadora sem o endereço), a conta em teste vencido ficaria trancada do
// lado de fora com a cobrança já feita — a pior das duas verdades. Esta
// rotina passa todo dia por quem está nessa situação e pergunta à
// operadora se a fatura FOI PAGA. Só fatura paga abre a conta: assinatura
// "ativa" com cobrança recusada continua ativa lá, e não vale.
//
// Cancelada na operadora por fora, a linha volta a ser um teste sem
// cartão: a régua da data continua valendo, sem cobrança nenhuma.

function servico() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i, x) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

type Linha = {
  id: string;
  empresa_id: string;
  gateway_subscription_id: string;
  valor_mensal: number | string | null;
  proximo_vencimento: string | null;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado no ambiente" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!process.env.PAGARME_SECRET_KEY) {
    return NextResponse.json({ ok: true, pulou: "PAGARME_SECRET_KEY ausente" });
  }

  const db = servico();
  const hoje = hojeBR();

  // teste VENCIDO com cobrança agendada: é o único caso em que a conta
  // depende de a operadora ter falado
  const { data, error } = await db
    .from("assinaturas")
    .select("id, empresa_id, gateway_subscription_id, valor_mensal, proximo_vencimento")
    .eq("status", "trial")
    .not("gateway_subscription_id", "is", null)
    .lt("teste_termina_em", hoje);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const resumo = { conferidas: 0, ativadas: 0, aguardando: 0, canceladasNaOperadora: 0, semResposta: 0, falhas: 0 };

  for (const l of (data ?? []) as Linha[]) {
    resumo.conferidas++;
    const id = l.gateway_subscription_id;
    const lida = await lerAssinatura(id);
    if (!lida.ok) {
      resumo.semResposta++;
      continue;
    }
    const g = lida.dados;

    if (g.status === "canceled") {
      const { error: e1 } = await db
        .from("assinaturas")
        .update({
          gateway_subscription_id: null,
          cartao_final: null,
          cartao_bandeira: null,
          proximo_vencimento: null,
          promocao_codigo: null,
          promocao_inicio: null,
          valor_mensal: 0,
          observacao: "cobrança do teste cancelada na operadora",
          updated_at: new Date().toISOString(),
        })
        .eq("id", l.id)
        .eq("status", "trial");
      if (e1) resumo.falhas++;
      else resumo.canceladasNaOperadora++;
      continue;
    }

    const pagas = await faturasPagas(id);
    if (!pagas.ok) {
      resumo.semResposta++;
      continue;
    }
    if (pagas.faturas.length === 0) {
      // cobrança ainda não passou (ou a operadora ainda vai tentar): a
      // porta fica fechada pela data, e a tela de assinatura diz o que fazer
      resumo.aguardando++;
      continue;
    }

    const precoCentavos = Number(g.items?.[0]?.pricing_scheme?.price);
    const preco =
      Number.isFinite(precoCentavos) && precoCentavos > 0
        ? precoCentavos / 100
        : Number(l.valor_mensal) || 0;
    const pagaEm = (pagas.faturas[0].paid_at ?? "").slice(0, 10) || hoje;

    const { error: e2 } = await db
      .from("assinaturas")
      .update({
        status: "ativa",
        ultimo_pagamento_em: pagaEm,
        valor_mensal: preco,
        proximo_vencimento:
          g.next_billing_at?.slice(0, 10) ?? g.current_cycle?.end_at?.slice(0, 10) ?? l.proximo_vencimento ?? null,
        cartao_final: g.card?.last_four_digits ?? null,
        cartao_bandeira: g.card?.brand ?? null,
        falhas_seguidas: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", l.id)
      // só vale se o webhook não passou na frente
      .eq("status", "trial");
    if (e2) {
      resumo.falhas++;
      continue;
    }
    await db.from("assinatura_eventos").insert({
      assinatura_id: l.id,
      empresa_id: l.empresa_id,
      tipo: "inicio",
      valor_antes: null,
      valor_depois: preco,
      nota: "primeira cobrança do teste confirmada pela rotina diária",
    });
    await conversaoDaAssinatura(db, l.empresa_id, id, preco);
    resumo.ativadas++;
  }

  return NextResponse.json({ ok: true, ...resumo });
}
