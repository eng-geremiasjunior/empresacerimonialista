import "server-only";

// O que a tela Convidados lê além da lista e do salão (que já têm
// carregador em portal-pessoas e portal-salao). Tudo pela sessão da
// família: a RLS decide o que volta (a 089 abre à cliente os campos das
// decisões "ambos"; a 129 abre músicas e recados do convite).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { lerRsvp } from "@/lib/site-conteudo";

export type DatasDoConvite = {
  /** "Enviar o save the date" · Data de envio (método, 084) */
  saveTheDate: string | null;
  /** "Enviar os convites" · Data de envio (método, 084) */
  convites: string | null;
  /** "responder até" do convite: o mesmo que o site no ar mostra — o
   *  prazo do bloco rsvp da versão publicada e, sem ele, a coluna
   *  evento_site.rsvp_prazo (129), a regra do site_montado (191) */
  prazo: string | null;
};

const ISO = /^\d{4}-\d{2}-\d{2}/;

export const getDatasDoConvite = cache(async (eventId: string): Promise<DatasDoConvite> => {
  const supabase = createClient();
  const [campos, site] = await Promise.all([
    supabase
      .from("evento_campo_valor")
      .select("codigo, valor_data")
      .eq("event_id", eventId)
      .in("codigo", ["data_envio_std", "data_envio_convites"]),
    supabase.from("evento_site").select("rsvp_prazo, publicado_conteudo").eq("event_id", eventId).maybeSingle(),
  ]);
  const linhas = (campos.error ? [] : campos.data ?? []) as { codigo: string; valor_data: string | null }[];
  const data = (codigo: string) => {
    const v = linhas.find((l) => l.codigo === codigo && l.valor_data && ISO.test(l.valor_data))?.valor_data;
    return v ? v.slice(0, 10) : null;
  };
  const linha = site.error
    ? null
    : (site.data as { rsvp_prazo: string | null; publicado_conteudo: unknown } | null);
  const prazo = prazoDoBloco(linha?.publicado_conteudo) ?? linha?.rsvp_prazo ?? null;
  return {
    saveTheDate: data("data_envio_std"),
    convites: data("data_envio_convites"),
    prazo: prazo && ISO.test(prazo) ? prazo.slice(0, 10) : null,
  };
});

/** O prazo do primeiro bloco rsvp da fotografia publicada (como o
 *  site_montado escolhe o bloco). */
function prazoDoBloco(conteudo: unknown): string | null {
  const estrutura = (conteudo as { estrutura?: unknown } | null)?.estrutura;
  if (!Array.isArray(estrutura)) return null;
  const bloco = estrutura.find(
    (b): b is { conteudo?: unknown } =>
      !!b && typeof b === "object" && (b as { tipo?: unknown }).tipo === "rsvp",
  );
  return bloco ? lerRsvp(bloco.conteudo).prazo : null;
}

export type PedidosDeMusica = {
  /** título e quantas vezes foi pedido, dos mais pedidos para os menos */
  pedidos: { titulo: string; n: number }[];
  /** quantas ainda esperam o casal (estado "sugerida") */
  sugeridas: number;
  /** quantas já estão na folha do DJ (estado "aprovada") */
  aprovadas: number;
};

/** Os pedidos de música dos convidados (evento_musica), sem os vetados. */
export const getPedidosDeMusica = cache(async (eventId: string): Promise<PedidosDeMusica> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_musica")
    .select("titulo, estado")
    .eq("event_id", eventId)
    .in("estado", ["sugerida", "aprovada"])
    .order("created_at", { ascending: false })
    .limit(300);
  const linhas = (error ? [] : data ?? []) as { titulo: string; estado: string }[];
  const porTitulo = new Map<string, { titulo: string; n: number; ordem: number }>();
  linhas.forEach((l, i) => {
    const titulo = (l.titulo ?? "").trim();
    if (!titulo) return;
    const k = titulo.toLowerCase();
    const atual = porTitulo.get(k);
    if (atual) atual.n += 1;
    else porTitulo.set(k, { titulo, n: 1, ordem: i });
  });
  const pedidos = [...porTitulo.values()]
    .sort((a, b) => b.n - a.n || a.ordem - b.ordem)
    .map(({ titulo, n }) => ({ titulo, n }));
  return {
    pedidos,
    sugeridas: linhas.filter((l) => l.estado === "sugerida").length,
    aprovadas: linhas.filter((l) => l.estado === "aprovada").length,
  };
});

/**
 * Os recados do mural que vieram de um convidado da lista (evento_recado
 * com convidado_id), o mais novo por convidado. Completa o recado da
 * resposta quando ela veio sem.
 */
export const getRecadosDoMural = cache(async (eventId: string): Promise<Record<string, string>> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_recado")
    .select("convidado_id, texto")
    .eq("event_id", eventId)
    .eq("oculto", false)
    .not("convidado_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(300);
  const porConvidado: Record<string, string> = {};
  for (const r of (error ? [] : data ?? []) as { convidado_id: string | null; texto: string | null }[]) {
    const texto = (r.texto ?? "").trim();
    if (r.convidado_id && texto && !(r.convidado_id in porConvidado)) porConvidado[r.convidado_id] = texto;
  }
  return porConvidado;
});
