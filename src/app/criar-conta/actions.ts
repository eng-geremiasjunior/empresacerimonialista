"use server";

// A porta do teste de sete dias (154) — COM CARTÃO desde 21/09/2026.
//
// A decisão do dono: o cartão entra no cadastro, e a cobrança só depois
// dos sete dias. Quinze contas em uma semana de anúncio, sete que nunca
// criaram um evento e duas que voltaram: o cadastro sem cartão trazia
// quem só queria olhar. O cartão é o filtro; a cobrança adiada é a
// garantia de que ela pode olhar antes de pagar.
//
// A ORDEM, e por que ela é esta (revisão de 21/09/2026):
//  · primeiro a CONTA (login confirmado, empresa pelo gatilho): e-mail já
//    cadastrado para aqui sem tocar a operadora — senão este endereço
//    público viraria um provador de cartões roubados à custa da conta da
//    operadora, sem deixar rastro;
//  · depois o CARTÃO, CONFERIDO sem cobrar (zero dollar auth). Cartão
//    inventado ou recusado pelo emissor desfaz a conta: não sobra login
//    sem cartão aceito;
//  · então o aceite dos termos e a assinatura AGENDADA na operadora para
//    o dia seguinte ao fim do teste — até lá ela é "future", e não cobra.
//    Qualquer falha daqui em diante desfaz a conta E apaga o cartão da
//    operadora; assinatura já criada é cancelada. Não sobra cobrança sem
//    dono, nem cartão de quem não tem conta.
//
// A conta nasce JÁ CONFIRMADA, de propósito (a mesma decisão da 154 e do
// checkout): um clique em caixa de entrada no meio do caminho é onde a
// maioria some, e quem pôs um cartão que o emissor aceitou está mais
// verificada do que quem clica num link.
//
// O que impede a porta de virar problema continua o mesmo: o PORTÃO
// (`teste_gratis.aberto`, no /admin), o RELÓGIO (`teste_termina_em`,
// escrita uma vez e nunca renovada), o TETO (a linha nasce no plano do
// catálogo) e, agora, um AMORTECEDOR por IP — rajada não chega à operadora.
//
// Quem já estava no teste sem cartão antes desta mudança NÃO é tocado
// (decisão do dono): a régua dela continua a data, e ela assina pela tela
// de assinatura quando quiser.

import { cookies, headers } from "next/headers";
import { createClient as createServico } from "@supabase/supabase-js";
import { registrarConversao } from "@/lib/conversoes";
import { COOKIE_ORIGEM } from "@/lib/marketing";
import { portaoDoTeste } from "@/lib/supabase/teste-gratis";
import { normalizarDDI } from "@/lib/whatsapp-link";
import { ehEventos3Meses, normalizarInstagram } from "@/lib/cadastro-qualificacao";
import { enviarBoasVindas } from "@/lib/email-ativacao";
import { documentoValido } from "@/lib/documento";
import { cepValido, ufValida } from "@/lib/contato";
import {
  apagarCartao,
  cancelarAssinatura,
  criarAssinaturaAgendada,
  criarCartaoVerificado,
  criarCliente,
} from "@/lib/pagarme";
import { centavos, PROMOCAO_LANCAMENTO } from "@/lib/planos";
import { ofertaDoTeste } from "@/lib/teste-com-cartao";
import { TERMOS_VERSAO } from "@/lib/termos";
import { criarEventoDeExemplo, modeloPelaOrigem } from "@/lib/evento-exemplo";

/** Mesmo cliente de serviço do checkout: `assinaturas` não tem policy de escrita. */
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

// Memória do processo: some no deploy, e é de propósito — é um
// amortecedor contra rajada (o mesmo do RSVP e do aceite), não um
// contador de verdade. O teto real é a operadora e o portão.
const JANELA_MS = 10 * 60 * 1000;
const MAX_POR_JANELA = 6;
const ultimas = new Map<string, number[]>();
function demaisTentativas(ip: string): boolean {
  const agora = Date.now();
  const anteriores = (ultimas.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  anteriores.push(agora);
  ultimas.set(ip, anteriores);
  if (ultimas.size > 5000) ultimas.clear(); // teto de memória
  return anteriores.length > MAX_POR_JANELA;
}

/**
 * A origem do clique, como o navegador a guardou. Mesma leitura do
 * checkout: só as colunas que a tabela conhece, nada confiado às cegas,
 * nada que identifique pessoa.
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
      utm_content: "utm_content",
      utm_term: "utm_term",
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

export type ResultadoCriarConta = {
  ok?: boolean;
  error?: string;
  jaTemConta?: boolean;
  /** o id do CompleteRegistration do servidor, para o pixel do navegador usar o mesmo */
  idDoEvento?: string;
  /** o id do StartTrial do servidor, idem */
  idDoTeste?: string;
  /** o que vai ser cobrado no oitavo dia: o valor do StartTrial no navegador */
  valorDoTeste?: number;
};

/** O que a operadora exige de quem vai pagar, além do que a conta já tem. */
export type CobrancaDoCadastro = {
  documento: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

function conferirCobranca(c: CobrancaDoCadastro): string | null {
  if (!documentoValido(c.documento)) return "Informe um CPF ou CNPJ válido.";
  if (!cepValido(c.cep)) return "Informe um CEP válido.";
  if (!c.rua.trim()) return "Informe a rua.";
  if (!c.numero.trim()) return "Informe o número do endereço.";
  if (!c.bairro.trim()) return "Informe o bairro.";
  if (!c.cidade.trim()) return "Informe a cidade.";
  if (!ufValida(c.estado)) return "Escolha o estado.";
  return null;
}

/**
 * Desfaz o que ESTE cadastro criou: vínculo, empresa e login. Só o caminho
 * que criou a conta agora chama isto — nunca uma conta que já existia.
 */
async function desfazerConta(db: ReturnType<typeof servico>, userId: string, empresaId: string | null) {
  if (empresaId) {
    await db.from("assinaturas").delete().eq("empresa_id", empresaId);
    await db.from("termos_aceite").delete().eq("empresa_id", empresaId);
    await db.from("membros_equipe").delete().eq("user_id", userId);
    await db.from("empresas").delete().eq("id", empresaId);
  }
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) console.error("[vela:teste] conta órfã não apagada:", userId);
}

type DadosDoCadastro = {
  nome: string;
  negocio: string;
  email: string;
  senha: string;
  whatsapp: string;
  eventos3m: string;
  instagram?: string;
};

type Conferidos = {
  nome: string;
  negocio: string;
  email: string;
  senha: string;
  whatsapp: string;
  eventos3m: string;
  instagram: string | null;
};

/** A etapa 1, conferida no servidor — as duas portas (gratuita e com cartão) passam por aqui. */
function conferirDados(dados: DadosDoCadastro): { error: string } | Conferidos {
  const nome = dados.nome?.trim() ?? "";
  const negocio = dados.negocio?.trim() ?? "";
  const email = dados.email?.trim().toLowerCase() ?? "";
  const senha = dados.senha ?? "";

  if (nome.length < 2) return { error: "Escreva seu nome." };
  if (negocio.length < 2) return { error: "Escreva o nome do seu negócio." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Confira o e-mail digitado." };
  if (senha.length < 6) return { error: "A senha precisa de pelo menos 6 caracteres." };
  const whatsapp = normalizarDDI(dados.whatsapp);
  if (!whatsapp) return { error: "Confira o WhatsApp — com DDD, só números." };
  const eventos3m = dados.eventos3m;
  if (!ehEventos3Meses(eventos3m)) {
    return { error: "Diga quantos eventos você tem nos próximos 3 meses." };
  }
  // opcional: um @ que não parece @ não recusa o cadastro, só não é guardado
  const instagram = normalizarInstagram(dados.instagram);
  return { nome, negocio, email, senha, whatsapp, eventos3m, instagram };
}

/**
 * A CONTA: login já confirmado (`email_confirm: true` entrega a sessão na
 * hora), empresa pelo gatilho de signup, WhatsApp na ficha da dona. Nada
 * de assinatura aqui — isso é de quem chama.
 */
async function abrirConta(
  db: ReturnType<typeof servico>,
  d: Conferidos
): Promise<{ error: string; jaTemConta?: boolean } | { userId: string; empresaId: string }> {
  const { data: criada, error: erroCriar } = await db.auth.admin.createUser({
    email: d.email,
    password: d.senha,
    email_confirm: true,
    // `empresa` e `name` são as chaves que o gatilho de signup lê; as
    // outras três são a qualificação do cadastro (cadastro-qualificacao.ts),
    // que o painel do dono mostra
    user_metadata: {
      empresa: d.negocio,
      name: d.nome,
      whatsapp: d.whatsapp,
      eventos_3_meses: d.eventos3m,
      ...(d.instagram ? { instagram: d.instagram } : {}),
    },
  });

  const userId = criada?.user?.id ?? null;

  if (erroCriar || !userId) {
    const jaExiste =
      erroCriar?.code === "email_exists" ||
      /already been registered|already exists/i.test(erroCriar?.message ?? "");
    if (!jaExiste) {
      // só o CÓDIGO: a mensagem do Supabase repete o e-mail digitado, e
      // log não é lugar de dado de quem está se cadastrando
      console.error("[vela:teste] criar conta:", erroCriar?.code ?? "sem código");
      return { error: "Não foi possível criar a conta agora. Tente de novo em alguns instantes." };
    }
    // E-mail já cadastrado. Aqui NÃO se confere senha para "seguir
    // dentro da conta existente", como o checkout faz: lá havia uma
    // compra em curso a proteger; aqui, conferir senha num endereço
    // público seria um provador de senhas. Ela entra pelo login.
    return { error: "Já existe uma conta com este e-mail. Entre com sua senha.", jaTemConta: true };
  }

  // O gatilho de signup cria empresa e vínculo; aqui só se espera a linha
  // aparecer, porque o resto precisa do empresa_id.
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
    console.error("[vela:teste] empresa não provisionada para", userId);
    await desfazerConta(db, userId, null);
    return { error: "Não foi possível abrir sua conta agora. Tente de novo em alguns instantes." };
  }

  // O WhatsApp vai para a ficha dela na equipe — é de lá que o painel do
  // dono e as telas de equipe leem. Falhar aqui não impede a conta: o
  // número também ficou no login.
  {
    const { error: erroZap } = await db
      .from("membros_equipe")
      .update({ whatsapp: d.whatsapp })
      .eq("user_id", userId)
      .eq("empresa_id", empresaId);
    if (erroZap) console.error("[vela:teste] whatsapp da dona:", erroZap.code ?? "sem código");
  }

  return { userId, empresaId };
}

/**
 * Depois que a conta nasceu, nas duas portas: a origem do clique (152), os
 * eventos do anúncio (o cadastro sempre; o teste só com cartão), o e-mail
 * de boas-vindas e a baixa na lista de quem parou (169). Nada aqui derruba
 * o cadastro.
 */
async function depoisDeNascer(
  db: ReturnType<typeof servico>,
  c: { userId: string; empresaId: string; d: Conferidos; ip: string; userAgent: string | null },
  teste: { valor: number; termina: string; primeiraCobranca: string } | null
) {
  try {
    const o = lerOrigemDoCookie();
    if (o) {
      await db.from("origem_do_clique").upsert(
        {
          empresa_id: c.empresaId,
          ...o,
          ip: c.ip === "desconhecido" ? null : c.ip,
          user_agent: c.userAgent,
        },
        { onConflict: "empresa_id", ignoreDuplicates: true }
      );
    }
    const origem = {
      fbp: o?.fbp ?? null,
      fbc: o?.fbc ?? null,
      gaClientId: o?.ga_client_id ?? null,
      ip: c.ip === "desconhecido" ? null : c.ip,
      userAgent: c.userAgent,
    };
    // Saem pelo SERVIDOR com o mesmo id que o pixel usa no navegador, para
    // a Meta contar cada um uma vez; a compra sai quando a operadora cobrar.
    await registrarConversao({
      tipo: "conta_criada",
      email: c.d.email,
      telefone: c.d.whatsapp,
      nome: c.d.nome,
      idExterno: c.empresaId,
      idDoEvento: `conta:${c.empresaId}`,
      origem,
    });
    if (teste) {
      await registrarConversao({
        tipo: "teste_iniciado",
        email: c.d.email,
        telefone: c.d.whatsapp,
        nome: c.d.nome,
        idExterno: c.empresaId,
        valor: teste.valor,
        idDoEvento: `teste:${c.empresaId}`,
        origem,
      });
    }
  } catch (e) {
    // medição não derruba cadastro
    console.error("[vela:conversao] conta nova:", String(e).slice(0, 200));
  }

  // O evento de exemplo (174): a conta não nasce vazia. Nunca derruba o
  // cadastro — sem ele, ela só entra num painel vazio, como antes.
  // quem veio do anúncio de 15 anos abre nos 15 anos
  await criarEventoDeExemplo(c.empresaId, c.userId, modeloPelaOrigem(lerOrigemDoCookie()));

  // O primeiro e-mail. Com cartão, já diz o dia e o valor da primeira
  // cobrança; no Gratuito, sem caixa de teste nenhuma.
  await enviarBoasVindas({
    userId: c.userId,
    email: c.d.email,
    nome: c.d.nome,
    termina: teste?.termina ?? null,
    eventos3m: c.d.eventos3m,
    cobranca: teste ? { dia: teste.primeiraCobranca, valor: teste.valor } : null,
  });

  // Se ela tinha parado no cartão antes (169), sai da lista do dono: a
  // conta nasceu. Sem a 169, só não marca.
  try {
    await db
      .from("cadastro_interrompido")
      .update({ convertido_em: new Date().toISOString() })
      .eq("email", c.d.email)
      .is("convertido_em", null);
  } catch {
    /* a lista do painel fica com ela como pendente; nada além disso */
  }
}

/**
 * O plano Gratuito (23/09/2026): a conta nasce SEM cartão e SEM linha em
 * `assinaturas` — e a regra que já existe no banco (154: nem pagante nem
 * em teste = 1 evento, 1 login) é o plano. Decisão do dono e da esposa:
 * quem quer conhecer entra sem cartão (e o curioso não precisa pôr
 * cartão para ver); quem já quer mais de um evento escolhe um plano, põe
 * o cartão e só paga no oitavo dia.
 */
export async function criarContaGratuita(dados: DadosDoCadastro): Promise<ResultadoCriarConta> {
  const h0 = headers();
  const ip = h0.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h0.get("x-real-ip") ?? "desconhecido";
  if (demaisTentativas(ip)) {
    return { error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo." };
  }
  const d = conferirDados(dados);
  if ("error" in d) return d;

  const db = servico();
  const conta = await abrirConta(db, d);
  if ("error" in conta) return conta;

  await depoisDeNascer(
    db,
    { ...conta, d, ip, userAgent: h0.get("user-agent")?.slice(0, 300) ?? null },
    null
  );
  return { ok: true, idDoEvento: `conta:${conta.empresaId}` };
}

export async function criarContaDeTeste(
  dados: DadosDoCadastro,
  pagamento: {
    /** o token que o navegador pegou direto com a operadora; o número nunca chega aqui */
    cardToken: string;
    cobranca: CobrancaDoCadastro;
    aceitouTermos: boolean;
    /** o plano escolhido na etapa 2; o servidor recalcula a oferta */
    plano?: string;
  }
): Promise<ResultadoCriarConta> {
  const portao = await portaoDoTeste();
  if (!portao.aberto) {
    // A página só mostra este formulário com o portão aberto; chegar aqui
    // é endereço digitado à mão ou portão fechado no meio do caminho.
    return { error: "O teste não está aberto no momento. Você pode assinar agora mesmo." };
  }

  const h0 = headers();
  const ip = h0.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h0.get("x-real-ip") ?? "desconhecido";
  if (demaisTentativas(ip)) {
    return { error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo." };
  }

  const d = conferirDados(dados);
  if ("error" in d) return d;
  const { nome, email, whatsapp } = d;

  // TUDO CONFERIDO ANTES DE QUALQUER COISA NASCER — na operadora ou aqui.
  if (pagamento?.aceitouTermos !== true) {
    return { error: "Para começar, é preciso aceitar os Termos e Condições." };
  }
  if (!pagamento.cardToken) return { error: "Não recebemos os dados do cartão." };
  const cobrancaInvalida = conferirCobranca(pagamento.cobranca);
  if (cobrancaInvalida) return { error: cobrancaInvalida };

  // O que vai ser agendado: o mesmo número que a tela acabou de mostrar,
  // calculado pela mesma função (teste-com-cartao.ts), para o plano que
  // ela escolheu — nunca o preço que veio do navegador.
  const oferta = await ofertaDoTeste(portao.dias, undefined, pagamento.plano);
  if (!oferta) {
    return { error: "A assinatura ainda não está configurada. Fale com o suporte." };
  }

  const db = servico();

  // 1) A CONTA.
  const conta = await abrirConta(db, d);
  if ("error" in conta) return conta;
  const { userId, empresaId } = conta;

  // 2) O CARTÃO, CONFERIDO SEM COBRAR. Recusa aqui é resposta para ela
  //    ("confira os dados ou use outro cartão"), e a conta que acabou de
  //    nascer é desfeita: não fica login sem cartão aceito.
  const c = pagamento.cobranca;
  const pagador = {
    nome,
    email,
    documento: c.documento,
    // o WhatsApp já vem com o 55; a operadora quer DDD + número
    telefone: whatsapp.slice(2),
    endereco: {
      cep: c.cep,
      rua: c.rua.trim(),
      numero: c.numero.trim(),
      complemento: c.complemento.trim(),
      bairro: c.bairro.trim(),
      cidade: c.cidade.trim(),
      estado: c.estado,
    },
  };
  const cliente = await criarCliente(pagador);
  if (!cliente.ok) {
    await desfazerConta(db, userId, empresaId);
    return { error: cliente.erro };
  }
  const cartao = await criarCartaoVerificado(cliente.dados.id, pagamento.cardToken, pagador.endereco);
  if (!cartao.ok) {
    await desfazerConta(db, userId, empresaId);
    return { error: cartao.erro };
  }

  // daqui em diante toda falha apaga o cartão da operadora e a conta
  const desfazerTudo = async (assinaturaId?: string) => {
    if (assinaturaId) {
      const morta = await cancelarAssinatura(assinaturaId);
      if (!morta.ok) console.error("[vela:teste] assinatura agendada sem dono:", assinaturaId);
    }
    await apagarCartao(cliente.dados.id, cartao.dados.id);
    await desfazerConta(db, userId, empresaId);
  };

  // 3) O ACEITE — antes de agendar a cobrança, como no checkout: sem o
  //    aceite gravado não há o que cobrar no oitavo dia. A tabela (149)
  //    não tem policy: só o service role escreve.
  const { error: erroAceite } = await db.from("termos_aceite").insert({
    empresa_id: empresaId,
    user_id: userId,
    email,
    versao: TERMOS_VERSAO,
    contexto: "assinatura",
    plano: oferta.plano.codigo,
    ip: ip === "desconhecido" ? null : ip,
    user_agent: h0.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (erroAceite) {
    console.error("[vela:teste] aceite:", erroAceite.code ?? "sem código");
    await desfazerTudo();
    return { error: "Não conseguimos registrar o aceite dos termos. Tente de novo em instantes." };
  }

  // 4) A COBRANÇA, AGENDADA. A operadora guarda a assinatura como "future"
  //    e só gera a primeira fatura no dia marcado. Se ela recusar o
  //    agendamento — ou devolver a assinatura já começada, o que
  //    significaria cobrar hoje —, nada fica de pé.
  const agendada = await criarAssinaturaAgendada({
    clienteId: cliente.dados.id,
    cardId: cartao.dados.id,
    valorCentavos: centavos(oferta.valorPrimeiro),
    descricao: `Plano ${oferta.plano.nome}`,
    comecaEm: oferta.comecaEm,
    codigo: empresaId,
  });
  if (!agendada.ok) {
    console.error("[vela:teste] agendamento recusado pela operadora:", agendada.erro.slice(0, 160));
    await desfazerTudo();
    return { error: agendada.erro };
  }
  const g = agendada.dados;
  if (g.status !== "future") {
    console.error("[vela:teste] a operadora devolveu a assinatura agendada como", g.status, g.id);
    await desfazerTudo(g.id);
    return {
      error:
        "A operadora não conseguiu agendar a cobrança para depois do teste. Nada foi cobrado. Tente de novo em instantes.",
    };
  }
  // A fonte da verdade do dia é a NOSSA data: foi a que a tela mostrou e a
  // que foi mandada. Se a operadora disser outra, fica no log para se ver
  // — nunca uma tela dizendo "28 de outubro" enquanto ela cobra em 28/09.
  const primeiraCobranca = oferta.comecaEm;
  const diaDaOperadora = g.next_billing_at?.slice(0, 10) ?? null;
  if (diaDaOperadora && diaDaOperadora !== primeiraCobranca) {
    console.error("[vela:teste] a operadora marcou a primeira cobrança para", diaDaOperadora, "e não", primeiraCobranca, g.id);
  }

  // 5) O TESTE. `plano` do catálogo segura o teto (154). `valor_mensal` é
  //    o que sai na primeira cobrança: a tela de assinatura mostra "a
  //    partir de X, R$ Y" a partir daqui. Nada de `ultimo_pagamento_em`
  //    nem de `inicio`: as duas dizem "já pagou" para o resto do sistema,
  //    e quem diz isso é a operadora, no oitavo dia (webhook).
  //    A promoção é gravada AQUI, com a escada contando do dia da primeira
  //    cobrança: são 3 meses de R$ 27,90 a partir de quando o dinheiro
  //    começa a entrar, não do cadastro.
  const { error: erroTeste } = await db.from("assinaturas").upsert(
    {
      empresa_id: empresaId,
      plano: oferta.plano.codigo,
      valor_mensal: oferta.valorPrimeiro,
      status: "trial",
      teste_termina_em: oferta.termina,
      gateway: "pagarme",
      gateway_customer_id: cliente.dados.id,
      gateway_subscription_id: g.id,
      proximo_vencimento: primeiraCobranca,
      cartao_final: g.card?.last_four_digits ?? cartao.dados.last_four_digits ?? null,
      cartao_bandeira: g.card?.brand ?? cartao.dados.brand ?? null,
      falhas_seguidas: 0,
      promocao_codigo: oferta.naPromocao ? PROMOCAO_LANCAMENTO : null,
      promocao_inicio: oferta.naPromocao ? primeiraCobranca : null,
      observacao: `teste de ${portao.dias} dias · cobrança agendada para ${primeiraCobranca}`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "empresa_id" }
  );
  if (erroTeste) {
    // A cobrança JÁ está agendada na operadora: desagendar antes de
    // desfazer a conta, senão sobra uma cobrança sem dono no oitavo dia.
    console.error("[vela:teste] linha do teste:", erroTeste.code ?? "sem código");
    await desfazerTudo(g.id);
    return { error: "Não foi possível abrir seu teste agora. Tente de novo em alguns instantes." };
  }

  // A CONTA NASCEU — o cadastro e o teste com cartão (StartTrial, com o
  // valor que vai ser cobrado) vão para o anúncio, e o primeiro e-mail sai.
  await depoisDeNascer(
    db,
    { userId, empresaId, d, ip, userAgent: h0.get("user-agent")?.slice(0, 300) ?? null },
    { valor: oferta.valorPrimeiro, termina: oferta.termina, primeiraCobranca }
  );

  return {
    ok: true,
    idDoEvento: `conta:${empresaId}`,
    idDoTeste: `teste:${empresaId}`,
    valorDoTeste: oferta.valorPrimeiro,
  };
}

/**
 * A etapa 1, guardada quando ela passa para o cartão (169, 22/09/2026).
 *
 * Se ela desistir no cartão, a conta não nasce — e sem isto o dono
 * perdia o nome e o WhatsApp de quem chegou a um passo de começar. Com
 * isto, o painel lista quem parou ali, para ele chamar pessoalmente.
 *
 * Só o que ela digitou na etapa 1, FORA A SENHA. Nunca derruba nada: se
 * a 169 não estiver aplicada ou o banco não responder, a tela segue para
 * o cartão como sempre.
 */
export async function guardarCadastroInterrompido(dados: {
  nome: string;
  negocio: string;
  email: string;
  whatsapp: string;
  eventos3m: string;
  instagram?: string;
}): Promise<void> {
  try {
    const email = dados.email?.trim().toLowerCase() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return;

    const h = headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "desconhecido";
    // o mesmo amortecedor do cadastro: rajada de um IP não enche a tabela
    if (demaisTentativas(`etapa1:${ip}`)) return;

    const o = lerOrigemDoCookie();
    const origem = o
      ? Object.fromEntries(
          ["utm_source", "utm_medium", "utm_campaign", "utm_content", "gclid"]
            .filter((k) => o[k])
            .map((k) => [k, o[k]])
        )
      : null;

    await servico().rpc("registrar_cadastro_interrompido", {
      p_email: email,
      p_nome: dados.nome?.trim().slice(0, 120) || null,
      p_negocio: dados.negocio?.trim().slice(0, 120) || null,
      p_whatsapp: normalizarDDI(dados.whatsapp) ?? (dados.whatsapp?.trim().slice(0, 30) || null),
      p_instagram: normalizarInstagram(dados.instagram) ?? null,
      p_eventos_3_meses: ehEventos3Meses(dados.eventos3m) ? dados.eventos3m : null,
      p_origem: origem && Object.keys(origem).length ? origem : null,
    });
  } catch (e) {
    console.error("[eorg:cadastro] etapa 1:", String(e).slice(0, 200));
  }
}
