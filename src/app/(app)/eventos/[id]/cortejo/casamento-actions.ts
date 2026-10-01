"use server";

// O cortejo do casamento pelo lado da equipe (192): uma sequência só, com
// par, lado e música. A ordem é do evento inteiro (10, 20, 30…), e toda
// gravação reescreve a sequência — o que também conserta a numeração
// antiga, que era por grupo.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cortejoTradicional, ehPapelDoCortejo, emSequencia, posicaoDoPapel } from "@/lib/cortejo-casamento";
import { separarCasal } from "@/components/wizard/nomesDoCasal";

type Retorno = { ok?: true; error?: string };
type Supa = ReturnType<typeof createClient>;
type Linha = { id: string; papel: string; nome: string; ordem: number };

const limpo = (v: string | null | undefined, max = 120) => (v && v.trim() ? v.trim().slice(0, max) : null);
const ladoValido = (l: string | null | undefined) => (l === "noivo" || l === "noiva" ? l : null);

/** A migração 192 ainda não foi aplicada (coluna nova ausente)? */
const semA192 = (e: { code?: string; message?: string } | null) =>
  Boolean(e && (e.code === "PGRST204" || e.code === "42703" || /\b(par|lado|musica)\b/.test(e.message ?? "")));

/**
 * Insere; sem a 192 aplicada, tenta de novo sem as colunas novas — o par
 * vai junto no nome ("Ana e Pedro") e lado e música esperam a migração.
 * A cerimonialista não fica travada esperando o banco.
 */
async function inserir(supabase: Supa, linhas: Record<string, unknown>[], colunas: string) {
  const r1 = await supabase.from("evento_cortejo_pessoa").insert(linhas).select(colunas);
  if (!r1.error || !semA192(r1.error)) return r1;
  const sem = linhas.map(({ par, lado, musica, ...resto }) => {
    void lado;
    void musica;
    return { ...resto, nome: [String(resto.nome ?? ""), String(par ?? "")].filter((x) => x.trim()).join(" e ") };
  });
  return supabase.from("evento_cortejo_pessoa").insert(sem).select(colunas);
}

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/cortejo`);
}

async function eventoDeCasamento(supabase: Supa, eventId: string): Promise<{ cliente: string } | null> {
  const { data } = await supabase.from("events").select("type, clients(name)").eq("id", eventId).maybeSingle();
  const ev = data as { type: string | null; clients: { name: string | null } | { name: string | null }[] | null } | null;
  if (!ev || ev.type !== "casamento") return null;
  const cliente = Array.isArray(ev.clients) ? ev.clients[0] : ev.clients;
  return { cliente: cliente?.name ?? "" };
}

async function lerSequencia(supabase: Supa, eventId: string): Promise<Linha[]> {
  const { data } = await supabase.from("evento_cortejo_pessoa").select("id, papel, nome, ordem").eq("event_id", eventId);
  return emSequencia((data ?? []) as Linha[]);
}

/** Grava 10, 20, 30… na sequência inteira, só nas linhas que mudaram. */
async function gravarOrdem(supabase: Supa, eventId: string, linhas: { id: string; ordem: number }[]): Promise<Retorno> {
  for (let i = 0; i < linhas.length; i++) {
    const nova = (i + 1) * 10;
    if (linhas[i].ordem === nova) continue;
    const { data, error } = await supabase
      .from("evento_cortejo_pessoa")
      .update({ ordem: nova })
      .eq("id", linhas[i].id)
      .eq("event_id", eventId)
      .select("id");
    if (error) {
      console.error("[eorganizei:cortejo] ordem:", error.code, error.message);
      return { error: "Não foi possível salvar a ordem." };
    }
    // RLS que filtra em silêncio não pode virar "salvo" na tela
    if (!data || data.length === 0) return { error: "Não foi possível salvar a ordem — recarregue a página." };
  }
  return { ok: true };
}

/**
 * Entradas novas (uma, ou várias da lista colada). Entram logo depois da
 * última entrada do mesmo momento do cortejo: o casal de padrinhos novo
 * fica junto dos padrinhos, e não depois da noiva.
 */
export async function adicionarEntradas(
  eventId: string,
  dados: {
    papel: string;
    lado?: string | null;
    musica?: string | null;
    oQueLeva?: string | null;
    entradas: { nome: string; par?: string | null }[];
  }
): Promise<Retorno> {
  const entradas = dados.entradas
    .map((e) => ({ nome: limpo(e.nome) ?? "", par: limpo(e.par) }))
    .filter((e) => e.nome || e.par);
  if (entradas.length === 0) return { error: "Informe ao menos um nome." };
  if (entradas.length > 80) return { error: "Muitas entradas de uma vez (máx. 80)." };
  if (!ehPapelDoCortejo(dados.papel)) return { error: "Escolha a entrada." };

  const supabase = createClient();
  if (!(await eventoDeCasamento(supabase, eventId))) return { error: "Evento não encontrado." };

  const atuais = await lerSequencia(supabase, eventId);
  const pos = posicaoDoPapel(dados.papel);
  let depois = -1;
  atuais.forEach((l, i) => {
    if (posicaoDoPapel(l.papel) <= pos) depois = i;
  });
  const lado = ladoValido(dados.lado);
  const linhas = entradas.map((e, i) => ({
    event_id: eventId,
    papel: dados.papel,
    nome: e.nome,
    par: e.par,
    lado,
    musica: limpo(dados.musica, 160),
    o_que_leva: limpo(dados.oQueLeva),
    ordem: (depois + 2 + i) * 10,
    origem: "equipe" as const,
  }));

  const { data, error } = await inserir(supabase, linhas, "id, ordem");
  if (error) {
    console.error("[eorganizei:cortejo] adicionar:", error.code, error.message);
    return { error: "Não foi possível adicionar." };
  }
  if (!data || data.length === 0) return { error: "Você não tem permissão para editar este evento." };

  const novas = data as unknown as { id: string; ordem: number }[];
  const sequencia = [...atuais.slice(0, depois + 1), ...novas, ...atuais.slice(depois + 1)];
  const r = await gravarOrdem(supabase, eventId, sequencia);
  revalidar(eventId);
  return r;
}

export async function atualizarEntrada(
  eventId: string,
  id: string,
  dados: { papel: string; nome: string; par?: string | null; lado?: string | null; musica?: string | null; oQueLeva?: string | null }
): Promise<Retorno> {
  const supabase = createClient();
  const { data: atual } = await supabase
    .from("evento_cortejo_pessoa")
    .select("papel")
    .eq("id", id)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!atual) return { error: "Entrada não encontrada." };
  // papel novo precisa ser do cortejo; o que a linha já tem passa (legado)
  if (dados.papel !== atual.papel && !ehPapelDoCortejo(dados.papel)) return { error: "Escolha a entrada." };

  const base = {
    papel: dados.papel,
    o_que_leva: limpo(dados.oQueLeva),
    updated_at: new Date().toISOString(),
  };
  const gravar = (campos: Record<string, unknown>) =>
    supabase.from("evento_cortejo_pessoa").update(campos).eq("id", id).eq("event_id", eventId).select("id");
  let { data, error } = await gravar({
    ...base,
    nome: limpo(dados.nome) ?? "",
    par: limpo(dados.par),
    lado: ladoValido(dados.lado),
    musica: limpo(dados.musica, 160),
  });
  // sem a 192: o par vai no nome, como na entrada nova
  if (error && semA192(error)) {
    ({ data, error } = await gravar({
      ...base,
      nome: [limpo(dados.nome), limpo(dados.par)].filter(Boolean).join(" e "),
    }));
  }
  if (error) {
    console.error("[eorganizei:cortejo] atualizar entrada:", error.code, error.message);
    return { error: "Não foi possível salvar." };
  }
  if (!data || data.length === 0) return { error: "Você não tem permissão para editar este evento." };
  revalidar(eventId);
  return { ok: true };
}

/** A sequência inteira na ordem nova (a tela manda todos os ids). */
export async function reordenarCortejo(eventId: string, idsNaOrdem: string[]): Promise<Retorno> {
  if (idsNaOrdem.length > 400) return { error: "Lista longa demais." };
  const supabase = createClient();
  const atuais = await lerSequencia(supabase, eventId);
  const porId = new Map(atuais.map((l) => [l.id, l]));
  if (idsNaOrdem.length !== atuais.length || idsNaOrdem.some((id) => !porId.has(id))) {
    return { error: "O cortejo mudou enquanto você mexia — recarregue a página." };
  }
  const r = await gravarOrdem(
    supabase,
    eventId,
    idsNaOrdem.map((id) => porId.get(id) as Linha)
  );
  revalidar(eventId);
  return r;
}

/**
 * O cortejo tradicional, para não começar da página em branco: noivo e
 * noiva já com o nome do casal, o resto "a definir". Só num cortejo vazio.
 */
export async function montarCortejoTradicional(eventId: string): Promise<Retorno> {
  const supabase = createClient();
  const ev = await eventoDeCasamento(supabase, eventId);
  if (!ev) return { error: "Evento não encontrado." };
  const atuais = await lerSequencia(supabase, eventId);
  if (atuais.length > 0) return { error: "O cortejo já tem entradas." };

  const [noiva, noivo] = separarCasal(ev.cliente);
  const linhas = cortejoTradicional(noiva, noivo).map((e, i) => ({
    event_id: eventId,
    papel: e.papel,
    nome: e.nome,
    par: e.par || null,
    lado: e.lado,
    ordem: (i + 1) * 10,
    origem: "equipe" as const,
  }));
  const { data, error } = await inserir(supabase, linhas, "id");
  if (error) {
    console.error("[eorganizei:cortejo] tradicional:", error.code, error.message);
    return { error: "Não foi possível montar o cortejo." };
  }
  if (!data || data.length === 0) return { error: "Você não tem permissão para editar este evento." };
  revalidar(eventId);
  return { ok: true };
}
