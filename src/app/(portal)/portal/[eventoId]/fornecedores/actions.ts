"use server";

// Os fornecedores da família (181): quem a família mesma chamou. A RLS
// da 181 deixa só a família escrever; a equipe lê.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Retorno = { ok: true } | { error: string };
const limpo = (v: string | null | undefined, max: number) => (v && v.trim() ? v.trim().slice(0, max) : null);

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/fornecedores`);
}

export async function adicionarFornecedorDaFamilia(
  eventoId: string,
  f: { nome: string; oQueFaz: string; contato: string; contratado: boolean }
): Promise<Retorno> {
  const nome = limpo(f.nome, 80);
  if (!nome) return { error: "Informe o nome." };
  const { error } = await createClient().from("familia_fornecedor").insert({
    event_id: eventoId,
    nome,
    o_que_faz: limpo(f.oQueFaz, 120),
    contato: limpo(f.contato, 80),
    contratado: f.contratado,
  });
  if (error) return { error: "Não foi possível adicionar agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function marcarContratado(eventoId: string, id: string, contratado: boolean): Promise<Retorno> {
  const { error } = await createClient().from("familia_fornecedor").update({ contratado }).eq("id", id).eq("event_id", eventoId);
  if (error) return { error: "Não foi possível salvar agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function tirarFornecedorDaFamilia(eventoId: string, id: string): Promise<Retorno> {
  const { error } = await createClient().from("familia_fornecedor").delete().eq("id", id).eq("event_id", eventoId);
  if (error) return { error: "Não foi possível tirar agora." };
  revalidar(eventoId);
  return { ok: true };
}
