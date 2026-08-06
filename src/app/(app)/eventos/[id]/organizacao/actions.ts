"use server";

// Ações da Organização: compromissos (Agenda) e o envio de confirmação por
// WhatsApp. A RLS por evento (pode_editar_evento) é a guarda real; aqui só
// gravamos e revalidamos a rota.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarConfirmacaoCompromissoWhatsapp } from "@/lib/whatsapp";

export type AcaoResult = { error: string } | { success: true };

const RESPONSAVEIS = ["noivos", "cerimonialista", "ambos"] as const;

// Pendência financeira: a automação abre o rascunho, a cerimonialista
// decide. "Descartar" fecha sem lançar nada — dinheiro nunca se move sozinho.
// Confirmar de fato (com valor/fornecedor) acontece no Financeiro.
export async function descartarPendencia(
  eventId: string,
  pendenciaId: string
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("financeiro_pendencia")
    .update({ status: "descartada", resolvida_em: new Date().toISOString() })
    .eq("id", pendenciaId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível descartar a pendência." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

// Concluir/reabrir uma tarefa direto da Organização. Determinística (recebe
// o estado desejado) para casar com a UI otimista — clicar duas vezes rápido
// não inverte o resultado. A RLS por evento é a guarda.
export async function alternarTarefa(
  eventId: string,
  taskId: string,
  concluir: boolean
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: concluir ? "concluido" : "pendente" })
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar a tarefa." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

export async function criarCompromisso(
  eventId: string,
  form: {
    titulo: string;
    data: string; // yyyy-mm-dd
    hora?: string | null; // HH:mm
    local?: string | null;
    responsavel?: string | null;
    observacao?: string | null;
    supplierId?: string | null;
  }
): Promise<AcaoResult> {
  const titulo = form.titulo?.trim();
  if (!titulo) return { error: "Dê um título ao compromisso." };
  if (!form.data) return { error: "Escolha a data." };

  const responsavel =
    form.responsavel && RESPONSAVEIS.includes(form.responsavel as never)
      ? form.responsavel
      : null;

  const supabase = createClient();
  const { error } = await supabase.from("compromisso").insert({
    event_id: eventId,
    titulo,
    data: form.data,
    hora: form.hora || null,
    local: form.local?.trim() || null,
    responsavel,
    observacao: form.observacao?.trim() || null,
    supplier_id: form.supplierId || null,
  });

  if (error) return { error: "Não foi possível criar o compromisso." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

// Remarcar / cancelar manualmente pela cerimonialista.
export async function mudarEstadoCompromisso(
  eventId: string,
  compromissoId: string,
  estado: "agendado" | "confirmado" | "cancelado" | "remarcado"
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("compromisso")
    .update({ estado })
    .eq("id", compromissoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar o compromisso." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

export async function excluirCompromisso(
  eventId: string,
  compromissoId: string
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("compromisso")
    .delete()
    .eq("id", compromissoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível excluir o compromisso." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

// Envio MANUAL da confirmação: a cerimonialista dispara; o fornecedor
// responde por botão (o hash do compromisso vai no id do botão). O disparo
// automático agendado é de outra etapa.
export async function enviarConfirmacaoCompromisso(
  eventId: string,
  compromissoId: string
): Promise<AcaoResult> {
  const supabase = createClient();

  const { data: c } = await supabase
    .from("compromisso")
    .select(
      "titulo, data, hora, local, hash, supplier_id, suppliers(name, whatsapp, phone), events(type, client_id)"
    )
    .eq("id", compromissoId)
    .eq("event_id", eventId)
    .single();

  if (!c) return { error: "Compromisso não encontrado." };
  if (!c.supplier_id)
    return { error: "Vincule um fornecedor antes de pedir confirmação." };

  const sup = Array.isArray(c.suppliers) ? c.suppliers[0] : c.suppliers;
  const telefone = sup?.whatsapp || sup?.phone;
  if (!telefone)
    return { error: "O fornecedor não tem WhatsApp cadastrado." };

  const ev = Array.isArray(c.events) ? c.events[0] : c.events;

  // event_label é montado no banco em outros fluxos; aqui uma legenda simples
  // basta para a mensagem.
  const eventLabel =
    ev?.type === "casamento" ? "seu casamento" : "sua festa";

  const res = await enviarConfirmacaoCompromissoWhatsapp({
    telefone,
    supplierName: sup?.name ?? "fornecedor",
    titulo: c.titulo,
    eventLabel,
    data: c.data,
    hora: c.hora ? String(c.hora).slice(0, 5) : null,
    local: c.local,
    hash: c.hash,
  });

  if (!res.ok) {
    return {
      error: res.configurado
        ? `Falha ao enviar: ${res.error ?? "erro desconhecido"}`
        : "WhatsApp não está configurado no servidor.",
    };
  }

  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}
