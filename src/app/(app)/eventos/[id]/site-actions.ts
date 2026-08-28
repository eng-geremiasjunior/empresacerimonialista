"use server";

// O site do casamento pelo lado da EQUIPE: blocos práticos, espaço (com
// as hospedagens que acumulam), endereço bonito e a publicação — que é
// dela, nunca do casal. Erro de RLS silenciosa vira erro na tela
// (.select("id") + zero linhas), padrão da casa.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok?: boolean; error?: string };

function volta(eventId: string) {
  revalidatePath(`/eventos/${eventId}/area-do-cliente`);
}

/**
 * Mensagem das RPCs da 128 já vem pronta para a tela (raise exception) —
 * inteira. A primeira versão cortava tudo até o primeiro dois-pontos
 * para tirar um prefixo que o PostgREST nem manda, e comia a metade que
 * importa ("endereço inválido: use letras minúsculas…").
 */
function erroDaRpc(error: { code?: string; message?: string } | null): string {
  if (error?.code === "P0001" && error.message) return error.message;
  if (error?.code === "PGRST202") {
    return "O site do casamento ainda não está disponível nesta conta.";
  }
  return "Não foi possível salvar.";
}

/** Só http(s) chega ao href da página pública (javascript: executaria). */
function linkSeguro(v: string | undefined): string | null {
  const s = v?.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    // sem esquema: assume https, que é o que a pessoa quis dizer
    return /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s) ? `https://${s}` : null;
  }
}

export async function garantirSite(eventId: string): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_site")
    .upsert({ event_id: eventId }, { onConflict: "event_id", ignoreDuplicates: true });
  if (error) {
    console.error("[vela:site] garantir:", error.code, error.message);
    return { error: erroDaRpc(error) };
  }
  volta(eventId);
  return { ok: true };
}

export async function salvarBlocosSite(
  eventId: string,
  blocos: { titulo: string; texto: string }[]
): Promise<Resultado> {
  if (blocos.length > 8) return { error: "No máximo 8 blocos." };
  const limpos = blocos
    .map((b) => ({
      titulo: b.titulo.trim().slice(0, 60),
      texto: b.texto.trim().slice(0, 800),
    }))
    .filter((b) => b.titulo && b.texto);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_site")
    .update({ blocos: limpos, updated_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .select("id");
  if (error) return { error: "Não foi possível salvar." };
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar este evento." };
  }
  volta(eventId);
  return { ok: true };
}

export async function vincularEspaco(
  eventId: string,
  espacoId: string | null
): Promise<Resultado> {
  const supabase = createClient();

  // O espaço tem que ser DESTA empresa: a RLS de events valida o evento,
  // não o espaço, e a FK aceita qualquer um. Sem esta conferência dava
  // para apontar o espaço de outra empresa e a página pública (security
  // definer) publicaria o cadastro de hospedagens dela.
  if (espacoId) {
    const { data: espaco } = await supabase
      .from("espacos")
      .select("id")
      .eq("id", espacoId)
      .maybeSingle();
    if (!espaco) return { error: "Espaço não encontrado." };
  }

  const { data, error } = await supabase
    .from("events")
    .update({ espaco_id: espacoId })
    .eq("id", eventId)
    .select("id");
  if (error) return { error: "Não foi possível vincular o espaço." };
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar este evento." };
  }
  volta(eventId);
  return { ok: true };
}

export async function criarEspaco(
  eventId: string,
  dados: { nome: string; endereco?: string; cidade?: string; transporte?: string }
): Promise<Resultado & { id?: string }> {
  const nome = dados.nome.trim();
  if (!nome) return { error: "Informe o nome do espaço." };

  const supabase = createClient();
  const { data: cargo } = await supabase.rpc("meu_cargo");
  const empresaId = (cargo as { empresa_id: string }[] | null)?.[0]?.empresa_id;
  if (!empresaId) return { error: "Sessão sem empresa." };

  const { data, error } = await supabase
    .from("espacos")
    .insert({
      empresa_id: empresaId,
      nome,
      endereco: dados.endereco?.trim() || null,
      cidade: dados.cidade?.trim() || null,
      transporte: dados.transporte?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível criar o espaço." };

  // já vincula ao evento que pediu — e se o vínculo for recusado (cargo
  // que cria espaço mas não edita ESTE evento), desfaz o espaço: senão
  // cada tentativa deixaria um duplicado invisível no cadastro
  const v = await vincularEspaco(eventId, data.id);
  if (v.error) {
    await supabase.from("espacos").delete().eq("id", data.id);
    return v;
  }
  return { ok: true, id: data.id };
}

export async function salvarEspaco(
  eventId: string,
  espacoId: string,
  dados: { nome: string; endereco?: string; cidade?: string; transporte?: string }
): Promise<Resultado> {
  const nome = dados.nome.trim();
  if (!nome) return { error: "Informe o nome do espaço." };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("espacos")
    .update({
      nome,
      endereco: dados.endereco?.trim() || null,
      cidade: dados.cidade?.trim() || null,
      transporte: dados.transporte?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", espacoId)
    .select("id");
  if (error) return { error: "Não foi possível salvar o espaço." };
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar espaços." };
  }
  volta(eventId);
  return { ok: true };
}

export async function adicionarHospedagem(
  eventId: string,
  espacoId: string,
  dados: { nome: string; distancia?: string; faixaPreco?: string; nota?: string; link?: string }
): Promise<Resultado> {
  const nome = dados.nome.trim();
  if (!nome) return { error: "Informe o nome da pousada ou hotel." };
  const supabase = createClient();
  const { data: ultima } = await supabase
    .from("espaco_hospedagem")
    .select("ordem")
    .eq("espaco_id", espacoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("espaco_hospedagem")
    .insert({
      espaco_id: espacoId,
      nome,
      distancia: dados.distancia?.trim() || null,
      faixa_preco: dados.faixaPreco?.trim() || null,
      nota: dados.nota?.trim() || null,
      link: linkSeguro(dados.link),
      ordem: (ultima?.ordem ?? 0) + 10,
    })
    .select("id");
  if (error) return { error: "Não foi possível adicionar." };
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar espaços." };
  }
  volta(eventId);
  return { ok: true };
}

export async function removerHospedagem(
  eventId: string,
  hospedagemId: string
): Promise<Resultado> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("espaco_hospedagem")
    .delete()
    .eq("id", hospedagemId)
    .select("id");
  if (error) return { error: "Não foi possível remover." };
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar espaços." };
  }
  volta(eventId);
  return { ok: true };
}

export async function definirSlug(
  eventId: string,
  slug: string
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("definir_slug_site", {
    p_event_id: eventId,
    p_slug: slug,
  });
  if (error) {
    console.error("[vela:site] slug:", error.code, error.message);
    return { error: erroDaRpc(error) };
  }
  volta(eventId);
  return { ok: true };
}

export async function publicarSite(
  eventId: string,
  publicado: boolean
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase.rpc("publicar_site", {
    p_event_id: eventId,
    p_publicado: publicado,
  });
  if (error) {
    console.error("[vela:site] publicar:", error.code, error.message);
    return { error: erroDaRpc(error) };
  }
  volta(eventId);
  return { ok: true };
}
