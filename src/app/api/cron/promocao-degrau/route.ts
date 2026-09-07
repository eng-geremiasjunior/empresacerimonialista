// A escada da promoção de lançamento, andada um degrau por vez.
//
// A 153 guarda só o código da promoção e o dia em que ela começou; qual
// degrau vale HOJE é conta, feita por `valor_da_promocao`. Esta rotina é
// a mão que executa essa conta: todo dia ela pergunta quanto cada conta
// em promoção deveria pagar e, se o que a operadora cobra for diferente,
// troca o preço do item da assinatura — o mesmo caminho da troca de
// plano, que já está no ar.
//
// Por que trocar o preço e não usar o desconto por ciclos da operadora:
// dois descontos se somariam nos primeiros meses e a documentação não
// define ordem entre eles. Um preço só, trocado na hora certa, não tem
// ambiguidade.
//
// TRÊS COISAS QUE ESTA ROTINA NUNCA FAZ:
//
//   1. Cobrar mais do que o degrau manda. Se a escada devolver um valor
//      acima do preço do plano, vale o do plano — erro de digitação no
//      preço não vira cobrança maior.
//   2. Chutar quando não sabe. Se a conta do degrau falhar, a linha fica
//      como está e se tenta amanhã. Não saber nunca vira "acabou a
//      promoção", que é justamente o caminho que subiria o preço.
//   3. Gravar aqui um valor que a operadora não aceitou. Gateway
//      primeiro, banco depois — como a troca de plano já faz.
//
// Idempotente: rodar duas vezes no mesmo dia não faz nada na segunda,
// porque a comparação é com o valor que já está gravado. E como o degrau
// é calculado e não guardado, uma semana de falhas se corrige sozinha na
// execução seguinte — errando a favor da cliente, que nesse meio-tempo
// segue pagando o degrau anterior.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { atualizarPrecoAssinatura } from "@/lib/pagarme";
import { centavos, comTetoDoPlano, reais } from "@/lib/planos";
import { hojeBR } from "@/lib/tempo";

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

  // Sem chave da operadora não há preço para trocar. Dizer isso é melhor
  // que derrubar o despachante inteiro todo dia.
  if (!process.env.PAGARME_SECRET_KEY) {
    return NextResponse.json({ ok: true, pulou: "PAGARME_SECRET_KEY ausente" });
  }

  const hoje = hojeBR();

  // Só quem está pagando: cancelada e pausada não têm preço a subir, e
  // mexer no item de uma assinatura cancelada seria ressuscitar cobrança.
  const { data: linhas, error } = await db
    .from("assinaturas")
    .select(
      "id, empresa_id, plano, valor_mensal, gateway_subscription_id, promocao_codigo, promocao_inicio"
    )
    .in("status", ["ativa", "inadimplente"])
    .not("promocao_codigo", "is", null)
    .not("gateway_subscription_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // O preço cheio vem do catálogo, nunca escrito aqui. Sem filtrar por
  // `ativo`: se o dono tirar um plano de venda, quem já paga por ele
  // continua tendo um preço — e é esse que a escada precisa alcançar.
  const { data: cat, error: erroCatalogo } = await db
    .from("plano_catalogo")
    .select("codigo, nome, valor_mensal");
  if (erroCatalogo) {
    return NextResponse.json({ error: erroCatalogo.message }, { status: 500 });
  }
  const catalogo = new Map(
    ((cat ?? []) as { codigo: string; nome: string; valor_mensal: number | string }[]).map((p) => [
      p.codigo,
      { nome: p.nome, valor: Number(p.valor_mensal) },
    ])
  );

  let conferidas = 0;
  let emDia = 0;
  let mudadas = 0;
  let encerradas = 0;
  let semCatalogo = 0;
  let semResposta = 0;
  const falhas: string[] = [];

  for (const l of linhas ?? []) {
    conferidas++;

    const plano = catalogo.get(String(l.plano));
    if (!plano || !(plano.valor > 0)) {
      // plano sem preço no catálogo: subir para "cheio" aqui seria
      // inventar um número. Fica como está.
      semCatalogo++;
      continue;
    }

    const { data: doDegrau, error: erroDegrau } = await db.rpc("valor_da_promocao", {
      p_codigo: l.promocao_codigo,
      p_inicio: l.promocao_inicio,
      p_hoje: hoje,
    });
    if (erroDegrau) {
      semResposta++;
      console.error("[vela:promocao] valor_da_promocao falhou:", l.id, erroDegrau.message);
      continue;
    }

    // null = a escada acabou; daí em diante vale o preço do plano.
    const acabou = doDegrau === null || doDegrau === undefined;
    const bruto = acabou ? plano.valor : Number(doDegrau);
    if (!Number.isFinite(bruto)) {
      semResposta++;
      console.error("[vela:promocao] degrau ilegível:", l.id, String(doDegrau));
      continue;
    }
    // o teto de segurança: degrau nenhum custa mais que o plano
    const alvo = comTetoDoPlano(bruto, plano.valor);
    if (centavos(alvo) <= 0) {
      // preço zerado não é degrau, é engano de digitação — e mandá-lo à
      // operadora transformaria a assinatura em cortesia sem ninguém pedir
      semCatalogo++;
      console.error("[vela:promocao] degrau zerado, ignorado:", l.id);
      continue;
    }
    const antes = Number(l.valor_mensal ?? 0);

    // Idempotência: o que já está no valor certo não vira chamada à
    // operadora. Comparação em centavos porque é assim que se cobra.
    if (centavos(antes) === centavos(alvo)) {
      emDia++;
      continue;
    }

    // Gateway primeiro. Se a operadora recusar, nada muda aqui e amanhã
    // se tenta de novo — a cliente segue no degrau anterior, que é o
    // único lado em que esse erro pode cair.
    const r = await atualizarPrecoAssinatura(
      l.gateway_subscription_id as string,
      centavos(alvo),
      `Plano ${plano.nome}`
    );
    if (!r.ok) {
      falhas.push(`${l.gateway_subscription_id}: ${r.erro}`);
      console.error("[vela:promocao] operadora recusou o novo degrau:", l.id, r.erro);
      continue;
    }

    // No fim da escada as duas colunas são limpas junto com o preço: a
    // linha sai do alcance desta rotina para sempre. Sem isso, um reajuste
    // futuro no catálogo subiria o preço destas contas sozinho, sem
    // ninguém decidir — e reajuste é decisão de produto, não de cron.
    const { error: erroUpdate } = await db
      .from("assinaturas")
      .update({
        valor_mensal: alvo,
        ...(acabou ? { promocao_codigo: null, promocao_inicio: null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", l.id);
    if (erroUpdate) {
      // a operadora já cobra o novo valor: silêncio aqui deixaria o banco
      // mentindo sobre o preço até alguém reparar
      falhas.push(`${l.id}: gravar ${reais(alvo)} falhou`);
      console.error("[vela:promocao] gravar novo degrau:", l.id, erroUpdate.message);
      continue;
    }

    mudadas++;
    if (acabou) encerradas++;

    await db.from("assinatura_eventos").insert({
      assinatura_id: l.id,
      empresa_id: l.empresa_id,
      // a escada sobe, então é 'upgrade'; a alternativa só aparece se o
      // dono baixar o catálogo abaixo do degrau, e aí o painel do dono
      // precisa ler a verdade
      tipo: alvo >= antes ? "upgrade" : "downgrade",
      valor_antes: antes,
      valor_depois: alvo,
      nota: acabou
        ? `fim da promoção ${l.promocao_codigo}: passa a pagar o ${plano.nome}, ${reais(alvo)}`
        : `promoção ${l.promocao_codigo}: novo degrau, ${reais(alvo)}`,
    });
  }

  return NextResponse.json({
    ok: true,
    conferidas,
    emDia,
    mudadas,
    encerradas,
    semCatalogo,
    semResposta,
    falhas,
  });
}
