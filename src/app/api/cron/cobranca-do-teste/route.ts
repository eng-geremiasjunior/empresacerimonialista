import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assinaturasFuturas,
  cancelarAssinatura,
  diaDoPagamento,
  faturasPagas,
  lerAssinatura,
} from "@/lib/pagarme";
import { conversaoDaAssinatura } from "@/lib/conversao-da-assinatura";
import { hojeBR } from "@/lib/tempo";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

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
//
// E a reconciliação: uma assinatura AGENDADA na operadora que não tem
// conta aqui (resposta perdida no cadastro, conta desfeita sem conseguir
// cancelar) cobraria no 8º dia sem dono. A rotina lista as futuras na
// operadora e cancela as que nenhuma linha conhece.

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

const LIMPEZA = {
  gateway_subscription_id: null,
  cartao_final: null,
  cartao_bandeira: null,
  proximo_vencimento: null,
  promocao_codigo: null,
  promocao_inicio: null,
  valor_mensal: 0,
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

  const resumo = {
    conferidas: 0,
    ativadas: 0,
    aguardando: 0,
    canceladasNaOperadora: 0,
    semResposta: 0,
    falhas: 0,
    orfasCanceladas: 0,
    orfasSemResposta: 0,
  };

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
      const { data: limpas, error: e1 } = await db
        .from("assinaturas")
        .update({
          ...LIMPEZA,
          observacao: "cobrança do teste cancelada na operadora",
          updated_at: new Date().toISOString(),
        })
        .eq("id", l.id)
        .eq("status", "trial")
        .select("id");
      if (e1) resumo.falhas++;
      else if (limpas?.length) resumo.canceladasNaOperadora++;
      continue;
    }

    const pagas = await faturasPagas(id);
    if (!pagas.ok) {
      resumo.semResposta++;
      continue;
    }
    if (pagas.faturas.length === 0) {
      // cobrança ainda não passou (ou a operadora ainda vai tentar): a
      // porta fecha pela data, e a tela de assinatura diz o que fazer
      resumo.aguardando++;
      continue;
    }

    const precoCentavos = Number(g.items?.[0]?.pricing_scheme?.price);
    const preco =
      Number.isFinite(precoCentavos) && precoCentavos > 0
        ? precoCentavos / 100
        : Number(l.valor_mensal) || 0;
    const pagaEm = diaDoPagamento(pagas.faturas[0]) ?? hoje;

    const { data: ativadas, error: e2 } = await db
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
      // só vale se o webhook não passou na frente — e se passou, o
      // histórico e a conversão já são dele
      .eq("status", "trial")
      .select("id");
    if (e2) {
      resumo.falhas++;
      continue;
    }
    if (!ativadas?.length) continue;
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

  // As agendadas sem dono. Só o que está "future" (ainda não cobrou) e
  // que nenhuma linha daqui conhece.
  const futuras = await assinaturasFuturas();
  if (futuras.ok && futuras.lista.length > 0) {
    const ids = futuras.lista.map((s) => s.id);
    const { data: conhecidas } = await db
      .from("assinaturas")
      .select("gateway_subscription_id")
      .in("gateway_subscription_id", ids);
    const nossas = new Set((conhecidas ?? []).map((c) => c.gateway_subscription_id as string));
    for (const s of futuras.lista) {
      if (nossas.has(s.id)) continue;
      const r = await cancelarAssinatura(s.id);
      if (r.ok) resumo.orfasCanceladas++;
      else {
        resumo.orfasSemResposta++;
        console.error("[vela:teste] assinatura agendada sem dono não cancelada:", s.id);
      }
    }
  }

  return NextResponse.json({ ok: true, ...resumo });
}
