"use server";

// O cortejo do casamento pelo lado da equipe (192): uma sequência só, com
// par, lado e música (e a observação da equipe, 193). A ordem é do evento
// inteiro (10, 20, 30…), e toda gravação reescreve a sequência — o que
// também conserta a numeração antiga, que era por grupo.
//
// Sem as migrações aplicadas, as gravações não travam: sem a 193 a
// observação espera; sem a 192 o par vai junto no nome ("Ana e Pedro").

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ORDENS_DA_CERIMONIA,
  cortejoTradicional,
  ehPapelDoCortejo,
  emSequencia,
  normalizarEntradasLidas,
  posicaoDoPapel,
  type RitoDaCerimonia,
} from "@/lib/cortejo-casamento";
import { separarCasal } from "@/components/wizard/nomesDoCasal";

type Retorno = { ok?: true; error?: string };
type Supa = ReturnType<typeof createClient>;
type Linha = { id: string; papel: string; nome: string; ordem: number };
type ErroDb = { code?: string; message?: string } | null;

const limpo = (v: string | null | undefined, max = 120) => (v && v.trim() ? v.trim().slice(0, max) : null);
const ladoValido = (l: string | null | undefined) => (l === "noivo" || l === "noiva" ? l : null);

/** Coluna nova ausente (a 192 ou a 193 ainda não aplicada)? */
const colunaAusente = (e: ErroDb) => Boolean(e && (e.code === "PGRST204" || e.code === "42703"));
const soFaltaA193 = (e: ErroDb) => colunaAusente(e) && /observacao/.test(e?.message ?? "");

/** Os campos de uma linha conforme as migrações que existem. */
function semObservacao(l: Record<string, unknown>) {
  const { observacao, ...resto } = l;
  void observacao;
  return resto;
}
function semA192(l: Record<string, unknown>) {
  const { par, lado, musica, observacao, ...resto } = l;
  void lado;
  void musica;
  void observacao;
  if (!("nome" in resto)) return resto;
  return { ...resto, nome: [String(resto.nome ?? ""), String(par ?? "")].filter((x) => x.trim()).join(" e ") };
}

async function inserir(supabase: Supa, linhas: Record<string, unknown>[], colunas: string) {
  const tabela = () => supabase.from("evento_cortejo_pessoa");
  const r1 = await tabela().insert(linhas).select(colunas);
  if (!r1.error || !colunaAusente(r1.error)) return r1;
  if (soFaltaA193(r1.error)) {
    const r2 = await tabela().insert(linhas.map(semObservacao)).select(colunas);
    if (!r2.error || !colunaAusente(r2.error)) return r2;
  }
  return tabela().insert(linhas.map(semA192)).select(colunas);
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
    observacao?: string | null;
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
    observacao: limpo(dados.observacao, 300),
    ordem: (depois + 2 + i) * 10,
    origem: "equipe",
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
  dados: {
    papel: string;
    nome: string;
    par?: string | null;
    lado?: string | null;
    musica?: string | null;
    oQueLeva?: string | null;
    observacao?: string | null;
  }
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

  const campos: Record<string, unknown> = {
    papel: dados.papel,
    nome: limpo(dados.nome) ?? "",
    par: limpo(dados.par),
    lado: ladoValido(dados.lado),
    musica: limpo(dados.musica, 160),
    o_que_leva: limpo(dados.oQueLeva),
    observacao: limpo(dados.observacao, 300),
    updated_at: new Date().toISOString(),
  };
  const gravar = (c: Record<string, unknown>) =>
    supabase.from("evento_cortejo_pessoa").update(c).eq("id", id).eq("event_id", eventId).select("id");
  let { data, error } = await gravar(campos);
  if (error && soFaltaA193(error)) ({ data, error } = await gravar(semObservacao(campos)));
  if (error && colunaAusente(error)) ({ data, error } = await gravar(semA192(campos)));
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
    origem: "equipe",
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

/** "7. LOUVOR: (opcional)" → "louvor": para não repetir o que ela já escreveu. */
const chaveDoMomento = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * A ordem da cerimônia depois das entradas: os momentos do rito escolhido
 * (evangélica, católica, civil) entram no fim. O que ela já escreveu no
 * cortejo ("7. LOUVOR", "ASSINATURA") não se repete.
 */
export async function montarOrdemDaCerimonia(eventId: string, rito: RitoDaCerimonia): Promise<Retorno> {
  const ordem = ORDENS_DA_CERIMONIA[rito];
  if (!ordem) return { error: "Escolha a cerimônia." };
  const supabase = createClient();
  const atuais = await lerSequencia(supabase, eventId);
  // "Votos dos noivos" já é "Votos": um começa com o outro
  const ja = atuais.map((l) => chaveDoMomento(l.nome)).filter(Boolean);
  const faltam = ordem.momentos.filter((m) => {
    const k = chaveDoMomento(m);
    return !ja.some((j) => j.startsWith(k) || k.startsWith(j));
  });
  if (faltam.length === 0) return { ok: true };
  return adicionarEntradas(eventId, {
    papel: "momento",
    entradas: faltam.map((nome) => ({ nome, par: null })),
  });
}

/**
 * Lança o cortejo lido do arquivo (a leitura da IA, já conferida por ela).
 * "acrescentar" põe tudo no fim, na ordem lida; "substituir" troca o
 * cortejo inteiro pelo lido. A lista passa de novo pela allowlist: o que
 * vem da tela não é confiável.
 */
export async function lancarCortejoLido(
  eventId: string,
  cru: unknown,
  modo: "acrescentar" | "substituir"
): Promise<Retorno> {
  const entradas = normalizarEntradasLidas(cru);
  if (entradas.length === 0) return { error: "Nenhuma entrada para lançar." };

  const supabase = createClient();
  if (!(await eventoDeCasamento(supabase, eventId))) return { error: "Evento não encontrado." };
  const atuais = await lerSequencia(supabase, eventId);

  if (modo === "substituir" && atuais.length) {
    const { error } = await supabase
      .from("evento_cortejo_pessoa")
      .delete()
      .eq("event_id", eventId)
      .in(
        "id",
        atuais.map((l) => l.id)
      );
    if (error) {
      console.error("[eorganizei:cortejo] substituir:", error.code, error.message);
      return { error: "Não foi possível trocar o cortejo." };
    }
  }

  const inicio = modo === "substituir" ? 0 : atuais.length;
  const linhas = entradas.map((e, i) => ({
    event_id: eventId,
    papel: e.papel,
    nome: e.nome,
    par: e.par,
    lado: e.lado,
    musica: e.musica,
    observacao: e.observacao,
    ordem: (inicio + i + 1) * 10,
    origem: "equipe",
  }));
  const { data, error } = await inserir(supabase, linhas, "id");
  if (error) {
    console.error("[eorganizei:cortejo] lançar leitura:", error.code, error.message);
    return { error: "Não foi possível lançar o cortejo." };
  }
  if (!data || data.length === 0) return { error: "Você não tem permissão para editar este evento." };
  // no "acrescentar", a sequência antiga pode ter ordem fora do padrão
  if (modo === "acrescentar" && atuais.length) {
    await gravarOrdem(supabase, eventId, atuais);
  }
  revalidar(eventId);
  return { ok: true };
}
