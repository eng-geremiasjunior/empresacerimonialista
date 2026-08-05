// Query de servidor da Organização (4B). Separada de organizacao.ts (puro,
// client-safe) para o componente client usar os tipos/itensDoMes sem puxar
// o client de servidor para o bundle.

import { createClient } from "@/lib/supabase/server";
import type { Organizacao, Tarefa, TarefaStatus } from "@/lib/supabase/organizacao";

export async function getOrganizacao(
  eventId: string,
  dataEvento: string | null
): Promise<Organizacao> {
  const supabase = createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, due_time, status, priority, category")
    .eq("event_id", eventId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: true });

  const tarefas: Tarefa[] = (tasks ?? []).map((t) => ({
    id: t.id,
    titulo: t.title,
    descricao: t.description,
    dueDate: t.due_date,
    dueTime: t.due_time,
    status: (t.status ?? "pendente") as TarefaStatus,
    priority: t.priority,
    category: t.category,
  }));

  const diasAteEvento = dataEvento
    ? Math.round(
        (new Date(`${dataEvento}T00:00:00`).getTime() -
          new Date(new Date().toDateString()).getTime()) /
          86_400_000
      )
    : null;

  return {
    diasAteEvento,
    dataEvento,
    tarefas,
    tarefasAbertas: tarefas.filter((t) => t.status !== "concluido").length,
    // COMPROMISSO ainda não tem tabela — Agenda vazia por ora.
    compromissos: [],
    agendaDisponivel: false,
  };
}
