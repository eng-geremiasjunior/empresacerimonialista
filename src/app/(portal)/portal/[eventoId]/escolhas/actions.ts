"use server";

// A resposta da cliente às opções curadas. Passa pela RPC da 092, que
// valida do lado do servidor: só rodada publicada, só opção daquela
// rodada, e recusar tudo exige motivo.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Retorno = { ok?: true; error?: string };

const ERROS: Record<string, string> = {
  inexistente: "Essa seleção não está mais disponível.",
  ja_respondida: "Vocês já responderam essa seleção.",
  opcao_invalida: "Escolha uma das opções apresentadas.",
  motivo_obrigatorio: "Conte o que não agradou — ajuda a buscar melhor.",
};

export async function escolherOpcao(
  eventoId: string,
  curadoriaId: string,
  opcaoId: string
): Promise<Retorno> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("responder_curadoria", {
    p_curadoria_id: curadoriaId,
    p_opcao_id: opcaoId,
  });

  const r = data as { ok?: boolean; erro?: string } | null;
  if (error || !r?.ok) {
    return { error: ERROS[r?.erro ?? ""] ?? "Não foi possível registrar agora." };
  }

  revalidatePath(`/portal/${eventoId}/escolhas`);
  revalidatePath(`/portal/${eventoId}`);
  return { ok: true };
}

export async function recusarTodas(
  eventoId: string,
  curadoriaId: string,
  motivo: string
): Promise<Retorno> {
  if (!motivo.trim()) return { error: ERROS.motivo_obrigatorio };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("responder_curadoria", {
    p_curadoria_id: curadoriaId,
    p_motivo: motivo.trim().slice(0, 600),
  });

  const r = data as { ok?: boolean; erro?: string } | null;
  if (error || !r?.ok) {
    return { error: ERROS[r?.erro ?? ""] ?? "Não foi possível registrar agora." };
  }

  revalidatePath(`/portal/${eventoId}/escolhas`);
  revalidatePath(`/portal/${eventoId}`);
  return { ok: true };
}
