// O programa do dia como a cliente vê, e as sugestões que ela mandou.
//
// A cliente NUNCA lê roteiro_items — a RPC devolve só horário, título e
// duração. Responsável, telefone do fornecedor, observação interna e
// status de execução ficam do lado de cá.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type MomentoDoDia = {
  id: string;
  hora: string | null;
  titulo: string;
  duracao: number | null;
};

export type SugestaoCronograma = {
  id: string;
  roteiroItemId: string | null;
  tipo: "horario" | "momento_novo";
  horarioSugerido: string | null;
  tituloSugerido: string | null;
  mensagem: string | null;
  estado: "pendente" | "aceita" | "recusada";
  motivoRecusa: string | null;
  criadaEm: string;
};

export const getProgramaDoDia = cache(
  async (eventId: string): Promise<MomentoDoDia[]> => {
    const supabase = createClient();
    const { data } = await supabase.rpc("portal_programa_do_dia", {
      p_event_id: eventId,
    });
    return ((data ?? []) as Record<string, unknown>[]).map((m) => ({
      id: m.id as string,
      hora: (m.hora as string) ?? null,
      titulo: m.titulo as string,
      duracao: (m.duracao as number) ?? null,
    }));
  }
);

export const getSugestoesDoEvento = cache(
  async (eventId: string): Promise<SugestaoCronograma[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("roteiro_sugestao")
      .select(
        "id, roteiro_item_id, tipo, horario_sugerido, titulo_sugerido, mensagem, estado, motivo_recusa, created_at"
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    return ((data ?? []) as Record<string, unknown>[]).map((s) => ({
      id: s.id as string,
      roteiroItemId: (s.roteiro_item_id as string) ?? null,
      tipo: s.tipo as SugestaoCronograma["tipo"],
      horarioSugerido: (s.horario_sugerido as string) ?? null,
      tituloSugerido: (s.titulo_sugerido as string) ?? null,
      mensagem: (s.mensagem as string) ?? null,
      estado: s.estado as SugestaoCronograma["estado"],
      motivoRecusa: (s.motivo_recusa as string) ?? null,
      criadaEm: s.created_at as string,
    }));
  }
);

/** Quantas sugestões esperam a cerimonialista (fila do cronograma). */
export const contarSugestoesPendentes = cache(
  async (eventId: string): Promise<number> => {
    const supabase = createClient();
    const { count } = await supabase
      .from("roteiro_sugestao")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("estado", "pendente");
    return count ?? 0;
  }
);
