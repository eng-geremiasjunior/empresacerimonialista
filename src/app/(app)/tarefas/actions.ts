"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

function revalidate() {
  revalidatePath("/tarefas");
  revalidatePath("/calendario");
  // Atualiza o hub do evento (Saúde/Copiloto) e o dashboard.
  revalidatePath("/eventos/[id]", "layout");
  revalidatePath("/eventos/dashboard");
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

  revalidate();
  return { success: true };
}

export async function updateTask(
  taskId: string,
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

  const { error } = await supabase
    .from("tasks")
    .update({
      event_id: form.eventId,
      title: form.title,
      description: form.description || null,
      due_date: form.dueDate,
      due_time: form.dueTime || null,
      status: form.status,
      priority: form.priority,
      category: form.category,
      // Editar a tarefa rearma a notificação para o novo prazo.
      notified_at: null,
    })
    .eq("id", taskId);

  if (error) {
    return { error: "Não foi possível salvar a tarefa. Tente novamente." };
  }

  revalidate();
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    throw new Error("Não foi possível excluir a tarefa.");
  }

  revalidate();
}

// Checkbox: alterna entre concluído e pendente
export async function toggleTask(taskId: string) {
  const supabase = createClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .single();

  if (!task) return;

  await supabase
    .from("tasks")
    .update({ status: task.status === "concluido" ? "pendente" : "concluido" })
    .eq("id", taskId);

  revalidate();
}
