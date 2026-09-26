"use server";

// A proposta da família (177) e o desfazer da escolha. A RLS e os
// gatilhos da 177 são a trava real: a decisão é deste evento, o autor é
// quem está logado, e a família só cria proposta aguardando.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Retorno = { ok: true } | { error: string };

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/escolhas`, "layout");
  revalidatePath(`/portal/${eventoId}`);
}

export async function proporOpcao(
  eventoId: string,
  decisaoId: string,
  f: { titulo: string; texto: string; link: string; fornecedor: string; fotoPath: string | null }
): Promise<Retorno> {
  const texto = f.texto.trim().slice(0, 600);
  const titulo = (f.titulo.trim() || texto.split(/[.\n]/)[0] || "Proposta de vocês").slice(0, 80);
  let link = f.link.trim();
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link && (link.length > 300 || /\s/.test(link))) return { error: "Confira o link." };
  if (!texto && !link && !f.fotoPath) return { error: "Mande uma foto, um link ou conte o que vocês imaginam." };
  if (f.fotoPath && !f.fotoPath.startsWith(`${eventoId}/`)) return { error: "Foto inválida." };

  const supabase = createClient();
  const { error } = await supabase.from("decisao_proposta").insert({
    evento_decisao_id: decisaoId,
    event_id: eventoId,
    titulo,
    texto: texto || null,
    link: link || null,
    fornecedor_nome: f.fornecedor.trim().slice(0, 80) || null,
    foto_path: f.fotoPath,
  });
  if (error) return { error: "Não foi possível enviar agora. Tente de novo." };
  revalidar(eventoId);
  return { ok: true };
}

export async function tirarProposta(eventoId: string, propostaId: string): Promise<Retorno> {
  const supabase = createClient();
  const { error } = await supabase.from("decisao_proposta").delete().eq("id", propostaId).eq("event_id", eventoId);
  if (error) return { error: "Não foi possível tirar agora." };
  revalidar(eventoId);
  return { ok: true };
}

export async function desfazerEscolha(eventoId: string, curadoriaId: string): Promise<Retorno> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_desfazer_escolha", { p_curadoria_id: curadoriaId });
  const r = data as { ok?: boolean; erro?: string } | null;
  if (error || !r?.ok) {
    return { error: r?.erro === "ja_decidida" ? "A decisão já fechou." : "Não foi possível desfazer agora." };
  }
  revalidar(eventoId);
  return { ok: true };
}
