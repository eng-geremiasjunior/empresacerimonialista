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
// A DATA QUE MANDA NÃO É HOJE, É A DA PRÓXIMA COBRANÇA. A troca de preço
// vale a partir da cobrança seguinte, sem pró-rata. Perguntando "quanto
// ela deve pagar hoje?", cada degrau chegava um ciclo atrasado: no dia do
// aniversário a cobrança daquele dia já tinha saído pelo valor antigo.
// Eram quatro cobranças de R$ 27,90 contra as três prometidas no
// checkout, e a frase "a partir de 6 de dezembro, R$ 57,00" desmentida no
// próprio dia 6. Perguntando pela data da próxima cobrança, a troca cabe
// em qualquer dia do ciclo corrente — um mês inteiro de janela.
//
// QUATRO COISAS QUE ESTA ROTINA NUNCA FAZ:
//
//   1. Cobrar mais do que o degrau manda. Se a escada devolver um valor
//      acima do preço do plano, vale o do plano — erro de digitação no
//      preço não vira cobrança maior.
//   2. Chutar quando não sabe. Se a conta do degrau falhar, a linha fica
//      como está e se tenta amanhã. Não saber nunca vira "acabou a
//      promoção", que é justamente o caminho que subiria o preço. E
//      "promoção sem degrau nenhum" é não saber, não é acabou.
//   3. Andar a escada de uma conta que não está mais no plano dela. Se o
//      plano mudou por fora, o preço é do plano, não do degrau.
//   4. Gravar aqui um valor que a operadora não aceitou. Gateway
//      primeiro, banco depois — como a troca de plano já faz.
//
// Idempotente em série e em paralelo: em série porque a comparação é com
// o valor que já está gravado; em paralelo porque a gravação só vale se a
// linha ainda estiver no valor que esta execução leu, e o evento do
// painel do dono só é registrado se essa gravação de fato pegou. E como o
// degrau é calculado e não guardado, uma semana de falhas se corrige
// sozinha na execução seguinte — errando a favor da cliente, que nesse
// meio-tempo segue pagando o degrau anterior.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { atualizarPrecoAssinatura } from "@/lib/pagarme";
import {
  centavos,
  comTetoDoPlano,
  dataQueMandaNoDegrau,
  reais,
  PLANO_DA_PROMOCAO,
  PROMOCAO_LANCAMENTO,
} from "@/lib/planos";
import { hojeBR } from "@/lib/tempo";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "6 de dezembro" — a data como ela é dita no aviso e na tela. */
function dataPorExtenso(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}` : iso;
}

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
      // proximo_vencimento entra porque é ELE que decide o degrau: o
      // preço trocado hoje é o preço da cobrança daquele dia
      "id, empresa_id, plano, valor_mensal, proximo_vencimento, gateway_subscription_id, promocao_codigo, promocao_inicio"
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

  // Quantos degraus cada promoção tem, lido UMA vez e com o service role
  // — que enxerga inclusive os degraus desativados, porque `ativo` governa
  // a venda e não o contrato de quem já entrou.
  //
  // Serve para separar os dois NULLs que `valor_da_promocao` devolve:
  // "a escada acabou" (a promoção tem degraus e os meses dela passaram) de
  // "não existe escada nenhuma" (o dono apagou as linhas). O primeiro sobe
  // o preço para o do catálogo; o segundo é não saber, e não saber nunca
  // pode virar um salto de R$ 27,90 para R$ 97,00 na conta de quem está no
  // primeiro mês.
  const { data: deg, error: erroDegraus } = await db
    .from("plano_promocao")
    .select("codigo");
  if (erroDegraus) {
    return NextResponse.json({ error: erroDegraus.message }, { status: 500 });
  }
  const quantosDegraus = new Map<string, number>();
  for (const d of (deg ?? []) as { codigo: string }[]) {
    quantosDegraus.set(d.codigo, (quantosDegraus.get(d.codigo) ?? 0) + 1);
  }

  // A promoção acabou para esta linha: as duas colunas saem juntas e a
  // linha sai do alcance desta rotina para sempre. Sem isso, um reajuste
  // futuro no catálogo subiria o preço destas contas sozinho, sem ninguém
  // decidir — e reajuste é decisão de produto, não de cron.
  const limparPromocao = (id: string) =>
    db
      .from("assinaturas")
      .update({
        promocao_codigo: null,
        promocao_inicio: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

  let conferidas = 0;
  let emDia = 0;
  let mudadas = 0;
  let encerradas = 0;
  let semCatalogo = 0;
  let semResposta = 0;
  let foraDoPlano = 0;
  const falhas: string[] = [];

  for (const l of linhas ?? []) {
    conferidas++;

    const codigo = String(l.promocao_codigo);

    // A promoção vale num plano só, e o acoplamento entre os dois vive em
    // TS. Se o plano da conta mudou por fora (o dono subindo alguém para o
    // Master pelo /admin, por exemplo) sem limpar as colunas de promoção,
    // seguir andando a escada puxaria a mensalidade de R$ 199,00 de volta
    // para R$ 27,90 — com os tetos do Master. A linha fica como está e
    // aparece na contagem, para o dono ver que existe.
    if (codigo === PROMOCAO_LANCAMENTO && String(l.plano) !== PLANO_DA_PROMOCAO) {
      foraDoPlano++;
      console.error("[vela:promocao] em promoção fora do plano dela:", l.id, l.plano);
      continue;
    }

    const plano = catalogo.get(String(l.plano));
    if (!plano || !(plano.valor > 0)) {
      // plano sem preço no catálogo: subir para "cheio" aqui seria
      // inventar um número. Fica como está.
      semCatalogo++;
      continue;
    }

    // Escada sem âncora: código gravado e data de início não. A função do
    // banco devolveria NULL, que aqui significa "acabou" — e acabou sobe o
    // preço. Sem data, o certo é não saber. (A 153 confere esta mesma
    // invariante no bloco de conferência.)
    if (!l.promocao_inicio) {
      semResposta++;
      console.error("[vela:promocao] promoção sem data de início:", l.id, codigo);
      continue;
    }

    // Promoção sem degrau nenhum não é escada acabada, é escada sumida —
    // e "não sei" jamais sobe preço. Ver o censo de degraus acima.
    if (!(quantosDegraus.get(codigo) ?? 0)) {
      semResposta++;
      console.error("[vela:promocao] promoção sem degrau, linha intocada:", l.id, codigo);
      continue;
    }

    // Não "hoje": o dia da próxima cobrança. É essa a cobrança que o novo
    // preço vai alcançar.
    const referencia = dataQueMandaNoDegrau(
      l.proximo_vencimento as string | null,
      hoje
    );

    const { data: doDegrau, error: erroDegrau } = await db.rpc("valor_da_promocao", {
      p_codigo: l.promocao_codigo,
      p_inicio: l.promocao_inicio,
      p_hoje: referencia,
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
      // Fim da escada com o valor já coincidindo — acontece se o dono
      // baixar o catálogo até o degrau. Sem limpar aqui, a linha ficaria
      // em promoção para sempre, e no dia em que o catálogo voltasse ao
      // normal esta rotina subiria o preço dela sozinha. A limpeza não
      // pode morar só no ramo que troca o preço.
      if (acabou) {
        const { error: erroLimpeza } = await limparPromocao(String(l.id));
        if (erroLimpeza) {
          falhas.push(`${l.id}: encerrar a promoção falhou`);
          console.error("[vela:promocao] encerrar promoção:", l.id, erroLimpeza.message);
        } else {
          encerradas++;
        }
      }
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
    //
    // O `.eq("valor_mensal", ...)` é o que faz esta gravação valer só se a
    // linha ainda estiver como esta execução a leu. Duas execuções no
    // mesmo minuto (um retry da Vercel, o dono disparando à mão) não fazem
    // dano em dinheiro — o PUT na operadora é idempotente —, mas as duas
    // registrariam o mesmo evento e o painel do dono somaria a expansão
    // duas vezes no NRR do mês.
    const filtroDoValor = db
      .from("assinaturas")
      .update({
        valor_mensal: alvo,
        ...(acabou ? { promocao_codigo: null, promocao_inicio: null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", l.id);
    const { data: gravadas, error: erroUpdate } = await (
      l.valor_mensal === null || l.valor_mensal === undefined
        ? filtroDoValor.is("valor_mensal", null)
        : filtroDoValor.eq("valor_mensal", l.valor_mensal as number)
    ).select("id");
    if (erroUpdate) {
      // a operadora já cobra o novo valor: silêncio aqui deixaria o banco
      // mentindo sobre o preço até alguém reparar
      falhas.push(`${l.id}: gravar ${reais(alvo)} falhou`);
      console.error("[vela:promocao] gravar novo degrau:", l.id, erroUpdate.message);
      continue;
    }
    if (!gravadas || gravadas.length === 0) {
      // outra execução andou este degrau primeiro: o preço lá fora já é o
      // certo e o evento dela já está registrado
      emDia++;
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

    // O AVISO A ELA. `assinatura_eventos` é log do painel do dono, não
    // recado para a cliente — e quem assinou por R$ 27,90 não pode
    // descobrir o R$ 57,00 pela fatura do cartão. Os Termos prometem
    // aviso com antecedência, e a antecedência é justamente esta: o preço
    // acaba de mudar na operadora e a cobrança nova é a de `referencia`,
    // um ciclo à frente. Uma notificação por degrau — este trecho só roda
    // quando a gravação acima de fato pegou.
    if (centavos(alvo) > centavos(antes)) {
      const { data: dona } = await db
        .from("membros_equipe")
        .select("user_id")
        .eq("empresa_id", l.empresa_id)
        .eq("is_owner", true)
        .eq("status", "ativo")
        .maybeSingle();
      if (dona?.user_id) {
        await db.from("notifications").insert({
          cerimonialista_id: dona.user_id,
          type: "pagamento",
          title: `Sua mensalidade passa a ser ${reais(alvo)}`,
          message: `Na cobrança de ${dataPorExtenso(referencia)}, o valor combinado quando você assinou passa a valer: ${reais(alvo)} por mês. Você pode cancelar quando quiser, sem multa.`,
          link: "/assinatura",
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    conferidas,
    emDia,
    mudadas,
    encerradas,
    semCatalogo,
    semResposta,
    foraDoPlano,
    falhas,
  });
}
