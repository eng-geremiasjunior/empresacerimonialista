"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_LABELS } from "@/lib/types";

export type EventFormState = { error: string } | null;

const TYPES = Object.keys(EVENT_TYPE_LABELS);
const STATUSES = ["orcamento", "confirmado", "concluido", "cancelado"];

function readForm(formData: FormData) {
  return {
    clientId: String(formData.get("client_id") ?? "").trim(),
    clientName: String(formData.get("client_name") ?? "").trim(),
    clientPhone: String(formData.get("client_phone") ?? "").trim(),
    type: String(formData.get("type") ?? ""),
    date: String(formData.get("date") ?? ""),
    location: String(formData.get("location") ?? "").trim(),
    status: String(formData.get("status") ?? ""),
    responsavelId: String(formData.get("responsavel_id") ?? "").trim(),
  };
}

function validate(form: ReturnType<typeof readForm>): string | null {
  // Cliente: ou um existente selecionado, ou um novo (nome obrigatório).
  if (!form.clientId && !form.clientName) {
    return "Selecione um cliente ou informe o nome de um novo.";
  }
  if (!TYPES.includes(form.type)) return "Escolha o tipo do evento.";
  if (!form.date) return "Informe a data do evento.";
  return null;
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cliente existente (selecionado no assistente) ou criação rápida.
  let clientId = form.clientId;

  if (!clientId) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        cerimonialista_id: user.id,
        name: form.clientName,
        phone: form.clientPhone || null,
      })
      .select("id")
      .single();

    if (clientError) {
      return { error: "Não foi possível salvar o cliente. Tente novamente." };
    }
    clientId = client.id;
  }

  const { data: created, error: eventError } = await supabase
    .from("events")
    .insert({
      cerimonialista_id: user.id,
      client_id: clientId,
      type: form.type,
      date: form.date,
      location: form.location || null,
      status: "orcamento",
    })
    .select("id")
    .single();

  if (eventError) {
    return { error: "Não foi possível criar o evento. Tente novamente." };
  }

  revalidatePath("/eventos");
  redirect(`/eventos/${created.id}`);
}

export async function updateEvent(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { error: invalid };
  if (!STATUSES.includes(form.status)) {
    return { error: "Escolha um status válido." };
  }

  const eventId = String(formData.get("event_id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!eventId) return { error: "Evento não encontrado." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let finalClientId = clientId || null;

  if (clientId) {
    const { error: clientError } = await supabase
      .from("clients")
      .update({ name: form.clientName, phone: form.clientPhone || null })
      .eq("id", clientId);
    if (clientError) {
      return { error: "Não foi possível salvar o cliente. Tente novamente." };
    }
  } else {
    // Evento sem cliente vinculado: cria o cliente agora.
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        cerimonialista_id: user.id,
        name: form.clientName,
        phone: form.clientPhone || null,
      })
      .select("id")
      .single();
    if (clientError) {
      return { error: "Não foi possível salvar o cliente. Tente novamente." };
    }
    finalClientId = client.id;
  }

  const patch: Record<string, unknown> = {
    client_id: finalClientId,
    type: form.type,
    date: form.date,
    location: form.location || null,
    status: form.status,
  };
  // Só troca o responsável se o campo veio no formulário (a coluna pode
  // não existir ainda se a migração 022 estiver pendente).
  if (form.responsavelId) {
    patch.cerimonialista_responsavel_id = form.responsavelId;
  }

  let { error: eventError } = await supabase
    .from("events")
    .update(patch)
    .eq("id", eventId);

  if (eventError?.code === "42703" && form.responsavelId) {
    delete patch.cerimonialista_responsavel_id;
    ({ error: eventError } = await supabase
      .from("events")
      .update(patch)
      .eq("id", eventId));
  }

  if (eventError) {
    return { error: "Não foi possível salvar o evento. Tente novamente." };
  }

  revalidatePath("/eventos");
  revalidatePath(`/eventos/${eventId}`, "layout");
  redirect(`/eventos/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) {
    throw new Error("Não foi possível excluir o evento.");
  }

  revalidatePath("/eventos");
  redirect("/eventos");
}

// Arquivar: some da listagem sem apagar dados (ao contrário de excluir).
export async function archiveEvent(eventId: string) {
  const supabase = createClient();
  await supabase.from("events").update({ archived: true }).eq("id", eventId);
  revalidatePath("/eventos");
}

export async function archiveEvents(eventIds: string[]) {
  if (eventIds.length === 0) return;
  const supabase = createClient();
  await supabase.from("events").update({ archived: true }).in("id", eventIds);
  revalidatePath("/eventos");
}

// Duplica os dados básicos do evento (não o checklist/roteiro/financeiro);
// a cerimonialista ajusta data e status na cópia.
export async function duplicateEvent(eventId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: original } = await supabase
    .from("events")
    .select("client_id, type, date, location, city")
    .eq("id", eventId)
    .single();

  if (!original) return;

  await supabase.from("events").insert({
    cerimonialista_id: user.id,
    client_id: original.client_id,
    type: original.type,
    date: original.date,
    location: original.location,
    city: original.city,
    status: "orcamento",
  });

  revalidatePath("/eventos");
}
