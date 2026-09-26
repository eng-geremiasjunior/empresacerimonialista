import "server-only";

// A cara da festa (176) e quem está com o portal aberto. A leitura vai
// pela sessão: a RLS da 176 deixa a família e a equipe do evento lerem.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ESTILO_PADRAO, ehFundo, ehTopo, type EstiloDoPortal } from "@/lib/cor-da-festa";

type LinhaEstilo = {
  cor_nome: string;
  cor_l: number | string;
  cor_c: number | string;
  cor_h: number | string;
  fundo: string;
  topo: string;
  retrato_path: string | null;
  retrato_no_convite: boolean;
  atualizado_por_nome: string | null;
  updated_at: string | null;
};

export const getEstiloDoPortal = cache(async (eventId: string): Promise<EstiloDoPortal> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_portal_estilo")
    .select("cor_nome, cor_l, cor_c, cor_h, fundo, topo, retrato_path, retrato_no_convite, atualizado_por_nome, updated_at")
    .eq("event_id", eventId)
    .maybeSingle();
  // sem a 176 aplicada, ou sem escolha ainda: o padrão do desenho
  if (error || !data) return ESTILO_PADRAO;
  const e = data as LinhaEstilo;

  let retratoUrl: string | null = null;
  if (e.retrato_path) {
    const { data: assinada } = await supabase.storage
      .from("inspiracoes")
      .createSignedUrl(e.retrato_path, 60 * 60);
    retratoUrl = assinada?.signedUrl ?? null;
  }

  return {
    cor: { nome: e.cor_nome, l: Number(e.cor_l), c: Number(e.cor_c), h: Number(e.cor_h) },
    fundo: ehFundo(e.fundo) ? e.fundo : "festa",
    topo: ehTopo(e.topo) ? e.topo : "padrao",
    retratoPath: e.retrato_path,
    retratoUrl,
    retratoNoConvite: e.retrato_no_convite,
    autor: e.atualizado_por_nome,
    atualizadoEm: e.updated_at,
  };
});

/** Quem abriu o portal: o nome e o papel do acesso DELA neste evento. */
export const getMeuAcesso = cache(
  async (eventId: string): Promise<{ nome: string | null; papel: string | null }> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { nome: null, papel: null };
    const { data } = await supabase
      .from("evento_acesso")
      .select("nome, papel")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "ativo")
      .maybeSingle();
    const a = data as { nome: string | null; papel: string | null } | null;
    return { nome: a?.nome ?? null, papel: a?.papel ?? null };
  }
);
