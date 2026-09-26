"use server";

// A paleta da família (181): grava no guia de estilo pela função do
// portal, e a primeira cor vira a cor da festa do portal (176).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { corDoHex } from "@/lib/cor-da-festa";
import { salvarEstilo } from "../estilo-actions";

const ERROS: Record<string, string> = {
  sem_acesso: "Não foi possível salvar.",
  quantas: "A paleta tem de 1 a 5 cores.",
  cor: "Confira o nome e a cor de cada uma.",
};

export async function salvarPaleta(
  eventoId: string,
  cores: { nome: string; hex: string }[],
  sensacao: string | null
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_paleta_salvar", {
    p_event_id: eventoId,
    p_cores: cores.map((c) => ({ nome: c.nome.trim(), hex: c.hex.toLowerCase() })),
    p_sensacao: sensacao,
  });
  const r = data as { ok: boolean; erro?: string } | null;
  if (error || !r?.ok) return { error: ERROS[r?.erro ?? ""] ?? "Não foi possível salvar agora." };

  // a primeira cor da paleta vira a cor da festa (o destaque do portal)
  const cor = corDoHex(cores[0].hex, cores[0].nome);
  if (cor) await salvarEstilo(eventoId, { cor });

  revalidatePath(`/portal/${eventoId}`, "layout");
  return { ok: true };
}
