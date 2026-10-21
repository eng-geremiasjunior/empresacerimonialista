import "server-only";

// Quem tem a IA nova e quanto ainda pode usar (21/10/2026, migração 220).
//
// Pedido dele: enquanto ele testa, os trabalhos novos só aparecem nas
// contas da casa. Quando der o OK, liga "para todos" no /admin/ajustes e
// passa a valer para os planos pagos, cada um com a sua cota — sem deploy.
//
// As 7 leituras que já existiam (briefing, cortejo, contrato…) NÃO passam
// por aqui: continuam com a trava de plano de sempre.
//
// Tudo com a chave de serviço: ia_ajustes e ia_consumo não têm policy.
// Sem a 220 aplicada, a IA nova fica escondida para todos (nada quebra).

import { cache } from "react";
import { createClient as criarSupabase } from "@supabase/supabase-js";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { meuNivelDoPlano } from "@/lib/supabase/nivel-do-plano";
import { ajustesDaLinha, avisoDaCota, limiteDoPlano, type AjustesDaIa, type Limite } from "@/lib/ia-cota";

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return criarSupabase(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

const mesBR = () => {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return `${hoje.slice(0, 7)}-01`;
};

/** os ajustes, ou null quando a 220 ainda não foi aplicada */
export const lerAjustesDaIa = cache(async (): Promise<AjustesDaIa | null> => {
  const db = servico();
  if (!db) return null;
  const { data, error } = await db.from("ia_ajustes").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  return ajustesDaLinha(data as Record<string, unknown>);
});

export type EstadoDaIa = {
  /** os trabalhos novos aparecem para esta conta */
  liberada: boolean;
  empresaId: string | null;
  limite: Limite;
  usadas: number;
  /** "restam 30 ações…" a partir de 80%; null antes disso */
  aviso: string | null;
};

const FECHADA: EstadoDaIa = { liberada: false, empresaId: null, limite: { acoes: 0, audioMin: 0 }, usadas: 0, aviso: null };

/** O estado da IA nova para quem está no sistema. */
export const estadoDaIa = cache(async (): Promise<EstadoDaIa> => {
  try {
    const db = servico();
    const ajustes = await lerAjustesDaIa();
    if (!db || !ajustes || !ajustes.ligada) return FECHADA;

    const { empresaId, cargo } = await getMeuCargo();
    // a assistente não pede trabalho de IA (a mesma regra da 220)
    if (!empresaId || !cargo || cargo === "assistente") return FECHADA;

    const { data: casa } = await db.from("contas_da_casa").select("empresa_id").eq("empresa_id", empresaId).maybeSingle();
    const daCasa = !!casa;
    if (!daCasa && !ajustes.paraTodos) return FECHADA;

    const limite = limiteDoPlano(await meuNivelDoPlano(), ajustes, daCasa);
    if (limite.acoes <= 0) return { ...FECHADA, empresaId };

    const { data: consumo } = await db
      .from("ia_consumo")
      .select("acoes")
      .eq("empresa_id", empresaId)
      .eq("mes", mesBR())
      .maybeSingle();
    const usadas = Number((consumo as { acoes?: number } | null)?.acoes) || 0;
    return { liberada: true, empresaId, limite, usadas, aviso: avisoDaCota(usadas, limite.acoes) };
  } catch {
    return FECHADA;
  }
});

export type Reserva =
  | { ok: true; devolver: () => Promise<void> }
  | { ok: false; motivo: "fechada" | "cota" };

/**
 * Reserva na cota ANTES de chamar o modelo; `devolver()` quando o
 * provedor falhar. A soma é atômica no banco (ia_reservar, 220).
 */
export async function reservarIa(p: { acoes: number; audioSeg?: number }): Promise<Reserva> {
  const estado = await estadoDaIa();
  const db = servico();
  if (!estado.liberada || !estado.empresaId || !db) return { ok: false, motivo: "fechada" };

  const acoes = Math.max(0, Math.round(p.acoes));
  const audioSeg = Math.max(0, Math.round(p.audioSeg ?? 0));
  const { data, error } = await db.rpc("ia_reservar", {
    p_empresa_id: estado.empresaId,
    p_acoes: acoes,
    p_audio_seg: audioSeg,
    p_limite_acoes: estado.limite.acoes,
    p_limite_audio: estado.limite.audioMin,
  });
  if (error) {
    console.error("[eorg:ia] reservar:", error.code);
    return { ok: false, motivo: "fechada" };
  }
  // a 220 devolve o mês em que reservou; null = não coube
  if (typeof data !== "string") return { ok: false, motivo: "cota" };

  const empresaId = estado.empresaId;
  const mes = data;
  return {
    ok: true,
    devolver: async () => {
      const { error: e } = await db.rpc("ia_devolver", { p_empresa_id: empresaId, p_mes: mes, p_acoes: acoes, p_audio_seg: audioSeg });
      if (e) console.error("[eorg:ia] devolver:", e.code);
    },
  };
}
