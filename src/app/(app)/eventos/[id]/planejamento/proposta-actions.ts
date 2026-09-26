"use server";

// As propostas da família (177) — o lado da cerimonialista. Ela lê
// dentro da decisão e responde: aceita ou explica por que não. A RLS da
// 177 deixa só a equipe do evento responder, e o gatilho não deixa mudar
// o que a família escreveu.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PropostaParaEquipe = {
  id: string;
  titulo: string;
  texto: string | null;
  link: string | null;
  fornecedor: string | null;
  fotoUrl: string | null;
  autor: string | null;
  estado: "aguardando" | "aceita" | "recusada";
  resposta: string | null;
  criadaEm: string;
};

export async function carregarPropostas(decisaoId: string): Promise<PropostaParaEquipe[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decisao_proposta")
    .select("id, titulo, texto, link, fornecedor_nome, foto_path, autor_nome, estado, resposta, created_at")
    .eq("evento_decisao_id", decisaoId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  const linhas = data as {
    id: string;
    titulo: string;
    texto: string | null;
    link: string | null;
    fornecedor_nome: string | null;
    foto_path: string | null;
    autor_nome: string | null;
    estado: PropostaParaEquipe["estado"];
    resposta: string | null;
    created_at: string;
  }[];
  const caminhos = linhas.map((l) => l.foto_path).filter((x): x is string => !!x);
  const urls = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("inspiracoes").createSignedUrls(caminhos, 60 * 60);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
  }
  return linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    texto: l.texto,
    link: l.link,
    fornecedor: l.fornecedor_nome,
    fotoUrl: l.foto_path ? urls.get(l.foto_path) ?? null : null,
    autor: l.autor_nome,
    estado: l.estado,
    resposta: l.resposta,
    criadaEm: l.created_at,
  }));
}

export async function responderProposta(
  eventId: string,
  propostaId: string,
  estado: "aceita" | "recusada",
  resposta: string
): Promise<{ ok: true } | { error: string }> {
  const texto = resposta.trim().slice(0, 600);
  if (estado === "recusada" && !texto) return { error: "Conte para a família o porquê." };
  const supabase = createClient();
  const { error } = await supabase
    .from("decisao_proposta")
    .update({ estado, resposta: texto || null })
    .eq("id", propostaId)
    .eq("event_id", eventId);
  if (error) return { error: "Não foi possível responder agora." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  revalidatePath(`/portal/${eventId}/escolhas`, "layout");
  return { ok: true };
}
