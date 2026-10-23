"use server";

// As ações da aba RSVP — o lado da CERIMONIALISTA da mesma lista.
//
// A LISTA É UMA SÓ. A cliente mexe nela pelo portal; a cerimonialista,
// por aqui. As duas escrevem em `evento_convidado`, e é o banco que
// garante a sincronia — não há cópia, não há "exportar para o portal".
// O que a cliente adicionou à noite aparece aqui de manhã, e vice-versa.
//
// POR QUE AÇÕES PRÓPRIAS, e não as do portal: as de lá gravam
// `origem: "cliente"` e só atualizam as telas do portal. Quem cadastra
// aqui é a equipe — a origem tem de dizer isso, porque a lista mostra
// quem pôs cada nome — e as DUAS telas precisam se atualizar.
//
// A guarda é a RLS por empresa (a mesma que já deixa a equipe gravar na
// tela de Mesas). Aqui só se valida a forma.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { possoUsar } from "@/lib/supabase/nivel-do-plano";

type Retorno = { ok?: true; error?: string };

/**
 * Fechar a lista (21/10/2026): o fechamento vai para o Caderno do evento,
 * com os números do dia. A data dessa nota é o que o próximo fechamento
 * compara ("o que mudou desde…").
 */
export async function registrarFechamento(eventId: string, texto: string): Promise<Retorno> {
  const conteudo = texto.trim().slice(0, 4000);
  if (!conteudo.startsWith("Lista fechada em")) return { error: "Fechamento inválido." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para continuar." };
  const { error } = await supabase.from("event_notes").insert({ event_id: eventId, author_id: user.id, content: conteudo });
  if (error) return { error: "Não foi possível registrar o fechamento." };
  revalidatePath(`/eventos/${eventId}/rsvp`);
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { ok: true };
}

/**
 * O prazo de resposta (22/10/2026, 221): a data-limite das confirmações,
 * definida pela equipe. Null tira o prazo da equipe (volta a valer o do
 * site do casal, se houver).
 */
export async function definirPrazoDoRsvp(eventId: string, prazo: string | null): Promise<Retorno> {
  if (prazo !== null && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return { error: "Data inválida." };
  if (prazo !== null && (prazo < "2020-01-01" || prazo > "2100-12-31")) return { error: "Data inválida." };
  const supabase = createClient();
  const { data, error } = await supabase.from("events").update({ rsvp_prazo: prazo }).eq("id", eventId).select("id");
  if (error) return { error: "Não foi possível guardar o prazo." };
  if (!data?.length) return { error: "Você não pode mudar este evento." };
  revalidatePath(`/eventos/${eventId}/rsvp`);
  return { ok: true };
}

const limpo = (v: string | null | undefined, max = 120) =>
  v && v.trim() ? v.trim().slice(0, max) : null;

/** As duas pontas da mesma lista. */
function revalidarAsDuasPontas(eventId: string) {
  revalidatePath(`/eventos/${eventId}/rsvp`);
  revalidatePath(`/portal/${eventId}/convidados`);
  revalidatePath(`/portal/${eventId}`);
}

export async function adicionarConvidadoPelaEquipe(
  eventId: string,
  form: { nome: string; telefone?: string | null }
): Promise<Retorno> {
  const nome = limpo(form.nome);
  if (!nome) return { error: "Informe o nome." };

  const supabase = createClient();
  const { error } = await supabase.from("evento_convidado").insert({
    event_id: eventId,
    nome,
    telefone: limpo(form.telefone, 40),
    origem: "equipe",
  });
  if (error) return { error: "Não foi possível adicionar." };

  revalidarAsDuasPontas(eventId);
  return { ok: true };
}

/**
 * Abre ou fecha o link ÚNICO do evento (o que se espalha no WhatsApp).
 * Fechado, quem abre o link vê que as confirmações encerraram — ninguém
 * novo entra na lista. Não apaga nada.
 */
export async function abrirOuFecharConfirmacoes(
  eventId: string,
  aberto: boolean
): Promise<Retorno> {
  // a 204 não deixa a chave ligar no Gratuito; aqui a tela ouve o porquê
  if (aberto && !(await possoUsar("rsvp"))) {
    return { error: "A confirmação de presença é dos planos pagos. Assine um plano para abrir." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ rsvp_aberto: aberto })
    .eq("id", eventId);
  if (error) return { error: "Não foi possível mudar as confirmações." };

  revalidarAsDuasPontas(eventId);
  return { ok: true };
}

// ------------------------------------------------------------------
// A ficha em três painéis (13/10/2026)
// ------------------------------------------------------------------

type Resposta = "aguardando" | "confirmado" | "nao_vai";

/**
 * A cerimonialista muda a resposta: o convidado respondeu no WhatsApp
 * dela, por telefone, na missa. Fica marcado como resposta à mão.
 */
export async function mudarResposta(eventId: string, convidadoId: string, resposta: Resposta): Promise<Retorno> {
  if (!["aguardando", "confirmado", "nao_vai"].includes(resposta)) return { error: "Resposta inválida." };
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_convidado")
    .update({
      confirmacao: resposta,
      confirmado_via: resposta === "aguardando" ? null : "manual",
      confirmado_em: resposta === "aguardando" ? null : new Date().toISOString(),
    })
    .eq("id", convidadoId)
    .eq("event_id", eventId);
  if (error) return { error: "Não foi possível mudar a resposta." };
  revalidarAsDuasPontas(eventId);
  return { ok: true };
}

/**
 * Ela tocou em "Enviar entrada" ou "Pedir confirmação" e o WhatsApp DELA
 * abriu com a mensagem pronta. Grava que abriu — não que foi enviada
 * (208). Sem a 208 no banco, só não grava.
 */
export async function registrarWhatsappAberto(
  eventId: string,
  convidadoId: string,
  tipo: "entrada" | "pedido"
): Promise<Retorno> {
  const supabase = createClient();
  const agora = new Date().toISOString();
  await supabase
    .from("evento_convidado")
    .update(
      tipo === "entrada"
        ? { entrada_enviada_em: agora, entrada_enviada_via: "whatsapp" }
        : { pedido_enviado_em: agora, pedido_enviado_via: "whatsapp" }
    )
    .eq("id", convidadoId)
    .eq("event_id", eventId);
  revalidatePath(`/eventos/${eventId}/rsvp`);
  return { ok: true };
}

const LOTE_DE_EMAIL = 30;

/**
 * A entrada (para confirmados) ou o pedido de confirmação (para quem não
 * respondeu), por e-mail, para quem tem e-mail. Em lotes: o Resend aceita
 * poucas chamadas por segundo, e o que sobrar a tela manda de novo.
 */
export async function enviarPorEmail(
  eventId: string,
  tipo: "entrada" | "pedido",
  ids?: string[]
): Promise<{ enviados: number; falharam: number; restam: number; error?: string }> {
  if (!(await possoUsar("rsvp"))) {
    return { enviados: 0, falharam: 0, restam: 0, error: "A confirmação de presença é dos planos pagos." };
  }
  const supabase = createClient();
  const { data: ev } = await supabase
    .from("events")
    .select("id, type, name, date, time, location, city")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev?.date) return { enviados: 0, falharam: 0, restam: 0, error: "Falta a data do evento: preencha antes de mandar." };

  let consulta = supabase
    .from("evento_convidado")
    .select("id, nome, email, hash, acompanhantes, criancas")
    .eq("event_id", eventId)
    .eq("confirmacao", tipo === "entrada" ? "confirmado" : "aguardando")
    .not("email", "is", null)
    .is("presente_em", null)
    .order("nome");
  if (ids && ids.length) consulta = consulta.in("id", ids.slice(0, 500));
  const { data: lista, error } = await consulta;
  if (error) return { enviados: 0, falharam: 0, restam: 0, error: "Não foi possível ler a lista." };

  const comEmail = ((lista ?? []) as { id: string; nome: string; email: string | null; hash: string; acompanhantes: number | null; criancas: number | null }[])
    .filter((c) => c.email && /@/.test(c.email));
  const lote = comEmail.slice(0, LOTE_DE_EMAIL);

  const [{ anfitrioesDoConvite }, { convitePara }, emails] = await Promise.all([
    import("@/lib/anfitrioes-do-convite"),
    import("@/lib/rsvp-convite"),
    import("@/lib/email-convidado"),
  ]);
  const anfitrioes = await anfitrioesDoConvite(ev.name, { eventoId: eventId });
  let enviados = 0;
  let falharam = 0;
  for (const c of lote) {
    const dados = {
      para: c.email!,
      nome: c.nome,
      anfitrioes,
      convitePara: convitePara(ev.type ?? ""),
      data: ev.date as string,
      hora: (ev.time as string | null) ?? null,
      local: (ev.location as string | null) ?? null,
      cidade: (ev.city as string | null) ?? null,
      confirmado: tipo === "entrada",
      pessoas: 1 + (c.acompanhantes ?? 0) + (c.criancas ?? 0),
      hash: c.hash,
    };
    const r = tipo === "entrada" ? await emails.enviarEntradaConvidado(dados) : await emails.enviarLembreteConvidado(dados);
    if (r.ok) {
      enviados += 1;
      const agora = new Date().toISOString();
      await supabase
        .from("evento_convidado")
        .update(
          tipo === "entrada"
            ? { entrada_enviada_em: agora, entrada_enviada_via: "email" }
            : { pedido_enviado_em: agora, pedido_enviado_via: "email" }
        )
        .eq("id", c.id);
    } else {
      falharam += 1;
    }
    await new Promise((ok) => setTimeout(ok, 350));
  }
  revalidatePath(`/eventos/${eventId}/rsvp`);
  return { enviados, falharam, restam: Math.max(0, comEmail.length - lote.length) };
}

/**
 * A lista que a noiva mandou (Excel, Word, WhatsApp), já conferida na
 * tela. O servidor confere de novo: forma de cada campo e nome repetido
 * (o que já está na lista não entra duas vezes).
 */
export async function importarConvidados(
  eventId: string,
  linhas: import("@/lib/importar-convidados").LinhaImportada[]
): Promise<{ adicionados: number; repetidos: number; error?: string }> {
  const { MAX_IMPORTACAO, separarRepetidos } = await import("@/lib/importar-convidados");
  if (!Array.isArray(linhas) || linhas.length === 0) return { adicionados: 0, repetidos: 0, error: "Nenhum nome para adicionar." };
  const supabase = createClient();
  const { data: atuais, error: erroLer } = await supabase.from("evento_convidado").select("nome").eq("event_id", eventId);
  if (erroLer) return { adicionados: 0, repetidos: 0, error: "Não foi possível ler a lista atual." };

  const conferidas = linhas.slice(0, MAX_IMPORTACAO).flatMap((l) => {
    const nome = limpo(l?.nome);
    if (!nome || nome.length < 2) return [];
    const email = limpo(l.email, 160);
    return [
      {
        nome,
        telefone: limpo(l.telefone, 40),
        email: email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email.toLowerCase() : null,
        grupo: limpo(l.grupo, 60),
        lado: l.lado === "noiva" || l.lado === "noivo" ? l.lado : null,
        acompanhantes: Math.max(0, Math.min(20, Math.round(Number(l.acompanhantes) || 0))),
        criancas: Math.max(0, Math.min(20, Math.round(Number(l.criancas) || 0))),
      },
    ];
  });
  const { novas, repetidas } = separarRepetidos(
    conferidas,
    ((atuais ?? []) as { nome: string }[]).map((a) => a.nome)
  );
  for (let i = 0; i < novas.length; i += 200) {
    const { error } = await supabase
      .from("evento_convidado")
      .insert(novas.slice(i, i + 200).map((l) => ({ event_id: eventId, origem: "equipe", ...l })));
    if (error) {
      revalidarAsDuasPontas(eventId);
      return { adicionados: i, repetidos: repetidas.length, error: "Parte da lista não foi adicionada. Tente de novo: quem já entrou não se repete." };
    }
  }
  revalidarAsDuasPontas(eventId);
  return { adicionados: novas.length, repetidos: repetidas.length };
}
