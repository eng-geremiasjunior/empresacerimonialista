import "server-only";

// A lista que as respostas em lote casam (21/10/2026). Pela SESSÃO dela:
// a RLS decide o que ela enxerga. Esta lista fica no servidor — não vai
// para a IA.

import { createClient } from "@/lib/supabase/server";
import type { ConvidadoParaCasar } from "@/lib/ia-rsvp";

type Sessao = ReturnType<typeof createClient>;

export async function lerListaParaCasar(supabase: Sessao, eventId: string): Promise<ConvidadoParaCasar[]> {
  const [convidados, comNomes] = await Promise.all([
    supabase
      .from("evento_convidado")
      .select("id, nome, telefone, confirmacao, acompanhantes, criancas, restricao_alimentar")
      .eq("event_id", eventId)
      .limit(3000),
    supabase.from("evento_acompanhante").select("convidado_id").eq("event_id", eventId).limit(5000),
  ]);
  const temNomes = new Set(((comNomes.data ?? []) as { convidado_id: string }[]).map((a) => a.convidado_id));
  return (
    (convidados.data ?? []) as {
      id: string;
      nome: string;
      telefone: string | null;
      confirmacao: ConvidadoParaCasar["confirmacao"];
      acompanhantes: number | null;
      criancas: number | null;
      restricao_alimentar: string | null;
    }[]
  ).map((c) => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    confirmacao: c.confirmacao,
    acompanhantes: Number(c.acompanhantes) || 0,
    criancas: Number(c.criancas) || 0,
    restricao: c.restricao_alimentar,
    comNomes: temNomes.has(c.id),
  }));
}
