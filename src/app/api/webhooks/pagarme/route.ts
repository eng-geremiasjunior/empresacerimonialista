import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lerAssinatura } from "@/lib/pagarme";

export const dynamic = "force-dynamic";

// O webhook do Pagar.me.
//
// Três decisões que valem mais que o código:
//
// 1) O AVISO NÃO É A VERDADE. Um webhook diz "algo aconteceu com a
//    assinatura X"; a gente então RELÊ a assinatura na API autenticada e
//    grava o que ela disser. Assim, mesmo que alguém descubra a URL e
//    forje um "pagamento aprovado", nada entra: a API não confirma.
//
// 2) IDEMPOTÊNCIA. A mesma notificação chega duas, três vezes (o painel
//    tenta 3x por padrão). Sem trava, cada repetição viraria um evento
//    novo no histórico e o MRR do painel mentiria. O id do evento é
//    único na tabela gateway_evento — repetido para na porta.
//
// 3) RESPONDER 200 QUASE SEMPRE. Se a gente devolver erro, o gateway
//    reenvia — e um bug nosso vira uma fila de repetições. Só devolve
//    erro o que ELE deve tentar de novo (falha nossa de banco); o resto
//    é registrado e encerrado.

function servico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (i: RequestInfo | URL, x?: RequestInit) =>
          fetch(i, { ...x, cache: "no-store" }),
      },
    }
  );
}

/** Basic auth configurada no painel do gateway. Sem ela, ninguém entra. */
function autenticado(request: NextRequest): boolean {
  const user = process.env.PAGARME_WEBHOOK_USER;
  const senha = process.env.PAGARME_WEBHOOK_SENHA;
  // Sem credencial configurada, a porta fica FECHADA — o contrário
  // (aceitar tudo) transformaria um esquecimento de configuração numa
  // porta aberta para forjar pagamento.
  if (!user || !senha) {
    console.error("[vela:pagarme] webhook sem credencial configurada");
    return false;
  }
  const cabecalho = request.headers.get("authorization") ?? "";
  if (!cabecalho.startsWith("Basic ")) return false;
  const esperado = Buffer.from(`${user}:${senha}`).toString("base64");
  const recebido = cabecalho.slice(6).trim();
  // comparação de tamanho fixo evita medir tempo para adivinhar a senha
  if (recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) {
    diferenca |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  }
  return diferenca === 0;
}

type Corpo = {
  id?: string;
  type?: string;
  created_at?: string;
  data?: Record<string, unknown>;
};

/** O id da assinatura, venha o evento de invoice, charge ou subscription. */
function idDaAssinatura(corpo: Corpo): string | null {
  const d = (corpo.data ?? {}) as Record<string, any>;
  return (
    d.subscription?.id ??
    d.invoice?.subscription?.id ??
    d.charge?.invoice?.subscription?.id ??
    (corpo.type?.startsWith("subscription") ? d.id : null) ??
    null
  );
}

export async function POST(request: NextRequest) {
  if (!autenticado(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as Corpo | null;
  if (!corpo?.id || !corpo.type) {
    return NextResponse.json({ ok: false, erro: "corpo" }, { status: 400 });
  }

  const db = servico();

  // idempotência: a mesma notificação não é processada duas vezes
  const registro = await db
    .from("gateway_evento")
    .insert({
      gateway: "pagarme",
      evento_id: corpo.id,
      tipo: corpo.type,
      payload: corpo as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (registro.error) {
    // 23505 = já processamos este evento; responder 200 para o gateway
    // parar de reenviar
    if (registro.error.code === "23505") {
      return NextResponse.json({ ok: true, repetido: true });
    }
    console.error("[vela:pagarme] registro:", registro.error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const assinaturaId = idDaAssinatura(corpo);
  if (!assinaturaId) {
    // evento que não fala de assinatura (ou formato novo): fica no log
    await db
      .from("gateway_evento")
      .update({ processado_em: new Date().toISOString(), erro: "sem assinatura no payload" })
      .eq("id", registro.data.id);
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const { data: linha } = await db
    .from("assinaturas")
    .select("id, empresa_id, status, falhas_seguidas")
    .eq("gateway_subscription_id", assinaturaId)
    .maybeSingle();

  if (!linha) {
    await db
      .from("gateway_evento")
      .update({ processado_em: new Date().toISOString(), erro: "assinatura desconhecida" })
      .eq("id", registro.data.id);
    return NextResponse.json({ ok: true, desconhecida: true });
  }

  // A VERDADE vem da API, não do aviso
  const atual = await lerAssinatura(assinaturaId);
  if (!atual.ok) {
    await db
      .from("gateway_evento")
      .update({ empresa_id: linha.empresa_id, erro: atual.erro })
      .eq("id", registro.data.id);
    // aqui SIM vale o gateway tentar de novo: foi falha de leitura nossa
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const g = atual.dados;
  const pagou = corpo.type === "charge.paid" || corpo.type === "invoice.paid";
  const falhou =
    corpo.type === "charge.payment_failed" || corpo.type === "invoice.payment_failed";
  const cancelou = corpo.type === "subscription.canceled" || g.status === "canceled";

  const statusNovo = cancelou
    ? "cancelada"
    : falhou
      ? "inadimplente"
      : pagou || g.status === "active"
        ? "ativa"
        : linha.status;

  const patch: Record<string, unknown> = {
    status: statusNovo,
    proximo_vencimento:
      g.next_billing_at?.slice(0, 10) ?? g.current_cycle?.end_at?.slice(0, 10) ?? null,
    cartao_final: g.card?.last_four_digits ?? null,
    cartao_bandeira: g.card?.brand ?? null,
    updated_at: new Date().toISOString(),
  };
  if (pagou) {
    patch.ultimo_pagamento_em = new Date().toISOString().slice(0, 10);
    patch.falhas_seguidas = 0;
  }
  if (falhou) patch.falhas_seguidas = (linha.falhas_seguidas ?? 0) + 1;
  if (cancelou) patch.cancelada_em = new Date().toISOString().slice(0, 10);

  const { error: erroUpdate } = await db
    .from("assinaturas")
    .update(patch)
    .eq("id", linha.id);

  if (erroUpdate) {
    console.error("[vela:pagarme] update:", erroUpdate.message);
    await db
      .from("gateway_evento")
      .update({ empresa_id: linha.empresa_id, erro: erroUpdate.message })
      .eq("id", registro.data.id);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  // O histórico que o painel do dono lê para o MRR (123): só transição
  // de verdade vira linha, senão a métrica conta pagamento como upgrade.
  if (statusNovo !== linha.status) {
    const tipo =
      statusNovo === "cancelada"
        ? "cancelamento"
        : linha.status === "cancelada" || linha.status === "trial"
          ? "inicio"
          : statusNovo === "ativa" && linha.status === "inadimplente"
            ? "reativacao"
            : null;
    if (tipo) {
      await db.from("assinatura_eventos").insert({
        assinatura_id: linha.id,
        empresa_id: linha.empresa_id,
        tipo,
        nota: `webhook ${corpo.type}`,
      });
    }
  }

  await db
    .from("gateway_evento")
    .update({ empresa_id: linha.empresa_id, processado_em: new Date().toISOString() })
    .eq("id", registro.data.id);

  return NextResponse.json({ ok: true });
}
