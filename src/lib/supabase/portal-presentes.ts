import "server-only";

// A lista de presentes no portal (182+): o recebedor da família, pela RLS.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { servico } from "@/lib/supabase/admin-painel";

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
 * A lista ainda está em construção (etapa 1 de 4): só aparece nos eventos
 * das contas da casa. Sem isto, uma família de verdade cadastraria CPF e
 * conta na Pagar.me de produção para uma lista que ainda não recebe
 * presente. Quando a etapa 2 subir, esta função passa a devolver true.
 */
export const listaDePresentesLiberada = cache(async (eventId: string): Promise<boolean> => {
  const db = servico();
  const { data: ev } = await db.from("events").select("empresa_id").eq("id", eventId).maybeSingle();
  const empresa = (ev as { empresa_id?: string } | null)?.empresa_id;
  if (!empresa) return false;
  const { data } = await db.from("contas_da_casa").select("empresa_id").eq("empresa_id", empresa).maybeSingle();
  return !!data;
});
