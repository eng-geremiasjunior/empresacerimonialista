"use server";

// A lista de presentes, etapa 1 (182): o responsável do evento vira
// recebedor na Pagar.me. Os dados pessoais e a conta vão direto para a
// Pagar.me; aqui só fica o código do recebedor, o estado e um resumo.
// Quem confere se é o responsável é o servidor (evento_acesso: papel E
// nível), e quem escreve é a chave de serviço — a tabela não tem policy
// de escrita.

import { revalidatePath } from "next/cache";
import { createClient as criarSupabase } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { problemaNoCadastro, resumoDoBanco, type DadosDoRecebedor } from "@/lib/lista-presentes";
import { criarRecebedor, lerRecebedor, linkDaProvaDeVida } from "@/lib/pagarme-lista";
import { listaDePresentesLiberada } from "@/lib/supabase/portal-presentes";

type Retorno = { ok: true } | { error: string };

function servico() {
  return criarSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

/**
 * O responsável do evento (não a debutante), pela sessão de quem pede.
 * A conta que recebe o dinheiro é do casal (190): o acesso precisa ser
 * de nível 'casal' — mãe, padrinho e quem só acompanha não cadastram nem
 * fazem a prova de vida. O user.id vem da sessão, então ler a própria
 * linha pela chave de serviço é seguro (portal_pode_fazer, ao contrário,
 * não serve aqui: com a chave de serviço ela sempre diz sim).
 */
async function responsavel(eventoId: string): Promise<{ userId: string; email: string; nome: string | null } | null> {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user?.email) return null;
  const { data } = await servico()
    .from("evento_acesso")
    .select("nome, papel, nivel")
    .eq("event_id", eventoId)
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();
  const a = data as { nome: string | null; papel: string; nivel: string | null } | null;
  if (!a || a.papel === "debutante" || a.nivel !== "casal") return null;
  if (!(await listaDePresentesLiberada(eventoId))) return null;
  return { userId: user.id, email: user.email, nome: a.nome };
}

export async function cadastrarRecebedor(eventoId: string, dados: DadosDoRecebedor): Promise<Retorno> {
  const quem = await responsavel(eventoId);
  if (!quem) return { error: "Quem cadastra a conta é o responsável pelo evento." };
  const problema = problemaNoCadastro(dados);
  if (problema) return { error: problema };

  const db = servico();
  const { data: ja } = await db.from("evento_recebedor").select("event_id").eq("event_id", eventoId).maybeSingle();
  if (ja) return { error: "A conta deste evento já foi cadastrada." };

  const r = await criarRecebedor({ ...dados, email: quem.email, codigo: `evento-${eventoId}` });
  if (!r.ok) {
    return {
      error:
        r.status === 422 || r.status === 400
          ? "A Pagar.me recusou algum dado. Confira CPF, conta e endereço."
          : r.status === 412
            ? "A Pagar.me ainda não liberou contas de recebimento. Fale com a cerimonialista."
            : "Não foi possível falar com a Pagar.me agora. Tente de novo em instantes.",
    };
  }
  const partes = dados.nome.trim().split(/\s+/);
  const { error } = await db.from("evento_recebedor").insert({
    event_id: eventoId,
    pagarme_recipient_id: r.dados.id,
    status: r.dados.status in ESTADOS ? r.dados.status : "registration",
    kyc_status: r.dados.kyc_details?.status ?? null,
    titular_nome: `${partes[0]} ${partes[partes.length - 1].charAt(0)}.`,
    banco_resumo: resumoDoBanco(dados.banco, dados.conta),
    criado_por: quem.userId,
    criado_por_nome: quem.nome,
  });
  if (error) return { error: "O cadastro foi feito na Pagar.me, mas não ficou salvo aqui. Fale com a cerimonialista." };
  revalidatePath(`/portal/${eventoId}/presentes`);
  return { ok: true };
}

const ESTADOS: Record<string, true> = { registration: true, affiliation: true, active: true, refused: true, suspended: true, blocked: true, inactive: true };

/** Relê o estado na Pagar.me (o aviso por webhook também faz isso). */
export async function atualizarRecebedor(eventoId: string): Promise<Retorno> {
  const db = servico();
  const { data } = await db.from("evento_recebedor").select("pagarme_recipient_id").eq("event_id", eventoId).maybeSingle();
  const id = (data as { pagarme_recipient_id?: string } | null)?.pagarme_recipient_id;
  // só quem vê o evento pede a releitura
  const { data: visivel } = await createClient().from("evento_recebedor").select("event_id").eq("event_id", eventoId).maybeSingle();
  if (!id || !visivel) return { error: "Nenhuma conta cadastrada." };
  const r = await lerRecebedor(id);
  if (!r.ok) return { error: "Não foi possível falar com a Pagar.me agora." };
  await db
    .from("evento_recebedor")
    .update({ status: r.dados.status in ESTADOS ? r.dados.status : "registration", kyc_status: r.dados.kyc_details?.status ?? null, updated_at: new Date().toISOString() })
    .eq("event_id", eventoId);
  revalidatePath(`/portal/${eventoId}/presentes`);
  return { ok: true };
}

/** O link da prova de vida — só para o responsável. */
export async function provaDeVida(eventoId: string): Promise<{ url: string } | { error: string }> {
  const quem = await responsavel(eventoId);
  if (!quem) return { error: "Quem faz a prova de vida é o responsável." };
  const { data } = await servico().from("evento_recebedor").select("pagarme_recipient_id").eq("event_id", eventoId).maybeSingle();
  const id = (data as { pagarme_recipient_id?: string } | null)?.pagarme_recipient_id;
  if (!id) return { error: "Cadastre a conta primeiro." };
  const r = await linkDaProvaDeVida(id);
  if (r.ok) return { url: r.url };
  // 401 da Pagar.me = o pedido veio de um IP que a conta não autorizou
  // (o link da prova de vida exige lista de IPs na produção): esperar não
  // resolve, então a tela não manda esperar
  return {
    error:
      r.status === 401 || r.status === 403
        ? "A prova de vida não está disponível agora. Fale com a cerimonialista."
        : "Não foi possível falar com a Pagar.me agora. Tente de novo em instantes.",
  };
}
