"use server";

// O cortejo é lista dinâmica: a pessoa entra quando é convidada. Nunca
// linhas numeradas esperando preenchimento, e campo vazio simplesmente
// não aparece na tela.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { papeisDoTipo } from "@/lib/portal-pessoas-shared";

export type CortejoForm = {
  papel: string;
  nome: string;
  contato?: string | null;
  oQueLeva?: string | null;
  responsavel?: string | null;
  chegada?: string | null;
  pronuncia?: string | null;
};

type Retorno = { ok?: true; error?: string };

const limpo = (v: string | null | undefined, max = 120) =>
  v && v.trim() ? v.trim().slice(0, max) : null;

// O papel válido depende do TIPO do evento (125): a lista de casamento e
// a de formatura não se misturam. O tipo vem do banco, não do cliente.
async function papelValido(eventoId: string, papel: string): Promise<boolean> {
  // pela janela do portal (164): a conta do portal não lê events direto
  const evento = await getEventoDoPortal(eventoId);
  return papeisDoTipo(evento?.tipo).includes(papel);
}

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/cortejo`);
  revalidatePath(`/portal/${eventoId}`);
}

export async function adicionarPessoaCortejo(
  eventoId: string,
  form: CortejoForm
): Promise<Retorno> {
  const nome = limpo(form.nome);
  if (!nome) return { error: "Informe o nome." };

  const supabase = createClient();
  if (!(await papelValido(eventoId, form.papel))) {
    return { error: "Papel inválido." };
  }

  // ordem: entra no fim do grupo (a chamada nominal depende dela)
  const { data: ultimo } = await supabase
    .from("evento_cortejo_pessoa")
    .select("ordem")
    .eq("event_id", eventoId)
    .eq("papel", form.papel)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("evento_cortejo_pessoa").insert({
    event_id: eventoId,
    papel: form.papel,
    nome,
    contato: limpo(form.contato, 60),
    o_que_leva: limpo(form.oQueLeva, 120),
    responsavel: limpo(form.responsavel, 80),
    chegada: limpo(form.chegada, 40),
    // só entra no payload quando preenchida: com a 125 pendente a coluna
    // não existe e o PostgREST recusaria o insert inteiro
    ...(limpo(form.pronuncia, 120)
      ? { pronuncia: limpo(form.pronuncia, 120) }
      : {}),
    ordem: (ultimo?.ordem ?? 0) + 10,
    origem: "cliente",
  });

  if (error) return { error: "Não foi possível adicionar." };
  revalidar(eventoId);
  return { ok: true };
}

export async function atualizarPessoaCortejo(
  eventoId: string,
  id: string,
  form: CortejoForm
): Promise<Retorno> {
  const nome = limpo(form.nome);
  if (!nome) return { error: "Informe o nome." };

  const supabase = createClient();
  // O insert sempre validou o papel; o update não (bug da 092) — a mesma
  // régua vale nos dois caminhos. Papel que a pessoa JÁ tem passa sem
  // validar: linha legada (papéis de antes da 125) não pode travar a
  // correção de um typo no nome.
  const { data: atual } = await supabase
    .from("evento_cortejo_pessoa")
    .select("papel")
    .eq("id", id)
    .eq("event_id", eventoId)
    .maybeSingle();
  if (!atual) return { error: "Pessoa não encontrada." };
  if (form.papel !== atual.papel && !(await papelValido(eventoId, form.papel))) {
    return { error: "Papel inválido." };
  }
  const { error } = await supabase
    .from("evento_cortejo_pessoa")
    .update({
      papel: form.papel,
      nome,
      contato: limpo(form.contato, 60),
      o_que_leva: limpo(form.oQueLeva, 120),
      responsavel: limpo(form.responsavel, 80),
      chegada: limpo(form.chegada, 40),
      ...(form.pronuncia !== undefined
        ? { pronuncia: limpo(form.pronuncia, 120) }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("event_id", eventoId);

  if (error) return { error: "Não foi possível salvar." };
  revalidar(eventoId);
  return { ok: true };
}

export async function removerPessoaCortejo(
  eventoId: string,
  id: string
): Promise<Retorno> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_cortejo_pessoa")
    .delete()
    .eq("id", id)
    .eq("event_id", eventoId);

  if (error) return { error: "Não foi possível remover." };
  revalidar(eventoId);
  return { ok: true };
}

/**
 * A ordem de chamada das velas (portal v2): a lista inteira na ordem
 * nova. Só mexe em quem é deste evento e deste papel; a RLS é a trava.
 */
export async function reordenarCortejo(
  eventoId: string,
  papel: string,
  ids: string[]
): Promise<Retorno> {
  if (ids.length === 0 || ids.length > 60) return { error: "Lista inválida." };
  const supabase = createClient();
  const resultados = await Promise.all(
    ids.map((id, i) =>
      supabase
        .from("evento_cortejo_pessoa")
        .update({ ordem: (i + 1) * 10, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("event_id", eventoId)
        .eq("papel", papel)
    )
  );
  if (resultados.some((r) => r.error)) return { error: "Não foi possível mudar a ordem." };
  revalidar(eventoId);
  return { ok: true };
}
