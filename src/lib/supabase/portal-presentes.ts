import "server-only";

// A lista de presentes no portal (182+): o recebedor da família, pela RLS.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { servico } from "@/lib/supabase/admin-painel";
import { usaPortalNoivos } from "@/lib/portal-noivos";

export type RecebedorDoEvento = {
  status: "registration" | "affiliation" | "active" | "refused" | "suspended" | "blocked" | "inactive";
  kycStatus: string | null;
  titular: string | null;
  banco: string | null;
  quem: string | null;
};

export const getRecebedor = cache(async (eventId: string): Promise<RecebedorDoEvento | null> => {
  const { data, error } = await createClient()
    .from("evento_recebedor")
    .select("status, kyc_status, titular_nome, banco_resumo, criado_por_nome")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as { status: RecebedorDoEvento["status"]; kyc_status: string | null; titular_nome: string | null; banco_resumo: string | null; criado_por_nome: string | null };
  return { status: r.status, kycStatus: r.kyc_status, titular: r.titular_nome, banco: r.banco_resumo, quem: r.criado_por_nome };
});

/**
 * Onde a lista de presentes existe. LIBERADA para todos os casamentos em
 * 02/10/2026 ("pode liberar"): o portal dos noivos tem a lista inteira
 * (montar, receber, pôr no ar, recebidos — 197). No portal v2 (a
 * debutante) só existe o cadastro da conta que recebe, sem a lista: lá
 * continua só nas contas da casa, até a lista da debutante existir.
 */
export const listaDePresentesLiberada = cache(async (eventId: string): Promise<boolean> => {
  const db = servico();
  const { data: ev } = await db.from("events").select("empresa_id, type").eq("id", eventId).maybeSingle();
  const e = ev as { empresa_id?: string; type?: string } | null;
  if (!e) return false;
  if (usaPortalNoivos(e.type)) return true;
  if (!e.empresa_id) return false;
  const { data } = await db.from("contas_da_casa").select("empresa_id").eq("empresa_id", e.empresa_id).maybeSingle();
  return !!data;
});
