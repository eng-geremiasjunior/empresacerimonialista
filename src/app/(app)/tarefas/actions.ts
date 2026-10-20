"use server";

import { revalidarTarefas } from "@/lib/revalidar-tarefas";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarTarefa } from "@/app/(app)/eventos/[id]/organizacao/actions";
import type { TaskCategory, TaskPriority, TaskStatus } from "@/lib/types";

export type TaskFormState = { error: string } | { success: true } | null;

const STATUSES: TaskStatus[] = ["pendente", "em_progresso", "concluido"];
const PRIORITIES: TaskPriority[] = ["alta", "media", "baixa"];
const CATEGORIES: TaskCategory[] = [
  "som",
  "buffet",
  "decoracao",
  "fotografia",
  "bolo",
  "cerimonia",
  "transporte",
  "geral",
  "presente",
  "vestiario",
];

function readForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    dueDate: String(formData.get("due_date") ?? "").trim(),
    dueTime: String(formData.get("due_time") ?? "").trim(),
    eventId: String(formData.get("event_id") ?? ""),
    status: String(formData.get("status") ?? "pendente"),
    priority: String(formData.get("priority") ?? "media"),
    category: String(formData.get("category") ?? "geral"),
  };
}

function validate(form: ReturnType<typeof readForm>): string | null {
  if (!form.title) return "Informe o título da tarefa.";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(form.dueDate) ||
    isNaN(new Date(`${form.dueDate}T00:00:00`).getTime())
  ) {
    return "Informe uma data de vencimento válida.";
  }
  if (form.dueTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(form.dueTime)) {
    return "Informe um horário válido.";
  }
  if (!form.eventId) return "Escolha o evento da tarefa.";
  if (!STATUSES.includes(form.status as TaskStatus)) {
    return "Escolha um status válido.";
  }
  if (!PRIORITIES.includes(form.priority as TaskPriority)) {
    return "Escolha uma prioridade válida.";
  }
  if (!CATEGORIES.includes(form.category as TaskCategory)) {
    return "Escolha uma categoria válida.";
  }
  return null;
}

export async function createTask(
  _prev: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("tasks").insert({
    event_id: form.eventId,
    title: form.title,
    description: form.description || null,
    due_date: form.dueDate,
    due_time: form.dueTime || null,
    status: form.status,
    priority: form.priority,
    category: form.category,
  });

  if (error) {
    return { error: "Não foi possível salvar a tarefa. Tente novamente." };
  }

  revalidarTarefas();
  return { success: true };
}

// updateTask, deleteTask e toggleTask viviam aqui e ninguém os
// chamava: quem edita, apaga e alterna tarefa é
// eventos/[id]/organizacao/actions.ts, e a versão de lá é a melhor das
// duas (só rearma os lembretes quando a DATA muda de verdade, em vez de
// a cada gravação do formulário). Duas implementações do mesmo CRUD é
// como uma correção entra numa e não na outra.
//
// createTask fica: AcoesRapidas.tsx ainda a usa.

/* ------------------------------------------------------------------ */
/* A tarefa dela, com ou sem evento (217, 19/10/2026)                  */
/* ------------------------------------------------------------------ */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "+ Tarefa" na tela de Tarefas: com evento escolhido, vira tarefa do
 * evento (a mesma ação da Organização); sem evento, vira tarefa livre,
 * dela. O prazo é opcional nos dois.
 */
export async function novaTarefa(entrada: {
  titulo: string;
  prazo?: string | null;
  eventId?: string | null;
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  const titulo = (entrada.titulo ?? "").trim().slice(0, 200);
  if (!titulo) return { ok: false, erro: "Escreva a tarefa." };
  const prazo = entrada.prazo && DATA.test(entrada.prazo) ? entrada.prazo : null;

  if (entrada.eventId) {
    if (!UUID.test(entrada.eventId)) return { ok: false, erro: "Evento não encontrado." };
    const r = await criarTarefa(entrada.eventId, { titulo, dueDate: prazo });
    return "error" in r && r.error ? { ok: false, erro: r.error } : { ok: true };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("tarefa_livre").insert({ titulo, prazo, criado_por: user.id });
  if (error) {
    console.error("[tarefas] livre:", error.code);
    return {
      ok: false,
      erro:
        error.code === "42P01" || error.code === "PGRST205"
          ? "A tarefa sem evento ainda não está disponível. Avise a gente."
          : "Não foi possível salvar a tarefa.",
    };
  }
  revalidarTarefas();
  return { ok: true };
}

export async function alternarTarefaLivre(id: string, feita: boolean): Promise<{ ok: boolean }> {
  if (!UUID.test(id)) return { ok: false };
  const { error } = await createClient()
    .from("tarefa_livre")
    .update({ feita_em: feita ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) console.error("[tarefas] alternar livre:", error.code);
  revalidarTarefas();
  return { ok: !error };
}

export async function apagarTarefaLivre(id: string): Promise<{ ok: boolean }> {
  if (!UUID.test(id)) return { ok: false };
  const { error } = await createClient().from("tarefa_livre").delete().eq("id", id);
  if (error) console.error("[tarefas] apagar livre:", error.code);
  revalidarTarefas();
  return { ok: !error };
}
