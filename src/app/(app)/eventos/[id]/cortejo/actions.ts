"use server";

// Cortejo pelo lado da EQUIPE — a cerimonialista monta as listas quando
// a comissão manda tudo por WhatsApp em vez de preencher o portal.
// A RLS (092) já dava escrita a quem pode editar o evento; faltava a
// porta. Entrada em lote existe porque a lista de formandos chega
// pronta: colar 80 nomes um a um seria castigo.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { papeisDoTipo } from "@/lib/portal-pessoas-shared";

type Retorno = { ok?: true; error?: string };

const limpo = (v: string | null | undefined, max = 120) =>
  v && v.trim() ? v.trim().slice(0, max) : null;

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/cortejo`);
}

async function tipoDoEvento(
  supabase: ReturnType<typeof createClient>,
  eventId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("events")
    .select("type")
    .eq("id", eventId)
    .maybeSingle();
  return (data?.type as string | null) ?? null;
}

export async function adicionarPessoasEquipe(
  eventId: string,
  papel: string,
  nomes: string[],
  pronuncia?: string | null
): Promise<Retorno> {
  const lista = nomes.map((n) => limpo(n)).filter(Boolean) as string[];
  if (lista.length === 0) return { error: "Informe ao menos um nome." };
  if (lista.length > 300) return { error: "Muitos nomes de uma vez (máx. 300)." };

  const supabase = createClient();
  const tipo = await tipoDoEvento(supabase, eventId);
  if (!tipo) return { error: "Evento não encontrado." };
  if (!papeisDoTipo(tipo).includes(papel)) return { error: "Papel inválido." };

  const { data: ultimo } = await supabase
    .from("evento_cortejo_pessoa")
    .select("ordem")
    .eq("event_id", eventId)
    .eq("papel", papel)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  let ordem = ultimo?.ordem ?? 0;
  const notaPronuncia = limpo(pronuncia, 120);
  const linhas = lista.map((nome) => ({
    event_id: eventId,
    papel,
    nome,
    // pronúncia só faz sentido quando é UMA pessoa — num lote iria a
    // mesma nota para nomes diferentes
    ...(lista.length === 1 && notaPronuncia
      ? { pronuncia: notaPronuncia }
      : {}),
    ordem: (ordem += 10),
    origem: "equipe" as const,
  }));

  const { data, error } = await supabase
    .from("evento_cortejo_pessoa")
    .insert(linhas)
    .select("id");
  if (error) {
    console.error("[vela:cortejo] adicionar:", error.code, error.message);
    return { error: "Não foi possível adicionar." };
  }
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar este evento." };
  }
  revalidar(eventId);
  return { ok: true };
}

export async function atualizarPessoaEquipe(
  eventId: string,
  id: string,
  form: { papel: string; nome: string; pronuncia?: string | null }
): Promise<Retorno> {
  const nome = limpo(form.nome);
  if (!nome) return { error: "Informe o nome." };

  const supabase = createClient();
  // Papel novo precisa estar na lista do tipo; papel que a pessoa JÁ tem
  // passa sem validar — senão uma linha legada (papéis de casamento
  // gravados antes da 125) travaria até a correção de um typo no nome.
  const { data: atual } = await supabase
    .from("evento_cortejo_pessoa")
    .select("papel")
    .eq("id", id)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!atual) return { error: "Pessoa não encontrada." };
  if (form.papel !== atual.papel) {
    const tipo = await tipoDoEvento(supabase, eventId);
    if (!tipo) return { error: "Evento não encontrado." };
    if (!papeisDoTipo(tipo).includes(form.papel)) {
      return { error: "Papel inválido." };
    }
  }

  const { data, error } = await supabase
    .from("evento_cortejo_pessoa")
    .update({
      papel: form.papel,
      nome,
      pronuncia: limpo(form.pronuncia, 120),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("event_id", eventId)
    .select("id");

  if (error) {
    console.error("[vela:cortejo] atualizar:", error.code, error.message);
    return { error: "Não foi possível salvar." };
  }
  // RLS que filtra silenciosamente não pode virar "salvo" na tela
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar este evento." };
  }
  revalidar(eventId);
  return { ok: true };
}

export async function removerPessoaEquipe(
  eventId: string,
  id: string
): Promise<Retorno> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_cortejo_pessoa")
    .delete()
    .eq("id", id)
    .eq("event_id", eventId)
    .select("id");

  if (error) return { error: "Não foi possível remover." };
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar este evento." };
  }
  revalidar(eventId);
  return { ok: true };
}

/**
 * Reordena um grupo inteiro: o cliente manda a lista de ids na ordem
 * final e o servidor grava ordem 10, 20, 30… Uma chamada por gesto de
 * mover — sem corrida entre dois "subir" na mesma linha.
 */
export async function reordenarPapelEquipe(
  eventId: string,
  papel: string,
  idsNaOrdem: string[]
): Promise<Retorno> {
  if (idsNaOrdem.length === 0) return { ok: true };
  if (idsNaOrdem.length > 400) return { error: "Lista longa demais." };

  const supabase = createClient();
  // updates em série; a RLS confere evento+permissão em cada linha
  for (let i = 0; i < idsNaOrdem.length; i++) {
    const { data, error } = await supabase
      .from("evento_cortejo_pessoa")
      .update({ ordem: (i + 1) * 10 })
      .eq("id", idsNaOrdem[i])
      .eq("event_id", eventId)
      .eq("papel", papel)
      .select("id");
    if (error) {
      console.error("[vela:cortejo] reordenar:", error.code, error.message);
      return { error: "Não foi possível reordenar." };
    }
    // zero linhas = a RLS recusou (ou a lista mudou embaixo) — parar e
    // avisar em vez de confirmar uma ordem que não foi gravada
    if (!data || data.length === 0) {
      return { error: "Não foi possível reordenar — recarregue a página." };
    }
  }
  revalidar(eventId);
  return { ok: true };
}
