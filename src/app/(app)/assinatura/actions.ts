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
import {
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

export async function assinar(cardToken: string): Promise<ResultadoAssinatura> {
  if (!cardToken) return { error: "Não recebemos os dados do cartão." };
  const valor = valorMensalCentavos();
  if (valor <= 0) {
    return { error: "O plano ainda não está configurado. Fale com o suporte." };
  }

  const ctx = await donaLogada();
  if ("error" in ctx) return { error: ctx.error };
  const db = servico();

  const { data: atual } = await db
    .from("assinaturas")
    .select("id, gateway_customer_id, gateway_subscription_id, status")
    .eq("empresa_id", ctx.empresaId)
    .maybeSingle();

  if (atual?.gateway_subscription_id && atual.status === "ativa") {
    return { error: "Esta conta já tem uma assinatura ativa." };
  }

  // cliente no gateway: reaproveita se já existe
  let clienteId = atual?.gateway_customer_id ?? null;
  if (!clienteId) {
    const cli = await criarCliente({ nome: ctx.nome, email: ctx.email });
    if (!cli.ok) return { error: cli.erro };
    clienteId = cli.dados.id;
  }

  const ass = await criarAssinatura({
    clienteId,
    cardToken,
    valorCentavos: valor,
    descricao: "Assinatura mensal",
  });
  if (!ass.ok) return { error: ass.erro };

  const g = ass.dados;
  const { error } = await db.from("assinaturas").upsert(
    {
      empresa_id: ctx.empresaId,
      plano: "mensal",
      valor_mensal: valor / 100,
      status: g.status === "active" ? "ativa" : "trial",
      gateway: "pagarme",
      gateway_customer_id: clienteId,
      gateway_subscription_id: g.id,
      proximo_vencimento:
        g.next_billing_at?.slice(0, 10) ?? g.current_cycle?.end_at?.slice(0, 10) ?? null,
      cartao_final: g.card?.last_four_digits ?? null,
      cartao_bandeira: g.card?.brand ?? null,
      falhas_seguidas: 0,
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
