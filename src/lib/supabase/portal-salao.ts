import "server-only";

// Convidados do portal v2 (180): a lista com o que a pessoa respondeu no
// convite (faixa, sexo, acompanhantes, restrições) e o salão que a
// cerimonialista montou (portal_salao, só leitura para a família).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Faixa = "adulto" | "6-12" | "0-5";
export type Sexo = "feminino" | "masculino" | "nd";

export type ConvidadoV2 = {
  id: string;
  nome: string;
  telefone: string | null;
  hash: string;
  confirmacao: "aguardando" | "confirmado" | "nao_vai";
  acompanhantes: number;
  criancas: number;
  faixa: Faixa | null;
  sexo: Sexo | null;
  /** os acompanhantes nominais (129), com a faixa e o sexo da 180 */
  pessoas: { nome: string | null; faixa: Faixa | null; sexo: Sexo | null }[];
  restricoes: string[];
  recado: string | null;
  mesaId: string | null;
  confirmadoEm: string | null;
  confirmadoVia: "link" | "manual" | null;
};

export type MesaDoSalao = { id: string; rotulo: string; tipo: string; lugares: number; x: number; y: number };
export type ElementoDoSalao = { tipo: string; rotulo: string | null; x: number; y: number; largura: number; altura: number };

export const getConvidadosV2 = cache(
  async (eventId: string): Promise<{ convidados: ConvidadoV2[]; mesas: MesaDoSalao[]; elementos: ElementoDoSalao[] }> => {
    const supabase = createClient();
    const [lista, salao] = await Promise.all([
      supabase
        .from("evento_convidado")
        .select(
          "id, nome, telefone, hash, confirmacao, acompanhantes, criancas, faixa, sexo, restricao_tipo, recado, mesa_id, confirmado_em, confirmado_via, evento_acompanhante(nome, eh_crianca, faixa, sexo, ordem)"
        )
        .eq("event_id", eventId)
        .order("nome"),
      supabase.rpc("portal_salao", { p_event_id: eventId }),
    ]);
    const convidados = ((lista.data ?? []) as Record<string, unknown>[]).map((c) => ({
      id: c.id as string,
      nome: c.nome as string,
      telefone: (c.telefone as string) ?? null,
      hash: c.hash as string,
      confirmacao: c.confirmacao as ConvidadoV2["confirmacao"],
      acompanhantes: Number(c.acompanhantes ?? 0),
      criancas: Number(c.criancas ?? 0),
      faixa: (c.faixa as Faixa) ?? null,
      sexo: (c.sexo as Sexo) ?? null,
      // os acompanhantes nominais (129); sem faixa, a criança fica "sem idade"
      pessoas: (Array.isArray(c.evento_acompanhante) ? (c.evento_acompanhante as { nome: string; eh_crianca: boolean; faixa: Faixa | null; sexo: Sexo | null; ordem: number }[]) : [])
        .sort((a, b) => a.ordem - b.ordem)
        .map((a) => ({ nome: a.nome, faixa: a.faixa ?? (a.eh_crianca ? null : "adulto"), sexo: a.sexo })),
      restricoes: Array.isArray(c.restricao_tipo) ? (c.restricao_tipo as string[]) : [],
      recado: (c.recado as string) ?? null,
      mesaId: (c.mesa_id as string) ?? null,
      confirmadoEm: (c.confirmado_em as string) ?? null,
      confirmadoVia: (c.confirmado_via as ConvidadoV2["confirmadoVia"]) ?? null,
    }));
    const s = (salao.error ? null : salao.data) as { mesas?: MesaDoSalao[]; elementos?: ElementoDoSalao[] } | null;
    return { convidados, mesas: s?.mesas ?? [], elementos: s?.elementos ?? [] };
  }
);
