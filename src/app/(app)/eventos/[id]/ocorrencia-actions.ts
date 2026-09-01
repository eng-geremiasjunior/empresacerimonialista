"use server";

// Ocorrências do evento (139): avaria, perda, pertence esquecido.
//
// Nascem ESCONDIDAS do casal (visivel_ao_casal = false) — quem decide o
// que o casal vê é ela, item a item, na revisão da prestação de contas.
// O portal nunca lê esta tabela: só a fotografia entregue.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const TIPOS_OCORRENCIA = ["avaria", "perda", "pertence", "outro"] as const;
export type TipoOcorrencia = (typeof TIPOS_OCORRENCIA)[number];

export type ResultadoOcorrencia = { error: string } | { success: true };

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/financeiro`);
  revalidatePath(`/eventos/${eventId}/roteiro`);
}

export async function criarOcorrencia(
  eventId: string,
  dados: {
    tipo: string;
    descricao: string;
    valor: number | null;
    supplierId: string | null;
  }
): Promise<ResultadoOcorrencia> {
  if (!(TIPOS_OCORRENCIA as readonly string[]).includes(dados.tipo)) {
    return { error: "Tipo inválido." };
  }
  const descricao = dados.descricao.trim().slice(0, 500);
  if (!descricao) return { error: "Descreva o que aconteceu." };
  if (dados.valor !== null && (!Number.isFinite(dados.valor) || dados.valor < 0)) {
    return { error: "O valor não pode ser negativo." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_ocorrencia")
    .insert({
      event_id: eventId,
      tipo: dados.tipo,
      descricao,
      valor: dados.valor,
      supplier_id: dados.supplierId,
    })
    .select("id");
  if (error || !data?.length) {
    console.error("[vela:ocorrencia] criar:", error?.message);
    return { error: "Não foi possível registrar a ocorrência." };
  }
  revalidar(eventId);
  return { success: true };
}

export async function atualizarOcorrencia(
  eventId: string,
  ocorrenciaId: string,
  patch: {
    resolvida?: boolean;
    visivelAoCasal?: boolean;
    descricao?: string;
    valor?: number | null;
  }
): Promise<ResultadoOcorrencia> {
  const mudancas: Record<string, unknown> = {};
  if (patch.resolvida !== undefined) mudancas.resolvida = patch.resolvida;
  if (patch.visivelAoCasal !== undefined)
    mudancas.visivel_ao_casal = patch.visivelAoCasal;
  if (patch.descricao !== undefined) {
    const d = patch.descricao.trim().slice(0, 500);
    if (!d) return { error: "Descreva o que aconteceu." };
    mudancas.descricao = d;
  }
  if (patch.valor !== undefined) {
    if (patch.valor !== null && (!Number.isFinite(patch.valor) || patch.valor < 0)) {
      return { error: "O valor não pode ser negativo." };
    }
    mudancas.valor = patch.valor;
  }
  if (Object.keys(mudancas).length === 0) return { success: true };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_ocorrencia")
    .update(mudancas)
    .eq("id", ocorrenciaId)
    .eq("event_id", eventId)
    .select("id");
  if (error || !data?.length) {
    console.error("[vela:ocorrencia] atualizar:", error?.message);
    return { error: "Não foi possível salvar." };
  }
  revalidar(eventId);
  return { success: true };
}

export async function excluirOcorrencia(
  eventId: string,
  ocorrenciaId: string
): Promise<ResultadoOcorrencia> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_ocorrencia")
    .delete()
    .eq("id", ocorrenciaId)
    .eq("event_id", eventId);
  if (error) {
    console.error("[vela:ocorrencia] excluir:", error.message);
    return { error: "Não foi possível excluir." };
  }
  revalidar(eventId);
  return { success: true };
}
