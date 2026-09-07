"use server";

// A assinatura pelo lado da cerimonialista: assinar, mudar de plano,
// trocar o cartão, cancelar. O cartão nunca passa por aqui — só o token
// que o navegador pegou direto com o gateway.
//
// Depois de cada operação a gente grava o que o GATEWAY devolveu, nunca
// o que a tela achou que ia acontecer.

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServico } from "@supabase/supabase-js";
import { documentoValido } from "@/lib/documento";
import { cepValido, telefoneValido, ufValida } from "@/lib/contato";
import {
  atualizarCliente,
  atualizarPrecoAssinatura,
  cancelarAssinatura,
  criarAssinatura,
  criarCliente,
  trocarCartao,
} from "@/lib/pagarme";
import {
  centavos,
  comTetoDoPlano,
  ehCodigoDoPlano,
  getEscadaDaPromocao,
  getPlano,
  podeEntrarNaPromocao,
  PLANO_DA_PROMOCAO,
  PROMOCAO_LANCAMENTO,
} from "@/lib/planos";
import { registrarConversao } from "@/lib/conversoes";
import { COOKIE_ORIGEM } from "@/lib/marketing";
import { hojeBR } from "@/lib/tempo";
import { TERMOS_VERSAO } from "@/lib/termos";

export type ResultadoAssinatura = { ok?: boolean; error?: string };

/**
 * Escrita em `assinaturas` é do sistema, não da usuária: a tabela nasceu
 * (123) sem policy de escrita justamente para o valor do plano não
 * depender de quem está logado. Por isso o service role aqui — depois de
 * confirmar o cargo pela sessão dela.
 */
function servico() {
  return createServico(
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

/** Quem é a dona logada — e a empresa dela. Nada acontece sem isto. */
async function donaLogada(): Promise<
  { empresaId: string; userId: string; nome: string; email: string } | { error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const { data: cargo } = await supabase.rpc("meu_cargo");
  const c = (cargo as { empresa_id: string; cargo: string }[] | null)?.[0];
  if (!c || c.cargo !== "proprietaria") {
    return { error: "Só a proprietária da conta pode mexer na assinatura." };
  }

  const { data: membro } = await supabase
    .from("membros_equipe")
    .select("nome")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    empresaId: c.empresa_id,
    userId: user.id,
    nome: membro?.nome ?? user.email ?? "Cerimonialista",
    email: user.email ?? "",
  };
}

/**
 * A origem do clique, como o navegador a guardou na criação da conta.
 * Lê o cookie e devolve só as colunas que a tabela conhece — nada do que
 * vier ali é confiado às cegas, e nada disso identifica pessoa.
 */
function lerOrigemDoCookie(): Record<string, string> | null {
  try {
    const cru = cookies().get(COOKIE_ORIGEM)?.value;
    if (!cru) return null;
    const o = JSON.parse(cru) as Record<string, unknown>;
    const permitidas: Record<string, string> = {};
    const mapa: Record<string, string> = {
      fbp: "fbp",
      fbc: "fbc",
      gaClientId: "ga_client_id",
      gclid: "gclid",
      utm_source: "utm_source",
      utm_medium: "utm_medium",
      utm_campaign: "utm_campaign",
    };
    for (const [doCookie, naTabela] of Object.entries(mapa)) {
      const v = o[doCookie];
      if (typeof v === "string" && v.trim()) permitidas[naTabela] = v.slice(0, 300);
    }
    return Object.keys(permitidas).length ? permitidas : null;
  } catch {
    return null;
  }
}

export type DadosCobranca = {
  nome: string;
  email: string;
  documento: string;
  telefone: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

/**
 * Tudo o que o gateway exige de quem paga, validado aqui antes de sair
 * daqui. Cada campo abaixo já custou uma cobrança recusada com mensagem
 * em inglês — validar antes é a diferença entre "confira o telefone" e
 * "At least one customer phone is required".
 */
function conferirCobranca(d: DadosCobranca): string | null {
  if (!d.nome.trim()) return "Informe o nome de quem vai pagar.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) {
    return "Informe um e-mail válido para a cobrança.";
  }
  if (!documentoValido(d.documento)) {
    return "Informe um CPF ou CNPJ válido de quem vai pagar.";
  }
  if (!telefoneValido(d.telefone)) {
    return "Informe um telefone válido, com DDD.";
  }
  if (!cepValido(d.cep)) return "Informe um CEP válido.";
  if (!d.rua.trim()) return "Informe a rua.";
  if (!d.numero.trim()) return "Informe o número.";
  if (!d.bairro.trim()) return "Informe o bairro.";
  if (!d.cidade.trim()) return "Informe a cidade.";
  if (!ufValida(d.estado)) return "Informe o estado (sigla de duas letras).";
  return null;
}

type ContextoDaDona = { empresaId: string; userId: string; nome: string; email: string };

/**
 * O que precisa estar certo ANTES de qualquer coisa acontecer.
 *
 * Sem o aceite não há contrato, e sem contrato não há o que cobrar. A
 * caixinha da tela já segura o botão; isto é para quem chamar a action
 * por fora dela.
 *
 * Existe como função própria — e não no meio da cobrança — porque a porta
 * pública precisa conferir tudo isto ANTES de criar a conta. Sem isso,
 * `/comecar` seria uma fábrica de contas: bastava mandar nome e e-mail,
 * sem cartão nenhum, e a conta nascia.
 */
/**
 * Um cliente sem poder nenhum, só para CONFERIR UMA SENHA.
 *
 * Não persiste sessão: a conferência é a resposta, e o que ela devolve
 * morre aqui — nenhum cookie do navegador é tocado.
 */
function criarAnonimo() {
  return createServico(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function conferirPedido(
  planoCodigo: string,
  cardToken: string,
  cobranca: DadosCobranca,
  aceitouTermos: boolean
): string | null {
  if (aceitouTermos !== true) {
    return "Para assinar, é preciso aceitar os Termos e Condições.";
  }
  if (!cardToken) return "Não recebemos os dados do cartão.";
  if (!ehCodigoDoPlano(planoCodigo)) return "Escolha um plano.";
  return conferirCobranca(cobranca);
}

/** A porta de quem JÁ ESTÁ LOGADA — a tela de assinatura de dentro do app. */
export async function assinar(
  planoCodigo: string,
  cardToken: string,
  cobranca: DadosCobranca,
  aceitouTermos: boolean
): Promise<ResultadoAssinatura> {
  const ctx = await donaLogada();
  if ("error" in ctx) return { error: ctx.error };
  return assinarPara(ctx, planoCodigo, cardToken, cobranca, aceitouTermos);
}

/**
 * A porta de quem CHEGA DO ANÚNCIO e ainda não tem conta.
 *
 * Não existe conta gratuita, então pedir para se cadastrar, sair, abrir o
 * e-mail e voltar para pagar é perder no caminho quem já tinha decidido
 * pagar. Aqui a conta nasce e a cobrança acontece no mesmo envio.
 *
 * A conta nasce JÁ CONFIRMADA, e isso é decisão de produto, não atalho:
 * quem põe um cartão que a operadora aprova está mais verificada do que
 * quem clica num link de e-mail. A confirmação por e-mail continua ligada
 * para todo o resto do sistema.
 *
 * A ORDEM É CONTA PRIMEIRO, COBRANÇA DEPOIS, e não há como ser diferente:
 * a cobrança precisa de uma empresa para pendurar a assinatura. Se o
 * cartão for recusado, a conta fica de pé sem assinatura — que é
 * exatamente o estado de quem se cadastrou e ainda não pagou, e a porta
 * de `porta-da-assinatura.ts` a manda para o checkout até pagar.
 *
 * Quem já tem conta NÃO passa por aqui: a resposta diz para entrar. Sem
 * isso, um e-mail já cadastrado viraria uma segunda cobrança sem dono.
 */
export async function assinarCriandoConta(
  dados: {
    nome: string;
    negocio: string;
    email: string;
    senha: string;
  },
  planoCodigo: string,
  cardToken: string,
  cobranca: DadosCobranca,
  aceitouTermos: boolean
): Promise<ResultadoAssinatura | { error: string; jaTemConta?: true }> {
  const nome = dados.nome?.trim() ?? "";
  const negocio = dados.negocio?.trim() ?? "";
  const email = dados.email?.trim().toLowerCase() ?? "";
  const senha = dados.senha ?? "";

  if (nome.length < 2) return { error: "Escreva seu nome." };
  if (negocio.length < 2) return { error: "Escreva o nome do seu negócio." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Confira o e-mail digitado." };
  if (senha.length < 6) return { error: "A senha precisa de pelo menos 6 caracteres." };

  // TUDO CONFERIDO ANTES DE A CONTA NASCER. Sem esta linha aqui em cima,
  // este endereço público seria uma fábrica de contas: bastava mandar
  // nome e e-mail, sem cartão nenhum, e a conta existia.
  const pedido = conferirPedido(planoCodigo, cardToken, cobranca, aceitouTermos);
  if (pedido) return { error: pedido };

  const db = servico();

  // Cria a conta. `email_confirm: true` porque o cartão é a verificação —
  // e porque, sem isso, ela não teria sessão para nada depois de pagar.
  const { data: criada, error: erroCriar } = await db.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    // as mesmas chaves que o gatilho de signup lê: 'empresa' vira o nome
    // da empresa, 'name' vira o nome da pessoa em membros_equipe
    user_metadata: { empresa: negocio, name: nome },
  });

  let userId = criada?.user?.id ?? null;

  if (erroCriar || !userId) {
    const jaExiste =
      erroCriar?.code === "email_exists" ||
      /already been registered|already exists/i.test(erroCriar?.message ?? "");
    if (!jaExiste) {
      // só o CÓDIGO do erro: a mensagem do Supabase pode repetir o e-mail
      // digitado, e log não é lugar de dado de quem está comprando
      console.error("[vela:assinatura] criar conta:", erroCriar?.code ?? "sem código");
      return { error: "Não foi possível criar a conta agora. Tente de novo em alguns instantes." };
    }

    // A CONTA JÁ EXISTE — e o caso mais provável NÃO é fraude, é ela
    // mesma: o cartão foi recusado na primeira tentativa, a conta ficou
    // criada, ela corrigiu o número e clicou de novo. Barrar aqui seria
    // trancar a compradora do lado de fora no exato momento em que ela
    // estava pagando.
    //
    // Quem prova que é ela é a SENHA. Se confere, segue a compra na conta
    // que já existe; se não confere, não há o que fazer aqui — entrar
    // primeiro é o caminho.
    const conferindo = criarAnonimo();
    const { data: entrou } = await conferindo.auth.signInWithPassword({
      email,
      password: senha,
    });
    userId = entrou?.user?.id ?? null;
    // a sessão criada só para conferir a senha não serve para mais nada
    await conferindo.auth.signOut();
    if (!userId) {
      return {
        error: "Já existe uma conta com este e-mail. Entre para assinar.",
        jaTemConta: true,
      };
    }
  }

  // O gatilho de signup cria empresa e vínculo. É ele quem manda — aqui
  // só se espera a linha aparecer, porque a cobrança precisa do
  // empresa_id. Se não aparecer, a conta existe e ela paga na tela
  // seguinte: melhor do que cobrar sem saber de quem é a assinatura.
  let empresaId: string | null = null;
  for (let tentativa = 0; tentativa < 8 && !empresaId; tentativa++) {
    const { data: vinculo } = await db
      .from("membros_equipe")
      .select("empresa_id")
      .eq("user_id", userId)
      .maybeSingle();
    empresaId = vinculo?.empresa_id ?? null;
    if (!empresaId) await new Promise((r) => setTimeout(r, 250));
  }
  if (!empresaId) {
    console.error("[vela:assinatura] empresa não provisionada para", userId);
    return {
      error:
        "Sua conta foi criada, mas o pagamento não foi concluído. Entre com seu e-mail e senha para assinar.",
    };
  }

  // A conta nasceu. O evento sai pelo SERVIDOR porque esta tela não tem
  // pixel — há campos de cartão nela, e script de terceiro não entra em
  // formulário de pagamento. Sem valor: criar conta não é dinheiro.
  try {
    const h0 = headers();
    const o = lerOrigemDoCookie();
    await registrarConversao({
      tipo: "conta_criada",
      email,
      idDoEvento: `conta:${empresaId}`,
      origem: {
        fbp: o?.fbp ?? null,
        fbc: o?.fbc ?? null,
        gaClientId: o?.ga_client_id ?? null,
        ip: h0.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h0.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
  } catch (e) {
    console.error("[vela:conversao] conta:", String(e).slice(0, 200));
  }

  return assinarPara(
    { empresaId, userId, nome, email },
    planoCodigo,
    cardToken,
    cobranca,
    aceitouTermos
  );
}

/**
 * Assinar, para uma conta que já existe.
 *
 * NÃO é exportada, de propósito: neste arquivo `"use server"`, exportar
 * significaria abrir um endereço público que aceita `ctx` de fora — e
 * `ctx` diz de QUAL empresa é a cobrança. Quem chama tem de provar quem
 * é primeiro; são as duas portas abaixo que fazem isso.
 */
async function assinarPara(
  ctx: ContextoDaDona,
  planoCodigo: string,
  cardToken: string,
  cobranca: DadosCobranca,
  aceitouTermos: boolean
): Promise<ResultadoAssinatura> {
  const problema = conferirPedido(planoCodigo, cardToken, cobranca, aceitouTermos);
  if (problema) return { error: problema };

  // O preço vem do catálogo (147), não de variável de ambiente: o que ela
  // escolheu na tela é o que vai para o gateway e para o banco, com o
  // mesmo número. Plano fora do catálogo não é "mensal" disfarçado — é
  // erro, porque o CHECK da tabela recusaria de todo jeito.
  if (!ehCodigoDoPlano(planoCodigo)) return { error: "Escolha um plano." };
  const plano = await getPlano(planoCodigo);
  if (!plano) {
    return { error: "Este plano não está disponível agora. Fale com o suporte." };
  }
  if (centavos(plano.valorMensal) <= 0) {
    return { error: "O plano ainda não está configurado. Fale com o suporte." };
  }

  const db = servico();

  const { data: atual } = await db
    .from("assinaturas")
    .select(
      // cancelada_em e proximo_vencimento entram na leitura para poderem
      // ser PRESERVADOS quando a cobrança não passa — ver os comentários
      // no upsert abaixo. ultimo_pagamento_em e as duas colunas de
      // promoção entram pelo mesmo motivo, mais a régua da promoção.
      "id, gateway_customer_id, gateway_subscription_id, status, plano, valor_mensal, falhas_seguidas, cancelada_em, proximo_vencimento, ultimo_pagamento_em, promocao_codigo, promocao_inicio"
    )
    .eq("empresa_id", ctx.empresaId)
    .maybeSingle();

  if (atual?.gateway_subscription_id && atual.status === "ativa") {
    return { error: "Esta conta já tem uma assinatura ativa." };
  }

  // A PROMOÇÃO DE LANÇAMENTO (153), decidida aqui e só aqui.
  //
  // A assinatura nasce cobrando o PRIMEIRO DEGRAU; os outros a rotina
  // diária anda, trocando o preço do item na operadora. O que fica
  // gravado é o código e o dia em que a escada começou — nunca o degrau,
  // que é conta e se corrige sozinho se a rotina falhar por uma semana.
  //
  // Duas travas: só o plano da promoção entra, e só quem nunca teve
  // assinatura de verdade. Lançamento é para quem chega.
  const escada =
    plano.codigo === PLANO_DA_PROMOCAO && podeEntrarNaPromocao(atual)
      ? await getEscadaDaPromocao(PROMOCAO_LANCAMENTO)
      : null;
  const primeiroDegrau = escada?.degraus[0] ?? null;
  const valorDoDegrau = primeiroDegrau
    ? comTetoDoPlano(primeiroDegrau.valorMensal, plano.valorMensal)
    : null;
  // Escada que não desconta nada não é promoção: não vale gravar código
  // nem fazer a rotina visitar esta linha todo dia até o fim dos tempos.
  // E degrau zerado também não entra — assinatura de graça o gateway
  // recusa, e o que ela veria seria "cartão não aprovado".
  const naPromocao =
    valorDoDegrau !== null && valorDoDegrau > 0 && valorDoDegrau < plano.valorMensal;
  const valorCobrado = naPromocao ? (valorDoDegrau as number) : plano.valorMensal;
  const valor = centavos(valorCobrado);

  // O aceite é gravado AQUI — depois de saber que a assinatura é válida
  // e ANTES de falar com o gateway. A ordem importa nos dois sentidos:
  // o aceite é fato mesmo que o cartão seja recusado logo depois (ela
  // leu e concordou; a cobrança é outra história), e sem a linha na
  // tabela não há cobrança nenhuma — prova primeiro, dinheiro depois.
  // A tabela (149) não tem policy: só o service role escreve.
  const h = headers();
  const { error: erroAceite } = await db.from("termos_aceite").insert({
    empresa_id: ctx.empresaId,
    user_id: ctx.userId,
    email: ctx.email,
    versao: TERMOS_VERSAO,
    contexto: "assinatura",
    plano: plano.codigo,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (erroAceite) {
    console.error("[vela:assinatura] aceite:", erroAceite.message);
    return {
      error: "Não conseguimos registrar o aceite dos termos. Tente de novo em instantes.",
    };
  }

  // Cliente no gateway: reaproveita se já existe — mas ATUALIZANDO o
  // documento. Um cliente criado sem CPF/CNPJ (era o caso antes deste
  // conserto) faria toda tentativa seguinte falhar igual, para sempre.
  const pagador = {
    // o nome e o e-mail vêm do formulário: quem paga a conta nem sempre
    // é a pessoa que está logada, e a cobrança pode ir para o financeiro
    nome: cobranca.nome.trim(),
    email: cobranca.email.trim(),
    documento: cobranca.documento,
    telefone: cobranca.telefone,
    endereco: {
      cep: cobranca.cep,
      rua: cobranca.rua.trim(),
      numero: cobranca.numero.trim(),
      complemento: cobranca.complemento.trim(),
      bairro: cobranca.bairro.trim(),
      cidade: cobranca.cidade.trim(),
      estado: cobranca.estado,
    },
  };

  let clienteId = atual?.gateway_customer_id ?? null;
  if (clienteId) {
    const upd = await atualizarCliente(clienteId, pagador);
    if (!upd.ok) return { error: upd.erro };
  } else {
    const cli = await criarCliente(pagador);
    if (!cli.ok) return { error: cli.erro };
    clienteId = cli.dados.id;
  }

  // ANTES DE CRIAR A SEGUNDA, MATAR A PRIMEIRA.
  //
  // Chegar aqui com um `gateway_subscription_id` gravado é normal: cartão
  // recusado guarda o id, e cancelar com a operadora fora do ar (caso 3 do
  // `cancelar()`) deixa a linha 'cancelada' aqui e a assinatura VIVA lá.
  // Nesse estado, criar outra assinatura sobrescrevia o id da anterior —
  // que ficava órfã, cobrando todo mês, sem nenhuma rotina sabendo dela:
  // `cancelamentos-pendentes` só varre linhas 'cancelada', e a linha
  // acabara de voltar a 'ativa' apontando para a nova. Duas cobranças por
  // mês, indefinidamente.
  //
  // Com a promoção isso deixa de ser exceção rara: assinar depois de
  // cancelar passa a ser o caminho de quem voltou. Se a operadora não
  // confirmar o cancelamento da antiga, esta assinatura NÃO nasce — é
  // melhor pedir para tentar de novo em instantes do que criar a segunda
  // cobrança que ninguém vê.
  if (atual?.gateway_subscription_id) {
    const morta = await cancelarAssinatura(atual.gateway_subscription_id);
    if (!morta.ok) {
      console.error(
        "[vela:assinatura] não deu para encerrar a assinatura anterior:",
        atual.gateway_subscription_id,
        morta.erro
      );
      return {
        error:
          "Não conseguimos encerrar a assinatura anterior na operadora agora. Tente de novo em alguns minutos — assim você não corre o risco de ser cobrada duas vezes.",
      };
    }
  }

  // O MEIO DO FUNIL: ela mandou o cartão. Ainda não é venda — a operadora
  // não respondeu —, e é justamente por isso que este evento existe
  // separado: com um pixel novo e quase nenhuma compra, é o sinal do meio
  // que dá à Meta o que aprender enquanto as vendas ainda são poucas.
  //
  // Sai pelo SERVIDOR, como a venda: a tela de assinatura mora dentro do
  // sistema, e pixel não entra aqui.
  //
  // O valor é o real — o que vai ser cobrado agora, com o degrau da
  // promoção já aplicado, não o preço de tabela.
  //
  // O id junta empresa, plano e DIA: se ela errar o cartão e tentar de
  // novo, a Meta reconhece o mesmo checkout em vez de contar dois.
  try {
    const origemAgora = lerOrigemDoCookie();
    const { data: origemGuardada } = await db
      .from("origem_do_clique")
      .select("fbp, fbc, ga_client_id")
      .eq("empresa_id", ctx.empresaId)
      .maybeSingle();
    await registrarConversao({
      tipo: "checkout_iniciado",
      email: ctx.email,
      valor: valorCobrado,
      idDoEvento: `checkout:${ctx.empresaId}:${plano.codigo}:${hojeBR()}`,
      origem: {
        fbp: origemGuardada?.fbp ?? origemAgora?.fbp ?? null,
        fbc: origemGuardada?.fbc ?? origemAgora?.fbc ?? null,
        gaClientId: origemGuardada?.ga_client_id ?? origemAgora?.ga_client_id ?? null,
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
  } catch (e) {
    // medir nunca pode atrapalhar cobrar
    console.error("[vela:conversao] checkout:", String(e).slice(0, 200));
  }

  const ass = await criarAssinatura({
    clienteId,
    cardToken,
    valorCentavos: valor,
    descricao: `Plano ${plano.nome}`,
    // o endereço do formulário é também o de cobrança do cartão — pedir
    // duas vezes o mesmo endereço seria burocracia sem ganho
    enderecoCobranca: pagador.endereco,
  });
  if (!ass.ok) return { error: ass.erro };

  const g = ass.dados;

  // O gateway CRIAR a assinatura não quer dizer que ela está paga. Medido
  // em teste: cartão recusado devolve a assinatura com status de falha, e
  // a versão anterior daqui gravava "trial" e a tela dizia "Assinatura
  // ativa. Obrigado!". A pessoa saía achando que assinou.
  const virouAtiva = g.status === "active";
  const foiCancelada = g.status === "canceled";

  // Estado anterior: se a cobrança não passou, não é para destruí-lo. Uma
  // conta em cortesia que tentou assinar e teve o cartão recusado perdia a
  // cortesia — pagava o preço de uma tentativa que nem virou cobrança.
  const statusNovo = virouAtiva
    ? "ativa"
    : foiCancelada
      ? "cancelada"
      : (atual?.status ?? "inadimplente");

  const { error } = await db.from("assinaturas").upsert(
    {
      empresa_id: ctx.empresaId,
      // o plano gravado é o código escolhido — é dele que teto_do_plano
      // tira quantos eventos e logins a conta pode ter
      plano: virouAtiva ? plano.codigo : (atual?.plano ?? plano.codigo),
      valor_mensal: virouAtiva ? valorCobrado : (atual?.valor_mensal ?? valorCobrado),
      status: statusNovo,
      // A promoção só é gravada quando a cobrança PASSOU: escada que
      // ninguém pagou não é escada. Cartão recusado preserva o que havia,
      // e ela pode tentar de novo sem perder o degrau de entrada — é para
      // isso que podeEntrarNaPromocao não olha gateway_subscription_id.
      promocao_codigo: virouAtiva
        ? naPromocao
          ? PROMOCAO_LANCAMENTO
          : null
        : (atual?.promocao_codigo ?? null),
      promocao_inicio: virouAtiva
        ? naPromocao
          ? hojeBR()
          : null
        : (atual?.promocao_inicio ?? null),
      // Os dados do gateway são gravados SEMPRE, inclusive na falha: é o
      // que permite cancelar e trocar o cartão depois. Sem eles a
      // assinatura existiria lá fora sem botão de saída aqui dentro.
      gateway: "pagarme",
      gateway_customer_id: clienteId,
      gateway_subscription_id: g.id,
      // sem data nova, mantém a que havia: é o fim do período pago, e a
      // cortesia de 30 dias da 151 conta a partir dele
      proximo_vencimento:
        g.next_billing_at?.slice(0, 10) ??
        g.current_cycle?.end_at?.slice(0, 10) ??
        atual?.proximo_vencimento ??
        null,
      cartao_final: g.card?.last_four_digits ?? null,
      cartao_bandeira: g.card?.brand ?? null,
      falhas_seguidas: virouAtiva ? 0 : (atual?.falhas_seguidas ?? 0) + 1,
      // A data do cancelamento só se apaga quando a assinatura VOLTOU a
      // valer. Zerá-la sempre — como era até 06/09/2026 — descongelava a
      // conta com uma tentativa de cartão recusado: o status continuava
      // 'cancelada', mas conta_congelada() exige a data e passava a
      // devolver false, de graça e para sempre (achado de um cético da
      // 151). Cartão recusado não é assinatura; preserva-se o que havia.
      cancelada_em: virouAtiva
        ? null
        : (atual?.cancelada_em ?? (statusNovo === "cancelada" ? hojeBR() : null)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "empresa_id" }
  );
  if (error) {
    // o dinheiro já está cobrado no gateway: falhar em silêncio aqui
    // seria o pior dos mundos
    console.error("[vela:assinatura] gravar:", error.message, "sub:", g.id);
    return {
      error:
        "A assinatura foi criada na operadora, mas não conseguimos registrar aqui. Fale com o suporte antes de tentar de novo.",
    };
  }

  revalidatePath("/assinatura");
  revalidatePath("/", "layout");

  // Cobrança não aprovada: dizer a verdade. O cadastro ficou gravado, o
  // cartão dá para trocar e a assinatura dá para cancelar — mas ninguém
  // sai daqui achando que assinou.
  if (!virouAtiva) {
    console.error("[vela:assinatura] gateway devolveu status", g.status, "sub:", g.id);
    return {
      error:
        "O cartão não foi aprovado pela operadora. Nada foi cobrado. Tente outro cartão em “Forma de pagamento”, ou cancele a assinatura logo abaixo.",
    };
  }

  // A CONVERSÃO. Só aqui: a assinatura existe quando a operadora aprova,
  // e este é o único ponto do sistema que sabe disso. O navegador não
  // sabe — a tela de assinatura vive no app, onde pixel nenhum entra —,
  // e por isso a Meta e o Google recebem este evento pelo servidor.
  //
  // A origem do clique foi guardada num cookie quando a conta nasceu, e
  // é ela que diz de qual anúncio esta venda veio. Aproveita-se a passagem
  // para gravá-la (152): o cookie tem 90 dias, a conta é para sempre.
  //
  // Nada disto pode derrubar a assinatura, que já está paga: registrar
  // conversão engole o próprio erro.
  try {
    const origem = lerOrigemDoCookie();
    if (origem) {
      await db.from("origem_do_clique").upsert(
        {
          empresa_id: ctx.empresaId,
          ...origem,
          ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
        },
        { onConflict: "empresa_id", ignoreDuplicates: true }
      );
    }
    const { data: guardada } = await db
      .from("origem_do_clique")
      .select("fbp, fbc, ga_client_id")
      .eq("empresa_id", ctx.empresaId)
      .maybeSingle();

    await registrarConversao({
      tipo: "assinatura",
      email: ctx.email,
      // o valor da conversão é o que foi COBRADO, não o do catálogo: é
      // dinheiro que entrou, e é por ele que a Meta e o Google otimizam
      valor: valorCobrado,
      // o id do gateway é único e estável: se este trecho rodar duas
      // vezes, a plataforma reconhece o mesmo fato e não conta em dobro
      idDoEvento: `assinatura:${g.id}`,
      origem: {
        fbp: guardada?.fbp ?? origem?.fbp ?? null,
        fbc: guardada?.fbc ?? origem?.fbc ?? null,
        gaClientId: guardada?.ga_client_id ?? origem?.ga_client_id ?? null,
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
  } catch (e) {
    console.error("[vela:conversao] assinatura:", String(e).slice(0, 200));
  }

  // Só uma assinatura que de fato começou entra no histórico — é dele que
  // o painel do dono tira o MRR, e tentativa recusada não é receita.
  const { data: linha } = await db
    .from("assinaturas")
    .select("id")
    .eq("empresa_id", ctx.empresaId)
    .maybeSingle();
  if (linha) {
    await db.from("assinatura_eventos").insert({
      assinatura_id: linha.id,
      empresa_id: ctx.empresaId,
      tipo: "inicio",
      valor_depois: valorCobrado,
      nota: naPromocao
        ? `assinou o ${plano.nome} pelo app, no 1º degrau da promoção ${PROMOCAO_LANCAMENTO}`
        : `assinou o ${plano.nome} pelo app`,
    });
  }

  return { ok: true };
}

/**
 * Mudar de plano sem refazer a assinatura: o gateway troca o preço do
 * item e o novo valor vale a partir da próxima cobrança.
 *
 * Só uma coisa barra a troca: descer para um plano com menos vaga de
 * login do que gente ativa. Comprar o Master, cadastrar dez pessoas e
 * descer para o Essencial seria furo de receita — e desativar acessos é
 * decisão dela, não nossa. Eventos NÃO barram: acima do teto ela só não
 * cria o próximo (o gatilho do banco recusa), e a tela avisa. Corta o
 * criar, nunca o ver.
 *
 * Não pede aceite novo: os termos aceitos na assinatura já cobrem a
 * troca de plano — é a mesma relação, só muda o valor.
 *
 * E a troca ENCERRA a promoção de lançamento: o preço cobrado passa a ser
 * o do plano de destino, cheio, na próxima cobrança.
 */
export async function trocarPlano(planoCodigo: string): Promise<ResultadoAssinatura> {
  const ctx = await donaLogada();
  if ("error" in ctx) return { error: ctx.error };

  if (!ehCodigoDoPlano(planoCodigo)) return { error: "Escolha um plano." };
  const plano = await getPlano(planoCodigo);
  if (!plano) {
    return { error: "Este plano não está disponível agora. Fale com o suporte." };
  }
  const valor = centavos(plano.valorMensal);
  if (valor <= 0) {
    return { error: "O plano ainda não está configurado. Fale com o suporte." };
  }

  const db = servico();
  const { data: atual } = await db
    .from("assinaturas")
    .select("id, gateway_subscription_id, status, plano, valor_mensal")
    .eq("empresa_id", ctx.empresaId)
    .maybeSingle();

  // Trocar é para quem já paga. Trial, cancelada ou pausada passam pelo
  // assinar(), que cria a assinatura no gateway do zero.
  const pagante =
    atual?.gateway_subscription_id &&
    (atual.status === "ativa" || atual.status === "inadimplente");
  if (!atual || !pagante) {
    return { error: "Esta conta ainda não tem assinatura. Assine primeiro." };
  }
  if (atual.plano === plano.codigo) {
    return { error: `Você já está no ${plano.nome}.` };
  }

  // A vaga de login é contada pelo banco (147), pela mesma função que o
  // gatilho usa — não por uma conta paralela aqui.
  if (plano.logins !== null) {
    const { data: ativos, error: erroLogins } = await db.rpc("logins_que_contam", {
      p_empresa_id: ctx.empresaId,
    });
    if (erroLogins) {
      console.error("[vela:assinatura] logins_que_contam:", erroLogins.message);
      return { error: "Não conseguimos conferir os acessos da equipe. Tente de novo." };
    }
    const sobra = Number(ativos ?? 0) - plano.logins;
    if (sobra > 0) {
      return {
        error: `Desative ${sobra} ${sobra === 1 ? "acesso" : "acessos"} para mudar para o ${plano.nome}.`,
      };
    }
  }

  // Primeiro o gateway. Se ele recusar, nada muda aqui — uma linha
  // dizendo "Master" com o gateway cobrando o Essencial seria a pior das
  // duas verdades.
  const r = await atualizarPrecoAssinatura(
    atual.gateway_subscription_id,
    valor,
    `Plano ${plano.nome}`
  );
  if (!r.ok) return { error: r.erro };

  const valorAntes = Number(atual.valor_mensal ?? 0);
  const { error } = await db
    .from("assinaturas")
    .update({
      plano: plano.codigo,
      valor_mensal: plano.valorMensal,
      // Trocar de plano ENCERRA a promoção. Ela é de lançamento e vale
      // para o plano em que ela entrou; quem escolhe outro plano escolhe
      // o preço dele, cheio. Sem limpar estas duas colunas a rotina
      // diária continuaria andando uma escada de outro plano e puxaria o
      // valor de volta para baixo na primeira execução.
      promocao_codigo: null,
      promocao_inicio: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", atual.id);
  if (error) {
    // o gateway já está cobrando o novo valor: silêncio aqui deixaria a
    // conta pagando um plano e travada nos tetos do outro
    console.error("[vela:assinatura] trocar plano:", error.message, "sub:", atual.gateway_subscription_id);
    return {
      error:
        "O plano mudou na operadora, mas não conseguimos registrar aqui. Fale com o suporte antes de tentar de novo.",
    };
  }

  // Subida ou descida é pelo valor, não pela ordem da vitrine: é o
  // dinheiro que o painel do dono soma.
  await db.from("assinatura_eventos").insert({
    assinatura_id: atual.id,
    empresa_id: ctx.empresaId,
    tipo: plano.valorMensal >= valorAntes ? "upgrade" : "downgrade",
    valor_antes: valorAntes,
    valor_depois: plano.valorMensal,
    nota: `mudou para o ${plano.nome} pelo app`,
  });

  revalidatePath("/assinatura");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function atualizarCartao(cardToken: string): Promise<ResultadoAssinatura> {
  if (!cardToken) return { error: "Não recebemos os dados do cartão." };
  const ctx = await donaLogada();
  if ("error" in ctx) return { error: ctx.error };
  const db = servico();

  const { data: atual } = await db
    .from("assinaturas")
    .select("gateway_subscription_id")
    .eq("empresa_id", ctx.empresaId)
    .maybeSingle();
  if (!atual?.gateway_subscription_id) {
    return { error: "Esta conta ainda não tem assinatura." };
  }

  const r = await trocarCartao(atual.gateway_subscription_id, cardToken);
  if (!r.ok) return { error: r.erro };

  await db
    .from("assinaturas")
    .update({
      cartao_final: r.dados.card?.last_four_digits ?? null,
      cartao_bandeira: r.dados.card?.brand ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("empresa_id", ctx.empresaId);

  revalidatePath("/assinatura");
  return { ok: true };
}

/**
 * Cancelar. **Esta função não tem caminho de recusa** — e isso é regra de
 * produto, não descuido (decisão do dono, 06/09/2026): quem quer sair,
 * sai. Cobrança em aberto se resolve depois, entre gente; prender alguém
 * numa tela de erro é como se ganha um processo bobo no Juizado.
 *
 * Os três casos, todos terminando em "cancelada":
 *
 *   1. A operadora cancela  → o normal.
 *   2. A operadora diz que a assinatura não existe → já não havia o que
 *      cobrar. É sucesso, não erro (era o que a tela chamava, errado, de
 *      "Não foi possível concluir o pagamento").
 *   3. A operadora falha ou está fora do ar → cancela aqui do mesmo
 *      jeito, avisa o dono do sistema e deixa a linha marcada para a
 *      rotina diária tentar de novo. A cliente não paga pela nossa
 *      indisponibilidade.
 *
 * O caso 3 tem um risco real — cancelado aqui, vivo lá, cobrança no mês
 * seguinte —, e é por isso que ele NÃO termina aqui: /api/cron/
 * cancelamentos-pendentes confere todo dia e insiste até a operadora
 * confirmar.
 */
export async function cancelar(motivo: string): Promise<ResultadoAssinatura> {
  const ctx = await donaLogada();
  if ("error" in ctx) return { error: ctx.error };
  const db = servico();

  const { data: atual } = await db
    .from("assinaturas")
    .select("id, status, gateway_subscription_id")
    .eq("empresa_id", ctx.empresaId)
    .maybeSingle();
  if (!atual) return { error: "Esta conta não tem assinatura para cancelar." };

  // Sem assinatura na operadora não há o que cancelar lá — mas a linha
  // aqui pode estar 'ativa' (cortesia, conta herdada, assinatura lançada
  // à mão). Cancelar continua significando alguma coisa: parar de contar
  // como ativa. Antes, isto devolvia erro e a conta ficava sem saída.
  let notaDoGateway = "";
  if (atual.gateway_subscription_id) {
    const r = await cancelarAssinatura(atual.gateway_subscription_id);
    if (r.ok) {
      notaDoGateway = r.jaNaoExistia ? " (a operadora já não tinha esta assinatura)" : "";
    } else {
      notaDoGateway = ` (a operadora recusou: ${r.erro})`;
      console.error(
        "[vela:assinatura] cancelamento local sem confirmação do gateway:",
        atual.gateway_subscription_id,
        r.erro
      );
      // O dono precisa saber HOJE: é ele que mata a assinatura no painel
      // se a rotina diária não conseguir.
      const { data: dono } = await db
        .from("membros_equipe")
        .select("user_id")
        .eq("empresa_id", ctx.empresaId)
        .eq("is_owner", true)
        .eq("status", "ativo")
        .maybeSingle();
      if (dono?.user_id) {
        await db.from("notifications").insert({
          cerimonialista_id: dono.user_id,
          // 'pagamento' é um dos tipos que o CHECK aceita (101) — e é o
          // assunto certo: o que ficou pendente é cobrança, não sistema.
          type: "pagamento",
          title: "Cancelamento registrado, operadora não confirmou",
          message:
            "A assinatura foi cancelada aqui, mas a operadora não confirmou. Confira no painel dela se ainda há cobrança agendada — o sistema tenta de novo todo dia.",
          link: "/assinatura",
        });
      }
    }
  }

  const { error: erroUpdate } = await db
    .from("assinaturas")
    .update({
      status: "cancelada",
      // Brasília, não UTC: às 21h o toISOString já é o dia seguinte, e a
      // cortesia de 30 dias sairia um dia mais longa do que o combinado
      cancelada_em: hojeBR(),
      motivo_cancelamento: motivo.trim().slice(0, 400) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", atual.id);

  // A única falha que a cliente pode ver: o banco não gravou. Aí ela
  // continua ativa de verdade, e mentir seria pior que avisar.
  if (erroUpdate) {
    console.error("[vela:assinatura] gravar cancelamento:", erroUpdate.message);
    return {
      error:
        "Não conseguimos registrar o cancelamento agora. Tente de novo em instantes — se insistir, fale com o suporte que a gente cancela por aqui.",
    };
  }

  await db.from("assinatura_eventos").insert({
    assinatura_id: atual.id,
    empresa_id: ctx.empresaId,
    tipo: "cancelamento",
    nota: (motivo.trim().slice(0, 160) || "cancelou pelo app") + notaDoGateway,
  });

  revalidatePath("/assinatura");
  revalidatePath("/", "layout");
  return { ok: true };
}
