import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { lerEstrutura, type TemaDoSite } from "@/lib/site-blocos";
import { fotosDaEstrutura } from "@/lib/site-conteudo";
import { modeloDesenha, modeloDoTema } from "@/lib/site-modelos";

// As fotos do convite moram em buckets PRIVADOS (o álbum e as
// inspirações). Quem abre o convite não tem sessão — então o servidor
// assina as URLs, e só os caminhos que a RPC já autorizou. Mesmo padrão
// do guia do fornecedor: service role aqui dentro, nunca no navegador.

const HORA = 60 * 60;

function servico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (i: RequestInfo | URL, x?: RequestInit) =>
          fetch(i, { ...x, cache: "no-store" }),
      },
    }
  );
}

export async function assinarMidiaDoConvite(dados: SitePublico): Promise<{
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
}> {
  const admin = servico();

  const caminhos = (dados.album ?? []).map((f) => f.path).filter(Boolean);
  let fotosAlbum: { url: string; autor: string | null }[] = [];
  if (caminhos.length > 0) {
    const { data } = await admin.storage
      .from("album")
      .createSignedUrls(caminhos, HORA);
    const porCaminho = new Map(
      (data ?? []).map((d) => [d.path ?? "", d.signedUrl])
    );
    fotosAlbum = (dados.album ?? [])
      .map((f) => ({ url: porCaminho.get(f.path) ?? "", autor: f.autor }))
      .filter((f) => f.url);
  }

  // a foto do casal vive no bucket das inspirações (é a curadoria dela)
  let fotoCasalUrl: string | null = null;
  const caminhoCasal = dados.site?.foto_casal_path;
  if (caminhoCasal) {
    const { data } = await admin.storage
      .from("inspiracoes")
      .createSignedUrl(caminhoCasal, HORA);
    fotoCasalUrl = data?.signedUrl ?? null;
  }

  return { fotosAlbum, fotoCasalUrl };
}

/**
 * As URLs de um punhado de caminhos do álbum — para as telas internas
 * (a moderação do casal e a folha da equipe), que também não podem ler
 * bucket privado direto do navegador.
 */
export async function assinarFotosDoAlbum(
  caminhos: string[]
): Promise<Map<string, string>> {
  const limpos = [...new Set(caminhos.filter(Boolean))];
  if (limpos.length === 0) return new Map();
  const { data } = await servico().storage
    .from("album")
    .createSignedUrls(limpos, HORA);
  const mapa = new Map<string, string>();
  for (const d of data ?? []) {
    if (d.path && d.signedUrl) mapa.set(d.path, d.signedUrl);
  }
  return mapa;
}

// ------------------------------------------------------------------
// O balde 'site' (migração 191): as fotos dos 6 modelos
// ------------------------------------------------------------------
// Privado e sem policy para quem entra: sobe por URL de envio assinada
// que o servidor emite (depois de conferir o nível) e é lido por URL
// assinada. Este é o ÚNICO arquivo que toca o storage do site.

const BALDE_SITE = "site";
/** 6 h: com 1 h o lazy-load quebra em quem deixa a aba aberta */
const SEIS_HORAS = 6 * HORA;
/** teto de objetos por evento no balde (a estrutura usa até 60) */
export const TETO_DE_FOTOS_DO_SITE = 300;

/** {evento}/{uuid}.jpg|webp — a mesma forma que a site_foto_ok aceita */
const CAMINHO_DO_SITE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|webp)$/;

export function caminhoDoSiteValido(caminho: unknown, eventoId?: string): caminho is string {
  if (typeof caminho !== "string" || !CAMINHO_DO_SITE.test(caminho)) return false;
  return eventoId ? caminho.startsWith(`${eventoId}/`) : true;
}

/** Um createSignedUrls só para todos os caminhos. Erro = {} (a página
 *  desenha os espaços vazios), sem logar caminho nem nada do casal. */
export async function assinarCaminhosDoSite(caminhos: string[]): Promise<Record<string, string>> {
  const limpos = Array.from(new Set(caminhos.filter((c) => caminhoDoSiteValido(c))));
  if (limpos.length === 0) return {};
  try {
    const { data, error } = await servico().storage.from(BALDE_SITE).createSignedUrls(limpos, SEIS_HORAS);
    if (error || !data) {
      console.error("[eorganizei:site] assinar fotos: falhou");
      return {};
    }
    const mapa: Record<string, string> = {};
    for (const d of data) {
      if (d.path && d.signedUrl && !d.error) mapa[d.path] = d.signedUrl;
    }
    return mapa;
  } catch {
    console.error("[eorganizei:site] assinar fotos: falhou");
    return {};
  }
}

/**
 * As URLs de todas as fotos da estrutura do site (capa, marcos, cenas,
 * local, traje, galeria, padrinhos, presentes) — caminho → URL assinada,
 * para MidiaDoSite.urls. Aceita a página montada (SitePublico) ou só a
 * estrutura e o tema (o rascunho do editor).
 *
 * soVisiveis (a página do convidado): só os blocos que aparecem — nem o
 * escondido nem o que o modelo não desenha, e nada no Convite, que não
 * desenha estas fotos. A URL vai no HTML: o que o casal tirou da tela não
 * pode estar lá. A revisão do dono e o portal assinam tudo.
 */
export async function assinarMidiaDoSite(
  dados: SitePublico | { estrutura: unknown; tema?: TemaDoSite | null },
  opcoes?: { soVisiveis?: boolean }
): Promise<Record<string, string>> {
  const bruta = "estrutura" in dados ? dados.estrutura : dados.site?.estrutura;
  let blocos = lerEstrutura(bruta);
  if (opcoes?.soVisiveis) {
    const tema = "estrutura" in dados ? dados.tema : dados.site?.tema;
    const modelo = modeloDoTema(tema ?? null);
    if (modelo === "convite") return {};
    blocos = blocos.filter((b) => b.visivel !== false && modeloDesenha(modelo, b.tipo));
  }
  return assinarCaminhosDoSite(fotosDaEstrutura(blocos));
}

/** Quantas fotos o evento já tem no balde (até o teto + 1). Erro = null. */
export async function contarFotosDoSite(eventoId: string): Promise<number | null> {
  try {
    const { data, error } = await servico()
      .storage.from(BALDE_SITE)
      .list(eventoId, { limit: TETO_DE_FOTOS_DO_SITE + 1 });
    if (error) return null;
    return (data ?? []).filter((o) => o.name && o.name !== ".emptyFolderPlaceholder").length;
  } catch {
    return null;
  }
}

/** A URL de envio assinada para um caminho NOVO ({evento}/{uuid}.jpg).
 *  Quem chama já conferiu o nível e o teto. Sem upsert: o caminho é
 *  imutável, o que o dono aprovou não é regravado. */
export async function emitirEnvioDeFotoDoSite(
  eventoId: string
): Promise<{ caminho: string; token: string; url: string } | null> {
  const caminho = `${eventoId}/${crypto.randomUUID()}.jpg`;
  if (!caminhoDoSiteValido(caminho, eventoId)) return null;
  try {
    const { data, error } = await servico().storage.from(BALDE_SITE).createSignedUploadUrl(caminho);
    if (error || !data) return null;
    return { caminho: data.path || caminho, token: data.token, url: data.signedUrl };
  } catch {
    return null;
  }
}
