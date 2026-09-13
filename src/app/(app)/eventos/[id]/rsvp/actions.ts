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

type Retorno = { ok?: true; error?: string };

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
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ rsvp_aberto: aberto })
    .eq("id", eventId);
  if (error) return { error: "Não foi possível mudar as confirmações." };

  revalidarAsDuasPontas(eventId);
  return { ok: true };
}
