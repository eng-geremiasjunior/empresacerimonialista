"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Salvar o convite animado (196). O banco decide tudo — quem pode (só o
// casal), as chaves, os tamanhos e os formatos; aqui só a forma do envio e
// a mensagem de erro em português.

export type ResultadoDoConvite = { ok: true } | { erro: string };

const CHAVES = new Set([
  "modelo",
  "fonte",
  "paleta",
  "modo_nome",
  "forma",
  "hora",
  "frase",
  "referencia",
  "local",
  "endereco",
  "cidade",
  "local_recepcao",
  "endereco_recepcao",
  "pais1",
  "pais2",
  "foto",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function salvarConvite(
  eventoId: string,
  dados: Record<string, string | null>
): Promise<ResultadoDoConvite> {
  if (typeof eventoId !== "string" || !UUID.test(eventoId)) return { erro: "Convite inválido." };
  if (!dados || typeof dados !== "object") return { erro: "Convite inválido." };
  const limpo: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(dados)) {
    if (!CHAVES.has(k)) return { erro: "Convite inválido." };
    if (v !== null && typeof v !== "string") return { erro: "Convite inválido." };
    limpo[k] = v === null ? null : v.slice(0, 400);
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("portal_salvar_convite", { p_event_id: eventoId, p_dados: limpo });
  if (error) {
    const m = error.message ?? "";
    if (/sem permissão/.test(m)) return { erro: "Só o casal pode mudar o convite." };
    if (/foto de outro evento/.test(m)) return { erro: "Escolha uma foto do site de vocês." };
    if (/evento_convite_valores_check|campo/.test(m)) return { erro: "Algum campo não foi aceito. Confira o horário e os textos." };
    if (/portal_salvar_convite/.test(m)) return { erro: "O convite ainda não pode ser salvo neste sistema." };
    console.error("[eorganizei:convite] salvar: falhou");
    return { erro: "Não foi possível salvar agora." };
  }
  revalidatePath(`/portal/${eventoId}/convite`);
  return { ok: true };
}
