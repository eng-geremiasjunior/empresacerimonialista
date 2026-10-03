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

/**
 * Cadastra a conta que recebe — ou REFAZ o cadastro, enquanto ela não foi
 * aprovada. A Pagar.me não deixa editar campo já preenchido de um
 * recebedor (e-mail, conta…): o conserto de um dado errado é um recebedor
 * novo, que toma o lugar do antigo aqui (o antigo fica sem uso lá) e pede
 * a prova de vida de novo. Conta aprovada não se troca por aqui.
 */
export async function cadastrarRecebedor(eventoId: string, dados: DadosDoRecebedor): Promise<Retorno> {
  const quem = await responsavel(eventoId);
  if (!quem) return { error: "Quem cadastra a conta é o responsável pelo evento." };
  const problema = problemaNoCadastro(dados);
  if (problema) return { error: problema };
  const email = (dados.email?.trim() || quem.email).toLowerCase();

  const db = servico();
  const { data: ja } = await db.from("evento_recebedor").select("status").eq("event_id", eventoId).maybeSingle();
  const atual = ja as { status?: string } | null;
  if (atual?.status === "active") return { error: "A conta deste evento já está aprovada." };

  // o código do recebedor na Pagar.me: o do evento; no refazer, com um sufixo
  const codigo = atual ? `evento-${eventoId}-${Date.now().toString(36)}` : `evento-${eventoId}`;
  const r = await criarRecebedor({ ...dados, email, codigo });
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
  const linha = {
    pagarme_recipient_id: r.dados.id,
    status: r.dados.status in ESTADOS ? r.dados.status : "registration",
    kyc_status: r.dados.kyc_details?.status ?? null,
    titular_nome: `${partes[0]} ${partes[partes.length - 1].charAt(0)}.`,
    banco_resumo: resumoDoBanco(dados.banco, dados.conta),
    criado_por: quem.userId,
    criado_por_nome: quem.nome,
  };
  const { error } = atual
    ? await db
        .from("evento_recebedor")
        .update({ ...linha, updated_at: new Date().toISOString() })
        .eq("event_id", eventoId)
        // aprovada no meio do caminho (o aviso chegou): não troca
        .neq("status", "active")
    : await db.from("evento_recebedor").insert({ event_id: eventoId, ...linha });
  if (error) return { error: "O cadastro foi feito na Pagar.me, mas não ficou salvo aqui. Fale com a cerimonialista." };
  revalidatePath(`/portal/${eventoId}/presentes`);
  return { ok: true };
}

const ESTADOS: Record<string, true> = { registration: true, affiliation: true, active: true, refused: true, suspended: true, blocked: true, inactive: true };

// ---------------------------------------------------------------- a lista

export type PresenteParaSalvar = {
  id: string;
  codigo: string | null;
  categoria: string;
  titulo: string;
  valor_centavos: number;
  quantidade: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODIGO = /^[a-z0-9-]{1,60}$/;
const CATEGORIA = /^[a-z0-9-]{1,40}$/;

/**
 * Grava a lista inteira (197): as escolhas e os presentes, na ordem. Quem
 * pode é o banco que decide (só o casal); aqui só a forma do envio, as
 * mensagens em português e uma regra: a lista só vai ao ar com a conta
 * que recebe aprovada — sem ela, o convidado veria presentes que não
 * consegue dar.
 */
export async function salvarLista(
  eventoId: string,
  lista: { taxa_do_casal: boolean; mensagem: string | null; publicada: boolean },
  itens: PresenteParaSalvar[]
): Promise<Retorno> {
  if (typeof eventoId !== "string" || !UUID.test(eventoId)) return { error: "Lista inválida." };
  if (!lista || typeof lista !== "object" || !Array.isArray(itens)) return { error: "Lista inválida." };
  if (itens.length > 300) return { error: "A lista passa de 300 presentes." };
  const mensagem = typeof lista.mensagem === "string" ? lista.mensagem.trim() : "";
  if (mensagem.length > 300) return { error: "A frase para os convidados passa de 300 letras." };

  const limpos: PresenteParaSalvar[] = [];
  for (const i of itens) {
    const titulo = typeof i?.titulo === "string" ? i.titulo.trim().replace(/\s+/g, " ") : "";
    const valor = Number(i?.valor_centavos);
    const quantidade = Number(i?.quantidade);
    if (typeof i?.id !== "string" || !UUID.test(i.id)) return { error: "Lista inválida." };
    if (typeof i.categoria !== "string" || !CATEGORIA.test(i.categoria)) return { error: "Lista inválida." };
    if (i.codigo !== null && (typeof i.codigo !== "string" || !CODIGO.test(i.codigo))) return { error: "Lista inválida." };
    if (titulo.length < 2 || titulo.length > 80) return { error: "Todo presente precisa de um nome (até 80 letras)." };
    if (!Number.isInteger(valor) || valor < 5000 || valor > 5_000_000) {
      return { error: `O valor de "${titulo}" precisa ficar entre R$ 50 e R$ 50.000.` };
    }
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 50) {
      return { error: `A quantidade de "${titulo}" vai de 1 a 50.` };
    }
    limpos.push({ id: i.id, codigo: i.codigo, categoria: i.categoria, titulo, valor_centavos: valor, quantidade });
  }

  if (!(await listaDePresentesLiberada(eventoId))) return { error: "A lista de presentes ainda não está disponível." };
  if (lista.publicada === true) {
    const { data } = await servico().from("evento_recebedor").select("status").eq("event_id", eventoId).maybeSingle();
    if ((data as { status?: string } | null)?.status !== "active") {
      return { error: "A lista vai ao ar quando a conta que recebe estiver aprovada." };
    }
  }

  const { error } = await createClient().rpc("portal_salvar_lista", {
    p_event_id: eventoId,
    p_lista: { taxa_do_casal: lista.taxa_do_casal === true, mensagem: mensagem || null, publicada: lista.publicada === true },
    p_itens: limpos,
  });
  if (error) {
    const m = error.message ?? "";
    if (/sem permissão/.test(m)) return { error: "Só o casal pode mudar a lista." };
    if (/conta que recebe/.test(m)) return { error: "A lista vai ao ar quando a conta que recebe estiver aprovada." };
    if (/repetido/.test(m)) return { error: "Há um presente repetido na lista. Recarregue a página." };
    if (/outro evento/.test(m)) return { error: "Lista inválida. Recarregue a página." };
    if (/valores_check/.test(m)) return { error: "Algum presente não foi aceito. Confira os nomes e os valores (de R$ 50 a R$ 50.000)." };
    if (/portal_salvar_lista/.test(m)) return { error: "A lista ainda não pode ser salva neste sistema." };
    console.error("[eorganizei:lista] salvar: falhou");
    return { error: "Não foi possível salvar agora." };
  }
  revalidatePath(`/portal/${eventoId}/presentes`);
  return { ok: true };
}

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
