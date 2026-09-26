import "server-only";

// A tela Tarefas do portal v2 (179). Três fontes, nenhuma nova porta
// para a tabela de tarefas da equipe:
//   - o que a cerimonialista pediu: portal_tarefas_pedidas (só título,
//     prazo, hora e local das tarefas 'noivos'/'ambos');
//   - o que a família incluiu: familia_tarefa;
//   - o que a cerimonialista está fazendo: o quadro da 173 (decisões).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type TarefaDoPortal = {
  id: string;
  origem: "pedida" | "propria";
  titulo: string;
  /** AAAA-MM-DD ou null */
  prazo: string | null;
  hora: string | null;
  detalhe: string | null;
  quem: string | null;
  feita: boolean;
  feitaPor: string | null;
  feitaEm: string | null;
  /** a família pode desfazer (marcou pelo portal) */
  podeDesfazer: boolean;
};

export type TarefaDaCerimonialista = { titulo: string; prazo: string | null; feito: boolean };

export const getTarefasDoPortal = cache(
  async (eventId: string): Promise<{ tarefas: TarefaDoPortal[]; daCerimonialista: TarefaDaCerimonialista[] }> => {
    const supabase = createClient();
    const [pedRes, propRes, quadroRes] = await Promise.all([
      supabase.rpc("portal_tarefas_pedidas", { p_event_id: eventId }),
      supabase
        .from("familia_tarefa")
        .select("id, titulo, detalhe, quando, quem, feita_em, feita_por_nome")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      supabase.rpc("portal_quadro_do_evento", { p_event_id: eventId }),
    ]);

    const pedidas = ((pedRes.data ?? []) as {
      id: string;
      titulo: string;
      prazo: string | null;
      hora: string | null;
      local: string | null;
      feita: boolean;
      feita_por: string | null;
      feita_em: string | null;
    }[]).map<TarefaDoPortal>((t) => ({
      id: t.id,
      origem: "pedida",
      titulo: t.titulo,
      prazo: t.prazo ? t.prazo.slice(0, 10) : null,
      hora: t.hora ? t.hora.slice(0, 5) : null,
      detalhe: t.local?.trim() || null,
      quem: null,
      feita: t.feita,
      feitaPor: t.feita_por,
      feitaEm: t.feita_em,
      podeDesfazer: !!t.feita_em,
    }));

    const proprias = ((propRes.data ?? []) as {
      id: string;
      titulo: string;
      detalhe: string | null;
      quando: string | null;
      quem: string | null;
      feita_em: string | null;
      feita_por_nome: string | null;
    }[]).map<TarefaDoPortal>((t) => ({
      id: t.id,
      origem: "propria",
      titulo: t.titulo,
      prazo: t.quando,
      hora: null,
      detalhe: t.detalhe,
      quem: t.quem,
      feita: !!t.feita_em,
      feitaPor: t.feita_por_nome,
      feitaEm: t.feita_em,
      podeDesfazer: true,
    }));

    const quadro = (quadroRes.error ? null : quadroRes.data) as {
      cuidando?: { titulo: string; prazo: string | null }[];
      fechado?: { titulo: string; quando: string }[];
    } | null;
    const daCerimonialista: TarefaDaCerimonialista[] = [
      ...(quadro?.cuidando ?? []).map((c) => ({ titulo: c.titulo, prazo: c.prazo, feito: false })),
      ...(quadro?.fechado ?? []).map((f) => ({ titulo: f.titulo, prazo: null, feito: true })),
    ];

    return { tarefas: [...pedidas, ...proprias], daCerimonialista };
  }
);
