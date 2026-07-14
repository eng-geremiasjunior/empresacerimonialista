"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  enviarConfirmacaoFornecedor,
  type EventoParaConfirmar,
} from "@/lib/confirmacoes";

export async function setSupplierConfirmed(
  eventId: string,
  supplierId: string,
  confirmed: boolean
) {
  const supabase = createClient();
  await supabase
    .from("roteiro_links")
    .update({ confirmed })
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId);

  revalidatePath("/eventos/[id]", "layout");
  revalidatePath("/eventos/dashboard");
}

export async function salvarEmailFornecedor(
  eventId: string,
  supplierId: string,
  email: string
): Promise<{ error?: string }> {
  const value = email.trim();
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { error: "E-mail inválido" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ email: value || null })
    .eq("id", supplierId);

  if (error) return { error: "Não foi possível salvar o e-mail" };

  revalidatePath(`/eventos/${eventId}/fornecedores`);
  return {};
}

export async function salvarDiasAntecedencia(
  eventId: string,
  dias: number
): Promise<{ error?: string }> {
  if (!Number.isInteger(dias) || dias < 1 || dias > 60) {
    return { error: "Informe entre 1 e 60 dias" };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ confirmation_days_before: dias })
    .eq("id", eventId);

  if (error) return { error: "Não foi possível salvar" };

  revalidatePath(`/eventos/${eventId}/fornecedores`);
  return {};
}

export async function enviarConfirmacaoAgora(
  eventId: string,
  supplierId: string
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, type, date, time, location, clients(name)")
    .eq("id", eventId)
    .single();

  if (!ev) return { error: "Evento não encontrado" };

  const { data: sup } = await supabase
    .from("suppliers")
    .select("id, name, email")
    .eq("id", supplierId)
    .single();

  if (!sup) return { error: "Fornecedor não encontrado" };

  const evento: EventoParaConfirmar = {
    id: ev.id,
    type: ev.type,
    date: ev.date,
    time: ev.time,
    location: ev.location,
    client_name:
      (ev.clients as unknown as { name: string } | null)?.name ?? null,
  };

  const resultado = await enviarConfirmacaoFornecedor(supabase, evento, sup);
  if (!resultado.enviado) {
    return { error: resultado.motivo ?? "Falha no envio" };
  }

  revalidatePath(`/eventos/${eventId}/fornecedores`);
  return {};
}
