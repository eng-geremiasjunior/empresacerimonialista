// Núcleo do envio de confirmação de fornecedor — compartilhado entre o
// job diário (/api/cron/confirmacoes, service role) e o botão manual
// "Enviar confirmação agora" (server action, sessão da cerimonialista).

import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarEmailConfirmacao } from "@/lib/email";
import {
  enviarConfirmacaoWhatsapp,
  whatsappConfigurado,
} from "@/lib/whatsapp";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";

export type EventoParaConfirmar = {
  id: string;
  type: EventType;
  date: string;
  time: string | null;
  location: string | null;
  client_name: string | null;
  // Preferência de canal do evento (075/100). undefined = ligado, que é
  // o comportamento histórico; só desliga quando explicitamente false.
  whatsapp_auto?: boolean;
  email_auto?: boolean;
};

export type ResultadoEnvio = {
  supplierId: string;
  supplierName: string;
  email: string | null;
  enviado: boolean;
  motivo?: string;
  canais?: string[]; // canais em que o envio funcionou: 'email' | 'whatsapp'
  /**
   * true quando havia canal para tentar e a ENTREGA falhou — diferente de
   * "não havia o que enviar". A rotina diária usa isso para decidir se
   * marca o evento como processado ou tenta de novo amanhã.
   */
  falhouEntrega?: boolean;
};

export function eventLabel(ev: EventoParaConfirmar) {
  return `${EVENT_TYPE_LABELS[ev.type] ?? ev.type} — ${ev.client_name ?? "Sem cliente"}`;
}

// Cria (ou reutiliza) o registro de confirmação do fornecedor e envia o
// e-mail. Idempotente: unique(event_id, supplier_id) garante 1 registro.
export async function enviarConfirmacaoFornecedor(
  supabase: SupabaseClient,
  evento: EventoParaConfirmar,
  supplier: {
    id: string;
    name: string;
    email: string | null;
    whatsapp?: string | null;
  }
): Promise<ResultadoEnvio> {
  const base: ResultadoEnvio = {
    supplierId: supplier.id,
    supplierName: supplier.name,
    email: supplier.email,
    enviado: false,
  };

  // WhatsApp é canal ADICIONAL ao e-mail: basta ter um dos dois.
  const telefone = supplier.whatsapp ?? null;
  if (!supplier.email && !telefone) {
    return { ...base, motivo: "fornecedor sem e-mail e sem WhatsApp cadastrado" };
  }

  // Canal desligado no evento (100) não sai nem no automático nem no
  // manual — o botão da tela obedece a mesma chave que o cron.
  const emailDoFornecedor = supplier.email;
  const porEmail = !!emailDoFornecedor && evento.email_auto !== false;
  const porWhatsapp =
    !!telefone && evento.whatsapp_auto !== false && whatsappConfigurado();
  if (!porEmail && !porWhatsapp) {
    return {
      ...base,
      motivo: supplier.email
        ? "os dois canais estão desligados neste evento"
        : "sem e-mail cadastrado e o WhatsApp está desligado neste evento",
    };
  }

  // Reutiliza a confirmação existente (reenvio) ou cria uma nova.
  const { data: existing } = await supabase
    .from("supplier_confirmations")
    .select("id, hash, status")
    .eq("event_id", evento.id)
    .eq("supplier_id", supplier.id)
    .maybeSingle();

  // Fornecedor já respondeu: não reenvia (evita spam em re-execuções do job).
  if (existing?.status === "confirmado" || existing?.status === "recusado") {
    return { ...base, motivo: "fornecedor já respondeu" };
  }

  let confirmationId = existing?.id as string | undefined;
  let hash = existing?.hash as string | undefined;

  if (!confirmationId) {
    const { data: created, error } = await supabase
      .from("supplier_confirmations")
      .insert({ event_id: evento.id, supplier_id: supplier.id })
      .select("id, hash")
      .single();
    if (error || !created) {
      return { ...base, motivo: `falha ao criar registro: ${error?.message}` };
    }
    confirmationId = created.id;
    hash = created.hash;
  }

  const canais: string[] = [];
  const falhas: string[] = [];

  if (porEmail && emailDoFornecedor) {
    const envio = await enviarEmailConfirmacao({
      to: emailDoFornecedor,
      supplierName: supplier.name,
      eventLabel: eventLabel(evento),
      eventDate: evento.date,
      eventTime: evento.time,
      eventLocation: evento.location,
      hash: hash!,
    });
    if (envio.ok) canais.push("email");
    else falhas.push(`e-mail: ${envio.error}`);
  }

  // WhatsApp com botões (mesmo hash do e-mail). Respeita a preferência do
  // evento e as credenciais — sem qualquer um dos dois, pula sem quebrar o
  // fluxo do e-mail.
  if (porWhatsapp) {
    const zap = await enviarConfirmacaoWhatsapp({
      telefone,
      supplierName: supplier.name,
      eventLabel: eventLabel(evento),
      eventDate: evento.date,
      eventTime: evento.time,
      eventLocation: evento.location,
      hash: hash!,
    });
    if (zap.ok) canais.push("whatsapp");
    else falhas.push(`whatsapp: ${zap.error}`);
  }

  if (canais.length === 0) {
    return {
      ...base,
      falhouEntrega: falhas.length > 0,
      motivo: falhas.join(" | ") || "nenhum canal disponível",
    };
  }

  await supabase
    .from("supplier_confirmations")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", confirmationId);

  return {
    ...base,
    enviado: true,
    canais,
    motivo: falhas.length ? falhas.join(" | ") : undefined,
  };
}

// Fornecedores vinculados ao evento (via roteiro_links), com e-mail.
export async function fornecedoresDoEvento(
  supabase: SupabaseClient,
  eventId: string
): Promise<
  { id: string; name: string; email: string | null; whatsapp: string | null }[]
> {
  const { data } = await supabase
    .from("roteiro_links")
    .select("supplier_id, suppliers(id, name, email, whatsapp)")
    .eq("event_id", eventId);

  return ((data ?? []) as unknown as {
    supplier_id: string;
    suppliers: {
      id: string;
      name: string;
      email: string | null;
      whatsapp: string | null;
    } | null;
  }[])
    .filter((l) => l.suppliers)
    .map((l) => ({
      id: l.supplier_id,
      name: l.suppliers!.name,
      email: l.suppliers!.email,
      whatsapp: l.suppliers!.whatsapp,
    }));
}
