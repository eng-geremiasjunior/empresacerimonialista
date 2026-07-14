"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RoteiroStatus } from "@/lib/types";

export type RoteiroFormState = { error: string } | { success: true } | null;

const STATUSES: RoteiroStatus[] = ["pendente", "em_andamento", "concluido"];

const NEXT_STATUS: Record<RoteiroStatus, RoteiroStatus> = {
  pendente: "em_andamento",
  em_andamento: "concluido",
  concluido: "pendente",
};

function readForm(formData: FormData) {
  return {
    time: String(formData.get("time") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    supplierChoice: String(formData.get("supplier_id") ?? ""),
    newSupplierName: String(formData.get("new_supplier_name") ?? "").trim(),
    status: String(formData.get("status") ?? "pendente"),
  };
}

function validate(form: ReturnType<typeof readForm>): string | null {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(form.time)) return "Informe o horário.";
  if (!form.title) return "Informe o título do item.";
  if (!STATUSES.includes(form.status as RoteiroStatus)) {
    return "Escolha um status válido.";
  }
  return null;
}

// "16:00" -> "16:00:00" (formato da coluna time do Postgres)
function normalizeTime(time: string) {
  return time.length === 5 ? `${time}:00` : time;
}

async function hasDuplicateTime(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  time: string,
  excludeItemId?: string
) {
  let query = supabase
    .from("roteiro_items")
    .select("id")
    .eq("event_id", eventId)
    .eq("time", time);
  if (excludeItemId) {
    query = query.neq("id", excludeItemId);
  }
  const { data } = await query;
  return (data ?? []).length > 0;
}

// Resolve o fornecedor escolhido no select; "__new__" cadastra um novo.
async function resolveSupplier(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  form: ReturnType<typeof readForm>
): Promise<{ supplierId: string | null } | { error: string }> {
  if (form.supplierChoice !== "__new__") {
    return { supplierId: form.supplierChoice || null };
  }
  if (!form.newSupplierName) {
    return { error: "Informe o nome do novo fornecedor." };
  }
  const { data, error } = await supabase
    .from("suppliers")
    .insert({ cerimonialista_id: userId, name: form.newSupplierName })
    .select("id")
    .single();
  if (error) {
    return { error: "Não foi possível cadastrar o fornecedor." };
  }
  return { supplierId: data.id };
}

export async function createRoteiroItem(
  eventId: string,
  _prev: RoteiroFormState,
  formData: FormData
): Promise<RoteiroFormState> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const time = normalizeTime(form.time);
  if (await hasDuplicateTime(supabase, eventId, time)) {
    return { error: "Já existe um item nesse horário. Escolha outro horário." };
  }

  const supplier = await resolveSupplier(supabase, user.id, form);
  if ("error" in supplier) return supplier;

  const { error } = await supabase.from("roteiro_items").insert({
    event_id: eventId,
    time,
    title: form.title,
    description: form.description || null,
    supplier_id: supplier.supplierId,
    status: form.status,
  });

  if (error) {
    return { error: "Não foi possível salvar o item. Tente novamente." };
  }

  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { success: true };
}

export async function updateRoteiroItem(
  eventId: string,
  itemId: string,
  _prev: RoteiroFormState,
  formData: FormData
): Promise<RoteiroFormState> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const time = normalizeTime(form.time);
  if (await hasDuplicateTime(supabase, eventId, time, itemId)) {
    return { error: "Já existe um item nesse horário. Escolha outro horário." };
  }

  const supplier = await resolveSupplier(supabase, user.id, form);
  if ("error" in supplier) return supplier;

  const { error } = await supabase
    .from("roteiro_items")
    .update({
      time,
      title: form.title,
      description: form.description || null,
      supplier_id: supplier.supplierId,
      status: form.status,
    })
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) {
    return { error: "Não foi possível salvar o item. Tente novamente." };
  }

  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { success: true };
}

export async function deleteRoteiroItem(eventId: string, itemId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("roteiro_items")
    .delete()
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) {
    throw new Error("Não foi possível excluir o item.");
  }

  revalidatePath(`/eventos/${eventId}/roteiro`);
}

// Avança o status com um clique: pendente -> em andamento -> concluído -> pendente
export async function cycleRoteiroStatus(eventId: string, itemId: string) {
  const supabase = createClient();
  const { data: item } = await supabase
    .from("roteiro_items")
    .select("status")
    .eq("id", itemId)
    .eq("event_id", eventId)
    .single();

  if (!item) return;

  await supabase
    .from("roteiro_items")
    .update({ status: NEXT_STATUS[item.status as RoteiroStatus] ?? "pendente" })
    .eq("id", itemId)
    .eq("event_id", eventId);

  revalidatePath(`/eventos/${eventId}/roteiro`);
}

// Modo Evento: toque marca o item como concluído (ou reabre).
export async function setRoteiroItemDone(
  eventId: string,
  itemId: string,
  done: boolean
) {
  const supabase = createClient();
  await supabase
    .from("roteiro_items")
    .update({ status: done ? "concluido" : "pendente" })
    .eq("id", itemId)
    .eq("event_id", eventId);

  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath(`/eventos/${eventId}/modo-evento`);
  revalidatePath(`/eventos/${eventId}`, "layout");
}
