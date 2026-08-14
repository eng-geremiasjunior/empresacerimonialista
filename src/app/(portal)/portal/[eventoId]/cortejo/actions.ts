"use server";

// O cortejo é lista dinâmica: a pessoa entra quando é convidada. Nunca
// linhas numeradas esperando preenchimento, e campo vazio simplesmente
// não aparece na tela.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PessoaCortejo } from "@/lib/supabase/portal-pessoas";

export type CortejoForm = {
  papel: PessoaCortejo["papel"];
  nome: string;
  contato?: string | null;
  oQueLeva?: string | null;
  responsavel?: string | null;
  chegada?: string | null;
};

type Retorno = { ok?: true; error?: string };

const limpo = (v: string | null | undefined, max = 120) =>
  v && v.trim() ? v.trim().slice(0, max) : null;

const PAPEIS_VALIDOS = ["padrinho", "madrinha", "dama", "pajem", "porta_alianca"];

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
  if (!PAPEIS_VALIDOS.includes(form.papel)) return { error: "Papel inválido." };

  const supabase = createClient();
  const { error } = await supabase.from("evento_cortejo_pessoa").insert({
    event_id: eventoId,
    papel: form.papel,
    nome,
    contato: limpo(form.contato, 60),
    o_que_leva: limpo(form.oQueLeva, 120),
    responsavel: limpo(form.responsavel, 80),
    chegada: limpo(form.chegada, 40),
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
  const { error } = await supabase
    .from("evento_cortejo_pessoa")
    .update({
      papel: form.papel,
      nome,
      contato: limpo(form.contato, 60),
      o_que_leva: limpo(form.oQueLeva, 120),
      responsavel: limpo(form.responsavel, 80),
      chegada: limpo(form.chegada, 40),
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
