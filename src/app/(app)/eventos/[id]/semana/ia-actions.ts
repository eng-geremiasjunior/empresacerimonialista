"use server";

// Preparar a semana: criar as tarefas que ela marcou, e desfazer (24 h).
// O pacote foi gravado pelo servidor e a sessão só o LÊ; as tarefas entram
// pela SESSÃO dela, pela RLS de tasks. O desfazer apaga só os ids que o
// servidor registrou, presos ao evento do trabalho.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { estadoDaIa } from "@/lib/ia-ajustes";
import { fecharTrabalho } from "@/lib/ia-trabalhos";
import type { PacoteDaSemana } from "@/lib/ia-semana";

const UUID = /^[0-9a-f-]{36}$/i;
const DESFAZER_ATE_MS = 24 * 3600 * 1000;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

async function lerTrabalho(supabase: ReturnType<typeof createClient>, eventId: string, trabalhoId: string) {
  const { data } = await supabase
    .from("ia_trabalho")
    .select("id, event_id, tipo, estado, pacote, resultado, confirmado_em")
    .eq("id", trabalhoId)
    .maybeSingle();
  const t = data as {
    id: string;
    event_id: string | null;
    tipo: string;
    estado: string;
    pacote: PacoteDaSemana | null;
    resultado: { criadas?: string[] } | null;
    confirmado_em: string | null;
  } | null;
  return t && t.event_id === eventId && t.tipo === "preparar_semana" ? t : null;
}

export async function criarTarefasDaSemana(
  eventId: string,
  trabalhoId: string,
  chaves: string[]
): Promise<{ error: string } | { ok: true; criadas: number }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para continuar." };
  if (!(await estadoDaIa()).liberada) return { error: "Esta função ainda não está liberada para a sua conta." };

  const trabalho = await lerTrabalho(supabase, eventId, trabalhoId);
  if (!trabalho) return { error: "Este pacote não existe mais." };
  if (trabalho.estado !== "pronto") return { error: "As tarefas deste pacote já foram criadas." };

  const marcadas = new Set(chaves);
  const tarefas = (trabalho.pacote?.tarefas ?? []).filter((t) => marcadas.has(t.chave) && DATA.test(t.prazo));
  if (!tarefas.length) return { error: "Marque pelo menos uma tarefa." };

  const { data, error } = await supabase
    .from("tasks")
    .insert(
      tarefas.map((t) => ({
        event_id: eventId,
        title: t.titulo,
        due_date: t.prazo,
        status: "pendente",
        category: "geral",
        priority: "alta",
        responsavel: "cerimonialista",
      }))
    )
    .select("id");
  if (error || !data) return { error: "Não foi possível criar as tarefas." };

  const criadas = (data as { id: string }[]).map((t) => t.id);
  await fecharTrabalho(trabalhoId, "confirmado", { userId: user.id, resultado: { criadas } });
  revalidatePath(`/eventos/${eventId}/semana`);
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { ok: true, criadas: criadas.length };
}

export async function desfazerTarefasDaSemana(eventId: string, trabalhoId: string): Promise<{ error?: string; ok?: true }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const trabalho = await lerTrabalho(supabase, eventId, trabalhoId);
  if (!trabalho || trabalho.estado !== "confirmado" || !trabalho.confirmado_em) return { error: "Não há o que desfazer." };
  if (Date.now() - new Date(trabalho.confirmado_em).getTime() > DESFAZER_ATE_MS) {
    return { error: "Passaram 24 horas: estas tarefas não podem mais ser desfeitas por aqui." };
  }
  const ids = trabalho.resultado?.criadas ?? [];
  if (ids.length) {
    const { error } = await supabase.from("tasks").delete().eq("event_id", eventId).in("id", ids);
    if (error) return { error: "Não foi possível tirar as tarefas." };
  }
  await fecharTrabalho(trabalhoId, "desfeito");
  revalidatePath(`/eventos/${eventId}/semana`);
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { ok: true };
}
