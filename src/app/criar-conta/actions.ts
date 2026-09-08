"use server";

// A porta do teste de sete dias (154).
//
// Endereço PÚBLICO e sem cartão — é uma fábrica de contas por desenho, e
// é isso que o dono está comprando: hoje "primeira conta criada" e
// "primeira assinante" são o mesmo evento, e ele só conhece a primeira
// usuária depois de ela ter comprado um sistema que nunca viu.
//
// O que impede a fábrica de virar problema:
//  · o PORTÃO. Sem `teste_gratis.aberto`, esta ação recusa tudo. Ligar e
//    desligar é do dono, no /admin, sem publicar código;
//  · o RELÓGIO. Cada conta nasce com `teste_termina_em`, e a porta do
//    sistema compara a data em toda leitura. Nada aqui renova prazo;
//  · o TETO. A linha nasce no plano Essencial. Sem plano do catálogo os
//    tetos voltariam nulos e o teste seria sistema ilimitado de graça
//    (a 154 explica a armadilha).
//
// A conta entra JÁ CONFIRMADA, de propósito. O objetivo declarado é a
// primeira conta criada por alguém que chegou do anúncio; um clique em
// caixa de entrada no meio do caminho é onde a maioria some — e, com o
// Site URL do Supabase apontando para outro lugar, some TODA ela, em
// silêncio. O preço disso está escrito abaixo, no comentário do e-mail.

import { cookies, headers } from "next/headers";
import { createClient as createServico } from "@supabase/supabase-js";
import { registrarConversao } from "@/lib/conversoes";
import { COOKIE_ORIGEM } from "@/lib/marketing";
import { portaoDoTeste, fimDoTeste } from "@/lib/supabase/teste-gratis";

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
};

export async function criarContaDeTeste(dados: {
  nome: string;
  negocio: string;
  email: string;
  senha: string;
}): Promise<ResultadoCriarConta> {
  const portao = await portaoDoTeste();
  if (!portao.aberto) {
    // A página só mostra este formulário com o portão aberto; chegar aqui
    // é endereço digitado à mão ou portão fechado no meio do caminho.
    return { error: "O teste grátis não está aberto no momento. Você pode assinar agora mesmo." };
  }

  const nome = dados.nome?.trim() ?? "";
  const negocio = dados.negocio?.trim() ?? "";
  const email = dados.email?.trim().toLowerCase() ?? "";
  const senha = dados.senha ?? "";

  if (nome.length < 2) return { error: "Escreva seu nome." };
  if (negocio.length < 2) return { error: "Escreva o nome do seu negócio." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: "Confira o e-mail digitado." };
  if (senha.length < 6) return { error: "A senha precisa de pelo menos 6 caracteres." };

  const db = servico();

  // `email_confirm: true` entrega a sessão na hora. O preço é conhecido:
  // alguém pode cadastrar o e-mail de outra pessoa e aquele endereço fica
  // presente nesta conta. Para trinta dias de anúncio com um punhado de
  // contas por dia, o custo de perder toda cerimonialista na caixa de
  // entrada é maior — e o portão fecha em um clique se aparecer abuso.
  const { data: criada, error: erroCriar } = await db.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    // as mesmas chaves que o gatilho de signup lê
    user_metadata: { empresa: negocio, name: nome },
  });

  let userId = criada?.user?.id ?? null;
  const contaNova = userId !== null;

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
    return {
      error: "Já existe uma conta com este e-mail. Entre com sua senha.",
      jaTemConta: true,
    };
  }

  // O gatilho de signup cria empresa e vínculo; aqui só se espera a linha
  // aparecer, porque o teste precisa do empresa_id.
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
    if (contaNova) {
      const { error: erroApagar } = await db.auth.admin.deleteUser(userId);
      if (erroApagar) console.error("[vela:teste] login órfão não apagado:", userId);
    }
    return { error: "Não foi possível abrir sua conta agora. Tente de novo em alguns instantes." };
  }

  // O TESTE. `plano: "essencial"` não é enfeite — é o que segura o teto
  // (154). `valor_mensal: 0` porque não há cobrança: o valor de verdade
  // entra quando ela assinar. Nada de `ultimo_pagamento_em` nem de
  // `inicio`: as duas colunas dizem "já pagou" para o resto do sistema, e
  // `ultimo_pagamento_em` ainda tiraria dela o direito aos R$ 27,90 na
  // hora de assinar (podeEntrarNaPromocao), que é o contrário do plano.
  const termina = fimDoTeste(portao.dias);
  const { error: erroTeste } = await db.from("assinaturas").upsert(
    {
      empresa_id: empresaId,
      plano: "essencial",
      valor_mensal: 0,
      status: "trial",
      teste_termina_em: termina,
      observacao: `teste de ${portao.dias} dias`,
    },
    { onConflict: "empresa_id" }
  );
  if (erroTeste) {
    // Sem a linha do teste ela cairia no checkout no primeiro clique —
    // exatamente a tela de que a estamos poupando. Melhor desfazer e
    // pedir para tentar de novo do que entregar uma conta trancada.
    console.error("[vela:teste] linha do teste:", erroTeste.code ?? "sem código");
    if (contaNova) {
      await db.from("membros_equipe").delete().eq("user_id", userId);
      await db.from("empresas").delete().eq("id", empresaId);
      const { error: erroApagar } = await db.auth.admin.deleteUser(userId);
      if (erroApagar) console.error("[vela:teste] conta órfã não apagada:", userId);
    }
    return { error: "Não foi possível abrir seu teste agora. Tente de novo em alguns instantes." };
  }

  // A CONTA NASCEU — e este é o evento que o anúncio precisa receber.
  // Sem ele a Meta otimiza por clique, que foi exatamente o que produziu
  // trinta e sete cliques e nenhuma conta na campanha do Instagram.
  // Sai pelo SERVIDOR, com o mesmo id de deduplicação do checkout, para
  // a mesma conta não ser contada duas vezes se ela assinar depois.
  //
  // A origem do clique vai junto, gravada como o checkout já grava (152):
  // é ela que dirá, quando esta conta assinar daqui a cinco dias, de qual
  // anúncio ela veio. Nada aqui pode derrubar o cadastro.
  try {
    const h0 = headers();
    const o = lerOrigemDoCookie();
    if (o) {
      await db.from("origem_do_clique").upsert(
        {
          empresa_id: empresaId,
          ...o,
          ip: h0.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          user_agent: h0.get("user-agent")?.slice(0, 300) ?? null,
        },
        { onConflict: "empresa_id", ignoreDuplicates: true }
      );
    }
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
    // medição não derruba cadastro
    console.error("[vela:conversao] conta de teste:", String(e).slice(0, 200));
  }

  return { ok: true };
}
