"use server";

// A Agenda da noiva que abriu a conta sozinha (04/10/2026): marcar, mudar
// e tirar um compromisso (prova do vestido, degustação, visita ao
// espaço) e desligar a Agenda do Google. Os compromissos são os da
// cerimonialista (tabela compromisso): o gatilho da 168 leva cada mudança
// para a Agenda do Google de quem ligou, sem nada aqui.
// Só a dona da conta de família (donaDaFesta); a RLS confere de novo.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";
import { criarCompromisso, excluirCompromisso } from "@/app/(app)/eventos/[id]/organizacao/actions";
import { desconectarGoogle } from "@/app/(app)/configuracoes/google-actions";

type Retorno = { ok: true } | { error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/agenda`);
  revalidatePath(`/portal/${eventoId}`);
}

async function guarda(eventoId: string): Promise<Retorno | null> {
  if (!UUID.test(eventoId)) return { error: "Pedido inválido." };
  return (await donaDaFesta(eventoId)) ? null : { error: "Só quem abriu a conta mexe na agenda." };
}

/** Marcar (id null) ou mudar um compromisso. */
export async function salvarCompromissoDaNoiva(
  eventoId: string,
  c: { id: string | null; titulo: string; data: string; hora: string; local: string }
): Promise<Retorno> {
  const g = await guarda(eventoId);
  if (g) return g;
  const titulo = c.titulo.trim().slice(0, 120);
  const local = c.local.trim().slice(0, 200);
  if (!titulo) return { error: "Diga o que é." };
  if (!DATA.test(c.data)) return { error: "Escolha a data." };
  if (c.hora && !HORA.test(c.hora)) return { error: "Confira a hora." };

  if (c.id === null) {
    const r = await criarCompromisso(eventoId, { titulo, data: c.data, hora: c.hora || null, local: local || null });
    if ("error" in r) return { error: "Não foi possível salvar agora. Tente de novo." };
  } else {
    if (!UUID.test(c.id)) return { error: "Pedido inválido." };
    const supabase = createClient();
    const { data, error } = await supabase
      .from("compromisso")
      .update({ titulo, data: c.data, hora: c.hora || null, local: local || null })
      .eq("id", c.id)
      .eq("event_id", eventoId)
      .select("id");
    if (error || !data?.length) return { error: "Não foi possível salvar agora. Tente de novo." };
  }
  revalidar(eventoId);
  return { ok: true };
}

export async function tirarCompromissoDaNoiva(eventoId: string, id: string): Promise<Retorno> {
  const g = await guarda(eventoId);
  if (g) return g;
  if (!UUID.test(id)) return { error: "Pedido inválido." };
  const r = await excluirCompromisso(eventoId, id);
  if ("error" in r) return { error: "Não foi possível tirar agora. Tente de novo." };
  revalidar(eventoId);
  return { ok: true };
}

/** Desligar a Agenda do Google: a mesma saída de Configurações (apaga a agenda eOrganizei lá e a chave aqui). */
export async function desligarGoogleDaNoiva(eventoId: string): Promise<Retorno> {
  const g = await guarda(eventoId);
  if (g) return g;
  const r = await desconectarGoogle();
  if (r.error) return { error: r.error };
  revalidar(eventoId);
  return { ok: true };
}
