"use server";

// O Roteiro do dia da noiva que abriu a conta sozinha (04/10/2026): ela é
// quem monta e muda — sem sugestão para ninguém. As escritas são as do
// sistema da cerimonialista, nas mesmas colunas:
//   · a hora da cerimônia é events.time — o gatilho da 112 recalcula o
//     que ainda é estimativa (trg_recalcular_roteiro);
//   · sem roteiro ainda, ele nasce do modelo da conta (metodo_roteiro_item),
//     como no criar_evento_completo: deslocamento em minutos sobre a hora
//     da cerimônia, origem 'calculado';
//   · o momento que ela digita é firme (origem 'manual'), como no
//     createRoteiroItem.
// Só a dona da conta de família (donaDaFesta); a RLS confere de novo.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";

type Retorno = { ok: true } | { error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/cronograma`);
  revalidatePath(`/portal/${eventoId}`);
}

async function guarda(eventoId: string): Promise<{ empresaId: string } | { error: string }> {
  if (!UUID.test(eventoId)) return { error: "Pedido inválido." };
  return (await donaDaFesta(eventoId)) ?? { error: "Só quem abriu a conta mexe no roteiro." };
}

/** "16:00" + 270 min → "20:30:00"; passa da meia-noite como o ::time do banco. */
function somarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = (((h * 60 + m + minutos) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00`;
}

/**
 * A hora da cerimônia. Na primeira vez, o roteiro nasce inteiro do modelo
 * da conta; depois, mudar a hora move só o que ainda é estimativa.
 */
export async function definirHoraDaCerimonia(eventoId: string, hora: string): Promise<Retorno> {
  const dona = await guarda(eventoId);
  if ("error" in dona) return dona;
  if (!HORA.test(hora)) return { error: "Confira a hora." };
  const supabase = createClient();

  const { data: ev, error: e1 } = await supabase
    .from("events")
    .update({ time: `${hora}:00` })
    .eq("id", eventoId)
    .select("type")
    .maybeSingle();
  if (e1 || !ev) return { error: "Não foi possível salvar agora. Tente de novo." };

  const { count } = await supabase
    .from("roteiro_items")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventoId);
  if (!count) {
    const { data: modelo } = await supabase
      .from("metodo_roteiro_item")
      .select("codigo, titulo, offset_min, duracao_min, condicao, ordem")
      .eq("empresa_id", dona.empresaId)
      .eq("tipo_evento", (ev as { type: string }).type)
      .order("ordem");
    const itens = ((modelo ?? []) as {
      codigo: string;
      titulo: string;
      offset_min: number;
      duracao_min: number | null;
      condicao: string | null;
    }[])
      // a festa é dela: não há cerimonialista chegando
      .filter((m) => m.codigo !== "cerimonialista")
      // a pista entra (quase toda festa tem); ela tira se não tiver
      .filter((m) => !m.condicao || m.condicao === "hasDanceFloor")
      .map((m, i) => ({
        event_id: eventoId,
        title: m.titulo,
        order: i + 1,
        time: somarMinutos(hora, m.offset_min),
        offset_min: m.offset_min,
        duracao_minutos: m.duracao_min,
        origem_horario: "calculado",
      }));
    if (itens.length) {
      const { error: e2 } = await supabase.from("roteiro_items").insert(itens);
      if (e2) return { error: "A hora ficou salva, mas o roteiro não nasceu. Tente de novo." };
    }
  }

  revalidar(eventoId);
  return { ok: true };
}

/** Acrescentar (id null) ou mudar um momento: a hora que ela digita é firme. */
export async function salvarMomentoDaNoiva(
  eventoId: string,
  m: { id: string | null; hora: string; titulo: string; detalhe: string }
): Promise<Retorno> {
  const g = await guarda(eventoId);
  if ("error" in g) return g;
  const titulo = m.titulo.trim().slice(0, 200);
  const detalhe = m.detalhe.trim().slice(0, 300);
  if (!titulo) return { error: "Diga o que acontece." };
  if (!HORA.test(m.hora)) return { error: "Diga a hora." };
  if (m.id !== null && !UUID.test(m.id)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const time = `${m.hora}:00`;

  if (m.id === null) {
    const { error } = await supabase.from("roteiro_items").insert({
      event_id: eventoId,
      time,
      origem_horario: "manual",
      title: titulo,
      description: detalhe || null,
      status: "pendente",
      status_novo: "planejado",
    });
    if (error) return { error: "Não foi possível salvar agora. Tente de novo." };
  } else {
    const { data: atual } = await supabase
      .from("roteiro_items")
      .select("time")
      .eq("id", m.id)
      .eq("event_id", eventoId)
      .maybeSingle();
    if (!atual) return { error: "Esse momento não está mais no roteiro." };
    // só a hora que ela mudou vira firme: corrigir o texto não congela a estimativa
    const horaMudou = String((atual as { time: string | null }).time ?? "").slice(0, 5) !== m.hora;
    const { data, error } = await supabase
      .from("roteiro_items")
      .update({ time, ...(horaMudou ? { origem_horario: "manual" } : {}), title: titulo, description: detalhe || null })
      .eq("id", m.id)
      .eq("event_id", eventoId)
      .select("id");
    if (error || !data?.length) return { error: "Não foi possível salvar agora. Tente de novo." };
  }

  revalidar(eventoId);
  return { ok: true };
}

export async function tirarMomentoDaNoiva(eventoId: string, id: string): Promise<Retorno> {
  const g = await guarda(eventoId);
  if ("error" in g) return g;
  if (!UUID.test(id)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const { data, error } = await supabase.from("roteiro_items").delete().eq("id", id).eq("event_id", eventoId).select("id");
  if (error || !data?.length) return { error: "Não foi possível tirar agora. Tente de novo." };
  revalidar(eventoId);
  return { ok: true };
}
