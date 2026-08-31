"use server";

// A assinatura pelo lado da cerimonialista: assinar, trocar o cartão,
// cancelar. O cartão nunca passa por aqui — só o token que o navegador
// pegou direto com o gateway.
//
// Depois de cada operação a gente grava o que o GATEWAY devolveu, nunca
// o que a tela achou que ia acontecer.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServico } from "@supabase/supabase-js";
import { documentoValido } from "@/lib/documento";
import { cepValido, telefoneValido, ufValida } from "@/lib/contato";
import {
  atualizarCliente,
  cancelarAssinatura,
  criarAssinatura,
  criarCliente,
  trocarCartao,
  valorMensalCentavos,
} from "@/lib/pagarme";

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
  { empresaId: string; nome: string; email: string } | { error: string }
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
    nome: membro?.nome ?? user.email ?? "Cerimonialista",
    email: user.email ?? "",
  };
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

export async function assinar(
  cardToken: string,
  cobranca: DadosCobranca
): Promise<ResultadoAssinatura> {
  if (!cardToken) return { error: "Não recebemos os dados do cartão." };
  const problema = conferirCobranca(cobranca);
  if (problema) return { error: problema };
  const valor = valorMensalCentavos();
  if (valor <= 0) {
    return { error: "O plano ainda não está configurado. Fale com o suporte." };
  }

  const ctx = await donaLogada();
  if ("error" in ctx) return { error: ctx.error };
  const db = servico();

  const { data: atual } = await db
    .from("assinaturas")
    .select(
      "id, gateway_customer_id, gateway_subscription_id, status, plano, valor_mensal, falhas_seguidas"
    )
    .eq("empresa_id", ctx.empresaId)
    .maybeSingle();

  if (atual?.gateway_subscription_id && atual.status === "ativa") {
    return { error: "Esta conta já tem uma assinatura ativa." };
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

  const ass = await criarAssinatura({
    clienteId,
    cardToken,
    valorCentavos: valor,
    descricao: "Assinatura mensal",
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
      plano: virouAtiva ? "mensal" : (atual?.plano ?? "mensal"),
      valor_mensal: virouAtiva ? valor / 100 : (atual?.valor_mensal ?? valor / 100),
      status: statusNovo,
      // Os dados do gateway são gravados SEMPRE, inclusive na falha: é o
      // que permite cancelar e trocar o cartão depois. Sem eles a
      // assinatura existiria lá fora sem botão de saída aqui dentro.
      gateway: "pagarme",
      gateway_customer_id: clienteId,
      gateway_subscription_id: g.id,
      proximo_vencimento:
        g.next_billing_at?.slice(0, 10) ?? g.current_cycle?.end_at?.slice(0, 10) ?? null,
      cartao_final: g.card?.last_four_digits ?? null,
      cartao_bandeira: g.card?.brand ?? null,
      falhas_seguidas: virouAtiva ? 0 : (atual?.falhas_seguidas ?? 0) + 1,
      cancelada_em: null,
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
      valor_depois: valor / 100,
      nota: "assinou pelo app",
    });
  }

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

export async function cancelar(motivo: string): Promise<ResultadoAssinatura> {
  const ctx = await donaLogada();
  if ("error" in ctx) return { error: ctx.error };
  const db = servico();

  const { data: atual } = await db
    .from("assinaturas")
    .select("id, gateway_subscription_id")
    .eq("empresa_id", ctx.empresaId)
    .maybeSingle();
  if (!atual?.gateway_subscription_id) {
    return { error: "Esta conta não tem assinatura para cancelar." };
  }

  const r = await cancelarAssinatura(atual.gateway_subscription_id);
  if (!r.ok) return { error: r.erro };

  await db
    .from("assinaturas")
    .update({
      status: "cancelada",
      cancelada_em: new Date().toISOString().slice(0, 10),
      motivo_cancelamento: motivo.trim().slice(0, 400) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", atual.id);

  await db.from("assinatura_eventos").insert({
    assinatura_id: atual.id,
    empresa_id: ctx.empresaId,
    tipo: "cancelamento",
    nota: motivo.trim().slice(0, 200) || "cancelou pelo app",
  });

  revalidatePath("/assinatura");
  revalidatePath("/", "layout");
  return { ok: true };
}
