"use server";

// A parte do casal no site: o texto, as cores, os presentes e a
// moderação do que os convidados mandam.
//
// O conteúdo do convite vai por RPC (128 e 130) porque o portal NÃO
// escreve em evento_site: a mesma linha carrega o `publicado` e o
// `slug`, que são da cerimonialista. A função lista as colunas do casal
// uma a uma. Já a moderação (esconder foto, esconder recado, aprovar
// música) vai direto na tabela — aquelas nasceram com policy da cliente
// na 129, porque são dela por natureza.
//
// Nada disso fica público na hora: a cerimonialista publica quando
// estiver pronto — só as fotos, as músicas e os recados são ao vivo,
// porque acontecem durante a festa.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoSite = { ok?: boolean; error?: string };

function volta(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/site`);
}

function erroDeEscrita(error: { code?: string; message?: string } | null): string {
  if (error?.code === "PGRST202") {
    return "O site do casamento ainda não está disponível.";
  }
  if (error?.code === "P0001" && error.message) return error.message;
  return "Não foi possível salvar agora.";
}

export async function salvarSiteCasal(
  eventoId: string,
  dados: { mensagem: string; historia: string; dressCode: string }
): Promise<ResultadoSite> {
  const supabase = createClient();
  const { error } = await supabase.rpc("portal_salvar_site", {
    p_event_id: eventoId,
    p_mensagem: dados.mensagem,
    p_historia: dados.historia,
    p_dress_code: dados.dressCode,
  });

  if (error) {
    console.error("[vela:portal] site:", error.code, error.message);
    if (error.code === "P0001" && error.message.includes("longo")) {
      return { error: "Algum texto passou do tamanho — encurte um pouco." };
    }
    return { error: erroDeEscrita(error) };
  }
  volta(eventoId);
  return { ok: true };
}

/**
 * O resto do convite que é do casal: os títulos, as cores e os
 * presentes. A função da 130 valida a cor e o link antes de gravar —
 * os dois viram atributo na página pública.
 */
export async function salvarConviteCasal(
  eventoId: string,
  dados: {
    historiaTitulo: string;
    dressCodeTitulo: string;
    corAcento: string;
    corTinta: string;
    corFundo: string;
    presentesTexto: string;
    pixChave: string;
    pixTitular: string;
    presentesLink: string;
  }
): Promise<ResultadoSite> {
  const hex = (v: string) => {
    const s = v.trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s : null;
  };
  const link = dados.presentesLink.trim();
  if (link && !/^https?:\/\//i.test(link)) {
    return { error: "O link da lista precisa começar com https://" };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("portal_ajustar_convite", {
    p_event_id: eventoId,
    p_historia_titulo: dados.historiaTitulo,
    p_dress_code_titulo: dados.dressCodeTitulo,
    p_cor_acento: hex(dados.corAcento),
    p_cor_tinta: hex(dados.corTinta),
    p_cor_fundo: hex(dados.corFundo),
    p_presentes_texto: dados.presentesTexto,
    p_pix_chave: dados.pixChave,
    p_pix_titular: dados.pixTitular,
    p_presentes_link: link || null,
    p_foto_casal_path: null,
  });

  if (error) {
    console.error("[vela:portal] convite:", error.code, error.message);
    return { error: erroDeEscrita(error) };
  }
  volta(eventoId);
  return { ok: true };
}

/** A foto do casal na seção "Nossa história" (bucket das inspirações). */
export async function definirFotoDoCasal(
  eventoId: string,
  caminho: string | null
): Promise<ResultadoSite> {
  const supabase = createClient();
  const { error } = await supabase.rpc("portal_ajustar_convite", {
    p_event_id: eventoId,
    p_historia_titulo: null, p_dress_code_titulo: null,
    p_cor_acento: null, p_cor_tinta: null, p_cor_fundo: null,
    p_presentes_texto: null, p_pix_chave: null, p_pix_titular: null,
    p_presentes_link: null,
    p_foto_casal_path: caminho ?? "",
  });
  if (error) return { error: erroDeEscrita(error) };
  volta(eventoId);
  return { ok: true };
}

// ------------------------------------------------------------------
// Moderação: o que os convidados mandam durante a festa
// ------------------------------------------------------------------

/** Esconde (ou traz de volta) uma foto do álbum. */
export async function ocultarFoto(
  eventoId: string,
  fotoId: string,
  oculta: boolean
): Promise<ResultadoSite> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_album_foto")
    .update({ oculta, oculta_em: oculta ? new Date().toISOString() : null })
    .eq("id", fotoId)
    .eq("event_id", eventoId)
    .select("id");
  if (error) return { error: "Não foi possível esconder a foto." };
  if (!data || data.length === 0) return { error: "Você não pode mexer neste álbum." };
  volta(eventoId);
  return { ok: true };
}

/** Esconde (ou traz de volta) um recado do mural. */
export async function ocultarRecado(
  eventoId: string,
  recadoId: string,
  oculto: boolean
): Promise<ResultadoSite> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_recado")
    .update({ oculto })
    .eq("id", recadoId)
    .eq("event_id", eventoId)
    .select("id");
  if (error) return { error: "Não foi possível esconder o recado." };
  if (!data || data.length === 0) return { error: "Você não pode mexer neste mural." };
  volta(eventoId);
  return { ok: true };
}

/** A música vai para o DJ (aprovada), some da lista (vetada) ou volta. */
export async function decidirMusica(
  eventoId: string,
  musicaId: string,
  estado: "sugerida" | "aprovada" | "vetada"
): Promise<ResultadoSite> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_musica")
    .update({ estado })
    .eq("id", musicaId)
    .eq("event_id", eventoId)
    .select("id");
  if (error) return { error: "Não foi possível salvar." };
  if (!data || data.length === 0) return { error: "Você não pode mexer nesta lista." };
  volta(eventoId);
  return { ok: true };
}

/** Liga e desliga os três blocos do convite. */
export async function definirBlocos(
  eventoId: string,
  blocos: { album?: boolean; playlist?: boolean; recados?: boolean }
): Promise<ResultadoSite> {
  const supabase = createClient();
  const { error } = await supabase.rpc("portal_definir_blocos", {
    p_event_id: eventoId,
    p_album: blocos.album ?? null,
    p_playlist: blocos.playlist ?? null,
    p_recados: blocos.recados ?? null,
  });
  if (error) {
    console.error("[vela:portal] blocos:", error.code, error.message);
    return { error: erroDeEscrita(error) };
  }
  volta(eventoId);
  return { ok: true };
}
