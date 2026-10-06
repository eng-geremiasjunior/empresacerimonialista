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
import { contaRecebe, problemaNoCadastro, resumoDoBanco, type DadosDoRecebedor } from "@/lib/lista-presentes";
import { criarRecebedor, lerRecebedor, linkDaProvaDeVida } from "@/lib/pagarme-lista";
import { listaDePresentesLiberada } from "@/lib/supabase/portal-presentes";
import { avisarDonoDaContaQueRecebe } from "@/lib/email-prova-de-vida";
import {
  TETO_DE_FOTOS_DO_SITE,
  caminhoDoSiteValido,
  contarFotosDoSite,
  emitirEnvioDeFotoDoSite,
} from "@/lib/supabase/assinar-midia-convite";

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
 * a prova de vida de novo. Conta aprovada não se troca por aqui — nem a que
 * já recebeu presente (200: a lista recebe antes da prova de vida, e o
 * dinheiro ficaria no recebedor antigo).
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
  if (atual) {
    const [{ count: pagos }, { count: abertos }] = await Promise.all([
      db.from("presente_pagamento").select("id", { count: "exact", head: true }).eq("event_id", eventoId).eq("status", "pago"),
      // um Pix ainda aberto também cairia no recebedor antigo
      db
        .from("presente_pagamento")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventoId)
        .eq("status", "aguardando")
        .gt("expira_em", new Date().toISOString()),
    ]);
    if ((pagos ?? 0) > 0) return { error: "Já entraram presentes nesta conta. Ela não pode mais ser trocada por aqui." };
    if ((abertos ?? 0) > 0) return { error: "Há um presente sendo pago agora. Tente de novo em 20 minutos." };
  }

  // o código do recebedor na Pagar.me: o do evento; no refazer, com um sufixo
  const codigo = atual ? `evento-${eventoId}-${Date.now().toString(36)}` : `evento-${eventoId}`;
  const r = await criarRecebedor({ ...dados, email, codigo });
  if (!r.ok) {
    return {
      error:
        r.status === 422 || r.status === 400
          ? "A Pagar.me recusou algum dado. Confira CPF, conta e endereço."
          : r.status === 412
            ? "A conta que recebe ainda não está disponível. Tente de novo mais tarde."
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
  if (error) return { error: "Não foi possível terminar o cadastro agora. Tente de novo em alguns minutos." };

  // o link da prova de vida, por enquanto, sai do painel da Pagar.me (a
  // rota da API responde 401 para a nossa conta): quem cria e manda é o
  // dono do sistema, avisado aqui. Aviso que falha não desfaz o cadastro.
  try {
    const { data: ev } = await db.from("events").select("name, type, date, empresa_id").eq("id", eventoId).maybeSingle();
    const e = ev as { name: string | null; type: string | null; date: string | null; empresa_id: string } | null;
    const { data: emp } = e
      ? await db.from("empresas").select("nome, tipo").eq("id", e.empresa_id).maybeSingle()
      : { data: null };
    const em = emp as { nome: string | null; tipo: string | null } | null;
    await avisarDonoDaContaQueRecebe({
      festa: e?.name?.trim() || "Sem nome",
      tipoDoEvento: e?.type ?? null,
      dataDoEvento: e?.date ?? null,
      daFamilia: em?.tipo === "familia",
      cerimonialista: em?.nome ?? null,
      quem: quem.nome,
      email,
      celular: dados.celular,
      titular: linha.titular_nome,
      recebedorId: r.dados.id,
      refeito: !!atual,
    });
  } catch {
    /* o aviso é de conveniência: o cadastro já está salvo */
  }
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
  /** a foto do casal (201): o caminho no balde 'site'. Ausente = a que já estava fica */
  foto?: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODIGO = /^[a-z0-9-]{1,60}$/;
const CATEGORIA = /^[a-z0-9-]{1,40}$/;

/**
 * Grava a lista inteira (197): as escolhas e os presentes, na ordem. Quem
 * pode é o banco que decide (só o casal); aqui só a forma do envio, as
 * mensagens em português e uma regra: a lista só vai ao ar com a conta
 * que recebe cadastrada (200; a prova de vida só segura a transferência) —
 * sem ela, o convidado veria presentes que não consegue dar.
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
    if (i.foto != null && !caminhoDoSiteValido(i.foto, eventoId)) return { error: "Lista inválida." };
    limpos.push({
      id: i.id,
      codigo: i.codigo,
      categoria: i.categoria,
      titulo,
      valor_centavos: valor,
      quantidade,
      // só vai quando tem: sem a 201 aplicada, a lista sem foto continua salvando
      ...(i.foto ? { foto: i.foto } : {}),
    });
  }

  if (!(await listaDePresentesLiberada(eventoId))) return { error: "A lista de presentes ainda não está disponível." };
  if (lista.publicada === true) {
    // a conta CADASTRADA basta (200): a prova de vida só segura a transferência
    const { data } = await servico().from("evento_recebedor").select("status").eq("event_id", eventoId).maybeSingle();
    if (!contaRecebe(data as { status?: string } | null)) {
      return { error: "A lista vai ao ar depois que vocês cadastrarem a conta que recebe." };
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
    if (/conta que recebe/.test(m)) return { error: "A lista vai ao ar depois que vocês cadastrarem a conta que recebe." };
    if (/repetido/.test(m)) return { error: "Há um presente repetido na lista. Recarregue a página." };
    if (/campo desconhecido no presente: foto/.test(m)) return { error: "A foto do presente ainda não pode ser salva neste sistema." };
    if (/outro evento/.test(m)) return { error: "Lista inválida. Recarregue a página." };
    if (/valores_check/.test(m)) return { error: "Algum presente não foi aceito. Confira os nomes e os valores (de R$ 50 a R$ 50.000)." };
    if (/portal_salvar_lista/.test(m)) return { error: "A lista ainda não pode ser salva neste sistema." };
    console.error("[eorganizei:lista] salvar: falhou");
    return { error: "Não foi possível salvar agora." };
  }
  // o portal inteiro: com a lista no ar, o banner e o presente flutuante somem
  revalidatePath(`/portal/${eventoId}`, "layout");
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

/**
 * O link da prova de vida — só para o responsável. Enquanto a Pagar.me
 * responde 401 a esta rota para a nossa conta (03/10/2026: trava da
 * operação, com o suporte), o link sai do painel dela pelas mãos do dono
 * do sistema, que é avisado no cadastro: a tela diz isso, sem erro.
 */
export async function provaDeVida(eventoId: string): Promise<{ url: string } | { manual: string } | { error: string }> {
  const quem = await responsavel(eventoId);
  if (!quem) return { error: "Quem faz a prova de vida é o responsável." };
  const { data } = await servico().from("evento_recebedor").select("pagarme_recipient_id").eq("event_id", eventoId).maybeSingle();
  const id = (data as { pagarme_recipient_id?: string } | null)?.pagarme_recipient_id;
  if (!id) return { error: "Cadastre a conta primeiro." };
  const r = await linkDaProvaDeVida(id);
  if (r.ok) return { url: r.url };
  if (r.status === 401 || r.status === 403) {
    return { manual: "O link da prova de vida chega por WhatsApp ou e-mail. Ele vale 20 minutos: abra assim que chegar." };
  }
  return { error: "Não foi possível falar com a Pagar.me agora. Tente de novo em instantes." };
}

// ---------------------------------------------------------------- a foto do presente

/**
 * A URL de envio de UMA foto de presente (201), no balde 'site' (191), com
 * a forma das fotos do site: {evento}/{uuid}.jpg. Só o casal (quem salva a
 * lista); o teto de arquivos do evento no balde é o mesmo do site. A tela
 * sobe direto do navegador (uploadToSignedUrl) e guarda o caminho no
 * presente, que vai com a lista em salvarLista.
 */
export async function pedirEnvioDeFotoDoPresente(
  eventoId: string
): Promise<{ ok: true; caminho: string; token: string } | { error: string }> {
  if (typeof eventoId !== "string" || !UUID.test(eventoId)) return { error: "Lista inválida." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para enviar a foto." };
  const [{ data: nivel }, { data: pode }] = await Promise.all([
    supabase.rpc("portal_meu_nivel", { p_event_id: eventoId }),
    supabase.rpc("portal_pode_fazer", { p_event_id: eventoId, p_area: "escrever" }),
  ]);
  if (nivel !== "casal" || pode !== true) return { error: "Só o casal pode mudar a lista." };
  if (!(await listaDePresentesLiberada(eventoId))) return { error: "A lista de presentes ainda não está disponível." };

  const total = await contarFotosDoSite(eventoId);
  if (total === null) return { error: "Não foi possível enviar agora." };
  if (total >= TETO_DE_FOTOS_DO_SITE) return { error: "O casamento chegou ao limite de fotos." };
  const envio = await emitirEnvioDeFotoDoSite(eventoId);
  if (!envio) return { error: "Não foi possível enviar agora." };
  return { ok: true, caminho: envio.caminho, token: envio.token };
}
