import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lerAssinatura } from "@/lib/pagarme";
import { hojeBR } from "@/lib/tempo";
import { registrarErroDoServidor } from "@/lib/registro-do-sistema";
import { conversaoDaAssinatura } from "@/lib/conversao-da-assinatura";
import { COBRANCA_RECUSADA } from "@/lib/assinatura/marcadores";

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
    await registrarErroDoServidor({ area: "Aviso da operadora", codigo: registro.error.code ?? "registro" });
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
    // proximo_vencimento entra na leitura porque o patch abaixo o usa como
    // valor de queda: é o fim do período pago, e a cortesia da 151 conta
    // a partir dele
    .select("id, empresa_id, status, falhas_seguidas, proximo_vencimento, valor_mensal")
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
    await registrarErroDoServidor({ area: "Aviso da operadora: leitura", codigo: "leitura", empresaId: linha.empresa_id });
    // aqui SIM vale o gateway tentar de novo: foi falha de leitura nossa
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const g = atual.dados;
  const pagou = corpo.type === "charge.paid" || corpo.type === "invoice.paid";
  const falhou =
    corpo.type === "charge.payment_failed" || corpo.type === "invoice.payment_failed";
  const cancelou = corpo.type === "subscription.canceled" || g.status === "canceled";

  // O que o aviso pode mudar depende de como a conta está AQUI (17/09/2026).
  //
  // Cartão recusado no checkout cria na operadora uma assinatura "failed",
  // avisa a falha e, minutos depois, cancela essa assinatura que nunca
  // existiu de verdade (medido no log do gateway, 31/08). Antes, esses dois
  // avisos viravam "inadimplente" e depois "cancelada" numa conta EM
  // TESTE: o gatilho da 154 apagava o fim do teste, e ela perdia o teste
  // por ter tentado pagar. Agora:
  //   · cancelamento só vale para quem pagava;
  //   · cobrança recusada só marca atraso em quem estava ativa;
  //   · pagamento confirmado ativa qualquer conta que não esteja ativa.
  //
  // O TESTE COM CARTÃO (21/09/2026) acrescenta a quarta regra, e ela é de
  // dinheiro: numa assinatura agendada, "active" na operadora NÃO quer
  // dizer "pagou" — no 8º dia ela vira active e gera a fatura ANTES de o
  // cartão responder, e continua active com a cobrança recusada. Para a
  // conta em teste, só a fatura PAGA (charge.paid / invoice.paid) abre a
  // conta; qualquer outro aviso a deixa em teste. Sem isto, um
  // invoice.created abria a conta sem um centavo, mandava Purchase à Meta
  // e apagava o fim do teste.
  const emTeste = linha.status === "trial";
  const pagava = ["ativa", "inadimplente", "pausada"].includes(linha.status);
  const statusNovo = cancelou
    ? pagava
      ? "cancelada"
      : linha.status
    : falhou
      ? linha.status === "ativa"
        ? "inadimplente"
        : linha.status
      : pagou || (g.status === "active" && !emTeste)
        ? "ativa"
        : linha.status;

  // Cobrança do teste cancelada na operadora (pelo dono no painel dela,
  // ou por ela mesma): a linha volta a ser um teste sem cartão na hora —
  // a tela e os e-mails param de anunciar uma cobrança que não vai sair.
  if (emTeste && cancelou) {
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
        observacao: `cobrança do teste cancelada na operadora (aviso ${corpo.type})`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", linha.id)
      .eq("status", "trial");
    if (erroLimpar) {
      console.error("[vela:pagarme] limpar cobrança do teste:", erroLimpar.message);
      await db
        .from("gateway_evento")
        .update({ empresa_id: linha.empresa_id, erro: erroLimpar.message })
        .eq("id", registro.data.id);
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    await db
      .from("gateway_evento")
      .update({ empresa_id: linha.empresa_id, processado_em: new Date().toISOString() })
      .eq("id", registro.data.id);
    return NextResponse.json({ ok: true, testeSemCartao: true });
  }

  // O preço que a operadora está cobrando, em reais. É ele que o histórico
  // do painel do dono precisa; sem ele, a conta entrava no MRR com R$ 0.
  const precoCentavos = Number(g.items?.[0]?.pricing_scheme?.price);
  const precoDaOperadora =
    Number.isFinite(precoCentavos) && precoCentavos > 0 ? precoCentavos / 100 : null;
  const valorAqui = Number(linha.valor_mensal) || 0;

  const patch: Record<string, unknown> = {
    status: statusNovo,
    // Assinatura encerrada não tem próxima cobrança, e o gateway devolve
    // nulo — mas esta coluna é o FIM DO PERÍODO PAGO, e é dela que a
    // cortesia de 30 dias conta (151). Apagá-la fazia a conta congelar
    // cerca de 25 dias antes do combinado. Sem data nova, mantém-se a
    // que havia: o que foi pago continua tendo sido pago.
    proximo_vencimento:
      g.next_billing_at?.slice(0, 10) ??
      g.current_cycle?.end_at?.slice(0, 10) ??
      linha.proximo_vencimento ??
      null,
    cartao_final: g.card?.last_four_digits ?? null,
    cartao_bandeira: g.card?.brand ?? null,
    updated_at: new Date().toISOString(),
  };
  if (pagou) {
    patch.ultimo_pagamento_em = hojeBR();
    patch.falhas_seguidas = 0;
  }
  // A recusa no checkout já foi contada lá; aqui conta a de quem já paga.
  if (falhou && pagava) patch.falhas_seguidas = (linha.falhas_seguidas ?? 0) + 1;
  // A primeira cobrança do teste recusada fica anotada: é o que deixa a
  // tela e o e-mail dizerem "não passou" só quando o sistema sabe.
  if (falhou && emTeste) patch.observacao = `${COBRANCA_RECUSADA} ${hojeBR()}`;
  // Brasília, como a 151 mede a cortesia — ver o comentário em actions.ts.
  // Só no dia em que a conta passa a cancelada: um segundo aviso de
  // cancelamento empurrava a data para frente, e o congelamento junto.
  if (statusNovo === "cancelada" && linha.status !== "cancelada") {
    patch.cancelada_em = hojeBR();
  }
  // Conta que sai do teste pelo aviso passa a ter o valor que está sendo
  // cobrado (o checkout grava o valor só quando a cobrança passa na hora).
  if (statusNovo === "ativa" && emTeste && precoDaOperadora !== null) {
    patch.valor_mensal = precoDaOperadora;
  }

  const { error: erroUpdate } = await db
    .from("assinaturas")
    .update(patch)
    .eq("id", linha.id);

  if (erroUpdate) {
    console.error("[vela:pagarme] update:", erroUpdate.message);
    await registrarErroDoServidor({ area: "Aviso da operadora", codigo: erroUpdate.code ?? "update", empresaId: linha.empresa_id });
    await db
      .from("gateway_evento")
      .update({ empresa_id: linha.empresa_id, erro: erroUpdate.message })
      .eq("id", registro.data.id);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  // A validade do cartão, para o painel avisar antes de vencer. Numa
  // atualização à parte e sem derrubar nada: as colunas vêm da 123
  // reaplicada, e um banco sem elas não pode fazer o aviso falhar.
  const mesDoCartao = Number(g.card?.exp_month);
  const anoDoCartao = Number(g.card?.exp_year);
  if (mesDoCartao >= 1 && mesDoCartao <= 12 && anoDoCartao >= 2000) {
    const { error: erroCartao } = await db
      .from("assinaturas")
      .update({ cartao_mes: mesDoCartao, cartao_ano: anoDoCartao })
      .eq("id", linha.id);
    if (erroCartao && erroCartao.code !== "PGRST204") {
      console.error("[vela:pagarme] validade do cartão:", erroCartao.code);
    }
  }

  // O histórico que o painel do dono lê para o MRR (123): só transição
  // de verdade vira linha, senão a métrica conta pagamento como upgrade.
  //   teste → ativa         início, com o valor cobrado
  //   cancelada → ativa     reativação, com o valor cobrado
  //   pausada → ativa       retomada
  //   pagante → cancelada   cancelamento, com o valor de antes
  //   ativa ↔ inadimplente  nada: no histórico ela nunca deixou de pagar;
  //                         cobrança atrasada que foi paga não é "voltou"
  if (statusNovo !== linha.status) {
    const valorCobrado = precoDaOperadora ?? (valorAqui > 0 ? valorAqui : null);
    const evento =
      statusNovo === "cancelada"
        ? { tipo: "cancelamento", valor_antes: valorAqui, valor_depois: null }
        : statusNovo === "ativa" && linha.status === "trial"
          ? { tipo: "inicio", valor_antes: null, valor_depois: valorCobrado }
          : statusNovo === "ativa" && linha.status === "cancelada"
            ? { tipo: "reativacao", valor_antes: null, valor_depois: valorCobrado }
            : statusNovo === "ativa" && linha.status === "pausada"
              ? { tipo: "retomada", valor_antes: null, valor_depois: valorCobrado }
              : null;
    if (evento) {
      await db.from("assinatura_eventos").insert({
        assinatura_id: linha.id,
        empresa_id: linha.empresa_id,
        ...evento,
        nota: `webhook ${corpo.type}`,
      });
    }
    // O teste com cartão (21/09/2026) vira venda AQUI, sem ninguém na
    // tela: a primeira cobrança saiu pela operadora. O anúncio recebe o
    // Purchase pelo servidor, com o id da assinatura para não contar duas
    // vezes se o aviso se repetir. Só com a fatura PAGA (é a única
    // transição trial → ativa que existe acima).
    if (statusNovo === "ativa" && linha.status === "trial") {
      await conversaoDaAssinatura(db, linha.empresa_id, assinaturaId, valorCobrado);
    }
  }

  await db
    .from("gateway_evento")
    .update({ empresa_id: linha.empresa_id, processado_em: new Date().toISOString() })
    .eq("id", registro.data.id);

  return NextResponse.json({ ok: true });
}
