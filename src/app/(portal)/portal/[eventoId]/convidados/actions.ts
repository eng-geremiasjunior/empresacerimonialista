"use server";

// A cliente monta a lista dela. A guarda é a RLS (as policies de portal
// da 092 exigem que o evento seja dela) — aqui só validamos forma e
// revalidamos o cache.
//
// Nenhum dado de convidado entra em endereço de página: a tela manda o
// id no corpo, e a confirmação pública usa o hash, que não deriva de
// nada pessoal.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ConvidadoForm = {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  lado?: "noiva" | "noivo" | null;
  grupo?: string | null;
};

type Retorno = { ok?: true; error?: string };

const limpo = (v: string | null | undefined, max = 120) =>
  v && v.trim() ? v.trim().slice(0, max) : null;

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/convidados`);
  revalidatePath(`/portal/${eventoId}`);
}

export async function adicionarConvidado(
  eventoId: string,
  form: ConvidadoForm
): Promise<Retorno> {
  const nome = limpo(form.nome);
  if (!nome) return { error: "Informe o nome." };

  const supabase = createClient();
  const { error } = await supabase.from("evento_convidado").insert({
    event_id: eventoId,
    nome,
    telefone: limpo(form.telefone, 40),
    email: limpo(form.email, 160),
    lado: form.lado ?? null,
    grupo: limpo(form.grupo, 60),
    origem: "cliente",
  });

  if (error) return { error: "Não foi possível adicionar." };
  revalidar(eventoId);
  return { ok: true };
}

export async function atualizarConvidado(
  eventoId: string,
  id: string,
  form: ConvidadoForm
): Promise<Retorno> {
  const nome = limpo(form.nome);
  if (!nome) return { error: "Informe o nome." };

  const supabase = createClient();
  const { error } = await supabase
    .from("evento_convidado")
    .update({
      nome,
      telefone: limpo(form.telefone, 40),
      email: limpo(form.email, 160),
      lado: form.lado ?? null,
      grupo: limpo(form.grupo, 60),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("event_id", eventoId);

  if (error) return { error: "Não foi possível salvar." };
  revalidar(eventoId);
  return { ok: true };
}

export async function removerConvidado(
  eventoId: string,
  id: string
): Promise<Retorno> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_convidado")
    .delete()
    .eq("id", id)
    .eq("event_id", eventoId);

  if (error) return { error: "Não foi possível remover." };
  revalidar(eventoId);
  return { ok: true };
}

/**
 * Quantos dias antes do evento o lembrete sai para os convidados.
 * null = a cliente não quer lembrete automático, e aí ninguém recebe
 * nada — silêncio é o padrão.
 */
export async function definirLembrete(
  eventoId: string,
  dias: number | null
): Promise<Retorno> {
  if (dias !== null && (!Number.isInteger(dias) || dias < 1 || dias > 60)) {
    return { error: "Escolha entre 1 e 60 dias." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ rsvp_lembrete_dias: dias })
    .eq("id", eventoId);

  if (error) return { error: "Não foi possível salvar agora." };
  revalidar(eventoId);
  return { ok: true };
}

/**
 * A válvula do link público: se ele cair em lugar errado, ou quando a
 * lista fecha, a cliente encerra as confirmações sem precisar de
 * ninguém. Quem abrir depois disso vê um recado, não um formulário.
 */
export async function fecharOuAbrirLink(
  eventoId: string,
  aberto: boolean
): Promise<Retorno> {
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ rsvp_aberto: aberto })
    .eq("id", eventoId);

  if (error) return { error: "Não foi possível alterar agora." };
  revalidar(eventoId);
  return { ok: true };
}

/**
 * Confirmação lançada à mão — quem respondeu por telefone. Marca
 * `manual` para a lista distinguir de quem clicou no link.
 */
export async function lancarConfirmacao(
  eventoId: string,
  id: string,
  confirmacao: "aguardando" | "confirmado" | "nao_vai",
  extras?: { acompanhantes?: number; criancas?: number; restricao?: string | null }
): Promise<Retorno> {
  const supabase = createClient();
  const confirmado = confirmacao === "confirmado";
  const { error } = await supabase
    .from("evento_convidado")
    .update({
      confirmacao,
      acompanhantes: confirmado
        ? Math.max(0, Math.min(20, extras?.acompanhantes ?? 0))
        : 0,
      criancas: confirmado
        ? Math.max(0, Math.min(20, extras?.criancas ?? 0))
        : 0,
      restricao_alimentar: confirmado ? limpo(extras?.restricao, 400) : null,
      confirmado_em: confirmacao === "aguardando" ? null : new Date().toISOString(),
      confirmado_via: confirmacao === "aguardando" ? null : "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("event_id", eventoId);

  if (error) return { error: "Não foi possível lançar." };
  revalidar(eventoId);
  return { ok: true };
}
