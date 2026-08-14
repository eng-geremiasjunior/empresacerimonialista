"use server";

// O que a CLIENTE pode fazer no guia: aprovar, pedir ajuste, e cuidar
// das referências dela (as imagens que explicam o que ela quer quando a
// palavra não dá conta).
//
// Ela nunca escreve nas seções montadas pela cerimonialista — paleta,
// flores, materiais, trajes e papelaria são leitura para ela. Aprovar e
// pedir ajuste passam por RPC, com guarda no banco.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoGuia = { error: string } | { success: true };

const ERROS: Record<string, string> = {
  inexistente: "Não foi possível encontrar o guia.",
  nao_esta_para_aprovar: "Este guia ainda não está pronto para aprovação.",
  mensagem_vazia: "Escreva o que vocês gostariam de mudar.",
};

export async function aprovarGuia(
  eventoId: string,
  guiaId: string
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("aprovar_guia_estilo", {
    p_guia_id: guiaId,
  });

  const r = data as { ok: boolean; erro?: string } | null;
  if (error || !r?.ok) {
    return { error: ERROS[r?.erro ?? ""] ?? "Não foi possível aprovar." };
  }
  revalidatePath(`/portal/${eventoId}/guia-estilo`);
  return { success: true };
}

export async function pedirAjusteNoGuia(
  eventoId: string,
  guiaId: string,
  mensagem: string
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("pedir_ajuste_guia", {
    p_guia_id: guiaId,
    p_mensagem: mensagem,
  });

  const r = data as { ok: boolean; erro?: string } | null;
  if (error || !r?.ok) {
    return { error: ERROS[r?.erro ?? ""] ?? "Não foi possível enviar." };
  }
  revalidatePath(`/portal/${eventoId}/guia-estilo`);
  return { success: true };
}

// ------------------------------------------------------------------
// Referências — as imagens da cliente, que agora vivem dentro do guia.
// O arquivo sobe direto do navegador para o bucket (a policy da 092
// guarda quem pode escrever na pasta do evento); aqui só registramos a
// linha e cuidamos da remoção, que precisa tirar as duas coisas.
// ------------------------------------------------------------------

export async function registrarReferencia(
  eventoId: string,
  storagePath: string,
  assunto: string,
  agradou: string,
  autor: string
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("evento_inspiracao").insert({
    event_id: eventoId,
    storage_path: storagePath,
    assunto: assunto || "geral",
    // "o que agradou" mora em legenda desde a 092; a 096 só somou o autor
    legenda: agradou.trim() ? agradou.trim().slice(0, 300) : null,
    autor: autor.trim() ? autor.trim().slice(0, 80) : null,
    criado_por: user?.id ?? null,
  });

  if (error) return { error: "Não foi possível guardar a imagem." };
  revalidatePath(`/portal/${eventoId}/guia-estilo`);
  return { success: true };
}

export async function removerReferencia(
  eventoId: string,
  id: string,
  storagePath: string
): Promise<ResultadoGuia> {
  const supabase = createClient();

  const { error } = await supabase
    .from("evento_inspiracao")
    .delete()
    .eq("id", id)
    .eq("event_id", eventoId);
  if (error) return { error: "Não foi possível remover." };

  // o arquivo depois da linha: se falhar, sobra um órfão no bucket em
  // vez de uma imagem que a tela mostra e não consegue abrir
  await supabase.storage.from("inspiracoes").remove([storagePath]);

  revalidatePath(`/portal/${eventoId}/guia-estilo`);
  return { success: true };
}
