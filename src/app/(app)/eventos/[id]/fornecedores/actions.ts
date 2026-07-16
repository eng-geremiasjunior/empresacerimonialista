"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  enviarConfirmacaoFornecedor,
  type EventoParaConfirmar,
} from "@/lib/confirmacoes";

// Fornecedor global da empresa para o modal de busca/vínculo. `vinculado`
// indica se já está ligado ao evento (não pode vincular de novo).
export type FornecedorGlobalBusca = {
  id: string;
  name: string;
  descricao: string | null;
  categorias: string[];
  vinculado: boolean;
};

export async function buscarFornecedoresParaVincular(
  eventId: string,
  termo: string
): Promise<FornecedorGlobalBusca[]> {
  const supabase = createClient();
  const q = termo.trim().replace(/[,()]/g, "");

  let query = supabase
    .from("suppliers")
    .select("id, name, descricao, supplier_categorias(categoria)")
    .order("name", { ascending: true })
    .limit(30);
  if (q) query = query.or(`name.ilike.%${q}%,descricao.ilike.%${q}%`);

  const [{ data: sups }, { data: links }] = await Promise.all([
    query,
    supabase.from("roteiro_links").select("supplier_id").eq("event_id", eventId),
  ]);

  const vinculados = new Set(
    (links ?? []).map((l) => l.supplier_id as string)
  );

  return (
    (sups ?? []) as unknown as {
      id: string;
      name: string;
      descricao: string | null;
      supplier_categorias: { categoria: string }[] | null;
    }[]
  ).map((s) => ({
    id: s.id,
    name: s.name,
    descricao: s.descricao,
    categorias: (s.supplier_categorias ?? []).map((c) => c.categoria),
    vinculado: vinculados.has(s.id),
  }));
}

// Vincula um fornecedor GLOBAL existente ao evento (cria a linha em
// roteiro_links com hash gerado). Idempotente via unique(event,supplier).
export async function vincularFornecedor(
  eventId: string,
  supplierId: string,
  role?: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const base = {
    event_id: eventId,
    supplier_id: supplierId,
    hash: randomBytes(16).toString("hex"),
  };
  let { error } = await supabase
    .from("roteiro_links")
    .upsert(
      { ...base, role: role?.trim() || null },
      { onConflict: "event_id,supplier_id", ignoreDuplicates: true }
    );

  // Coluna `role` ausente (migração 027 pendente): vincula sem o papel.
  if (error?.code === "42703") {
    ({ error } = await supabase
      .from("roteiro_links")
      .upsert(base, { onConflict: "event_id,supplier_id", ignoreDuplicates: true }));
  }

  if (error) return { error: "Não foi possível vincular o fornecedor" };

  revalidatePath(`/eventos/${eventId}/fornecedores`);
  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath("/eventos/[id]", "layout");
  return {};
}

// Remove o vínculo do fornecedor com o evento. Também limpa a referência
// nos itens do roteiro deste evento (para não apontar para um fornecedor
// desvinculado). O cadastro global do fornecedor permanece intacto.
export async function desvincularFornecedor(
  eventId: string,
  supplierId: string
): Promise<{ error?: string }> {
  const supabase = createClient();

  await supabase
    .from("roteiro_items")
    .update({ supplier_id: null })
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId);

  const { error } = await supabase
    .from("roteiro_links")
    .delete()
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId);

  if (error) return { error: "Não foi possível remover o vínculo" };

  revalidatePath(`/eventos/${eventId}/fornecedores`);
  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath("/eventos/[id]", "layout");
  return {};
}

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
