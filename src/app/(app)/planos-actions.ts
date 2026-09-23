"use server";

// A tela de planos dentro do sistema (23/09/2026): os dados do banner que
// abre a cada login de quem não paga. Buscado só quando o login acabou de
// acontecer — o layout não paga esta leitura a cada navegação.

import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { dadosDoBanner, type DadosDoBanner } from "@/lib/planos-banner";

export type SituacaoDoPlano = {
  /** "gratuito" ou o código do plano (de quem paga ou está em teste) */
  planoAtual: string;
  pagante: boolean;
  testando: boolean;
  /** o teto de eventos do plano atual; null = sem limite */
  eventos: number | null;
};

/** O plano da conta pela régua do banco (teto_do_plano, 154). */
export async function situacaoDoPlano(): Promise<SituacaoDoPlano | null> {
  const { empresaId } = await getMeuCargo();
  if (!empresaId) return null;
  const supabase = createClient();
  const { data } = await supabase.rpc("teto_do_plano", { p_empresa_id: empresaId }).maybeSingle();
  const t = data as { plano: string | null; pagante: boolean; testando: boolean; eventos: number | null } | null;
  if (!t) return null;
  return {
    // nem pagante nem em teste = o Gratuito (a regra de 1 evento da 154)
    planoAtual: t.pagante || t.testando ? (t.plano ?? "essencial") : "gratuito",
    pagante: t.pagante,
    testando: t.testando,
    eventos: t.pagante || t.testando ? t.eventos : 1,
  };
}

/** O banner do login: só para a proprietária que não paga (gratuito ou em teste). */
export async function bannerAoEntrar(): Promise<{ dados: DadosDoBanner; planoAtual: string } | null> {
  try {
    const { cargo } = await getMeuCargo();
    if (cargo !== "proprietaria") return null;
    const s = await situacaoDoPlano();
    if (!s || s.pagante) return null;
    return { dados: await dadosDoBanner(), planoAtual: s.planoAtual };
  } catch {
    return null;
  }
}
