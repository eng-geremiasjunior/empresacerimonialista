import "server-only";

// O Roteiro do dia da noiva que abriu a conta sozinha (04/10/2026), lido
// pela sessão dela. Na conta da família ela é a dona do evento: lê o
// roteiro direto (roteiro_items, como a cerimonialista), com o que a
// janela do portal esconde dos outros — o detalhe de cada momento e se o
// horário ainda é estimativa (112: calculado pela hora da cerimônia).

import { createClient } from "@/lib/supabase/server";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";
import { montarRoteiro } from "@/components/portal/noivos/telas/roteiro/montar";

export type MomentoDaNoiva = {
  id: string;
  /** "16:00"; null quando o momento ainda não tem horário */
  hora: string | null;
  titulo: string;
  detalhe: string | null;
  /** "45 min", "1h30" */
  duracao: string | null;
  /** o horário ainda é a conta da hora da cerimônia (muda com ela); a
   *  própria cerimônia (deslocamento 0) é a hora que ela disse: não é */
  estimado: boolean;
};

export type RoteiroDaNoiva = {
  /** "16:00"; null = ela ainda não disse */
  horaCerimonia: string | null;
  momentos: MomentoDaNoiva[];
};

type ItemBruto = {
  id: string;
  time: string | null;
  title: string;
  description: string | null;
  duracao_minutos: number | null;
  origem_horario: string | null;
  offset_min: number | null;
};

/** null = não é a dona da conta de família (ou a sessão não vê o evento). */
export async function getRoteiroDaNoiva(eventoId: string): Promise<RoteiroDaNoiva | null> {
  if (!(await donaDaFesta(eventoId))) return null;
  const supabase = createClient();
  const [{ data: ev }, { data: brutos }] = await Promise.all([
    supabase.from("events").select("time").eq("id", eventoId).maybeSingle(),
    supabase
      .from("roteiro_items")
      .select("id, time, title, description, duracao_minutos, origem_horario, offset_min")
      .eq("event_id", eventoId)
      .order("time", { ascending: true, nullsFirst: false }),
  ]);
  const itens = (brutos ?? []) as ItemBruto[];
  const porId = new Map(itens.map((i) => [i.id, i]));

  // a ordem do dia (a madrugada depois da festa) é a mesma da tela de leitura
  const { linhas } = montarRoteiro(
    itens.map((i) => ({ id: i.id, hora: i.time, titulo: i.title, duracao: i.duracao_minutos })),
    []
  );
  const hora = (ev as { time: string | null } | null)?.time ?? null;

  return {
    horaCerimonia: hora && /^\d{2}:\d{2}/.test(hora) ? hora.slice(0, 5) : null,
    momentos: linhas.map((l) => {
      const i = porId.get(l.id)!;
      return {
        id: l.id,
        hora: l.hora,
        titulo: l.titulo,
        detalhe: i.description?.trim() || null,
        duracao: l.sub,
        estimado: i.origem_horario === "calculado" && i.offset_min !== 0,
      };
    }),
  };
}
