// Auxiliares do webhook do WhatsApp — SERVER-SIDE APENAS (service role).
//
// Princípio de segurança do fluxo: NUNCA adivinhar a que confirmação uma
// mensagem se refere. Botão => hash explícito. Texto livre => só age se
// houver EXATAMENTE uma pendência para aquele telefone; havendo dúvida,
// notifica a cerimonialista para resolução manual.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Next cacheia fetch GET em contexto server; sempre no-store.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export type MensagemRecebida = {
  from: string;
  type: "text" | "button_reply" | "interactive" | "status" | "outro";
  text?: string;
  buttonId?: string;
  buttonTitle?: string;
  messageId?: string;
};

// Navega o payload da Meta. Cobre os três formatos de resposta por botão:
// interactive.button_reply (botões interativos), button.payload (quick
// reply de template) e texto puro. Entregas/leituras chegam em `statuses`.
export function extrairMensagem(payload: unknown): MensagemRecebida | null {
  const p = payload as {
    entry?: {
      changes?: {
        value?: {
          messages?: Record<string, unknown>[];
          statuses?: { recipient_id?: string }[];
        };
      }[];
    }[];
  };

  const value = p?.entry?.[0]?.changes?.[0]?.value;
  if (!value) return null;

  const msg = value.messages?.[0];
  if (!msg) {
    const st = value.statuses?.[0];
    if (st) {
      return { from: String(st.recipient_id ?? ""), type: "status" };
    }
    return null;
  }

  const from = String(msg.from ?? "");
  const messageId = msg.id ? String(msg.id) : undefined;
  const tipo = String(msg.type ?? "");

  if (tipo === "text") {
    const t = msg.text as { body?: string } | undefined;
    return { from, messageId, type: "text", text: String(t?.body ?? "") };
  }

  if (tipo === "interactive") {
    const inter = msg.interactive as
      | {
          type?: string;
          button_reply?: { id?: string; title?: string };
          list_reply?: { id?: string; title?: string };
        }
      | undefined;
    const reply = inter?.button_reply ?? inter?.list_reply;
    if (reply?.id) {
      return {
        from,
        messageId,
        type: "button_reply",
        buttonId: String(reply.id),
        buttonTitle: reply.title ? String(reply.title) : undefined,
      };
    }
    return { from, messageId, type: "interactive" };
  }

  // Quick reply de template: vem como type 'button' com payload.
  if (tipo === "button") {
    const btn = msg.button as { payload?: string; text?: string } | undefined;
    if (btn?.payload) {
      return {
        from,
        messageId,
        type: "button_reply",
        buttonId: String(btn.payload),
        buttonTitle: btn.text ? String(btn.text) : undefined,
      };
    }
    return { from, messageId, type: "outro" };
  }

  return { from, messageId, type: "outro" };
}

// O WhatsApp manda "5538999999999"; o Vela guarda "(38) 99999-9999".
// Comparar os últimos 9 dígitos resolve os dois formatos e o DDI ausente.
// Menos de 8 dígitos => string vazia, que nunca casa com nada (evita que
// um cadastro vazio/torto case com qualquer telefone).
export function normalizarTelefone(telefone: string): string {
  const apenasDigitos = (telefone || "").replace(/\D/g, "");
  if (apenasDigitos.length < 8) return "";
  return apenasDigitos.slice(-9);
}

export type PendenciaConfirmacao = {
  id: string;
  hash: string;
  event_id: string;
  supplier_id: string;
  supplierName: string;
};

// Só devolve algo quando há EXATAMENTE uma pendência para o telefone.
// Zero ou várias => null (a cerimonialista decide).
export async function buscarUnicaConfirmacaoPendentePorTelefone(
  admin: SupabaseClient,
  phone: string
): Promise<PendenciaConfirmacao | null> {
  const alvo = normalizarTelefone(phone);
  if (!alvo) return null;

  const { data } = await admin
    .from("supplier_confirmations")
    .select("id, hash, event_id, supplier_id, suppliers!inner(name, whatsapp, phone)")
    .eq("status", "pendente");

  const linhas = (data ?? []) as unknown as {
    id: string;
    hash: string;
    event_id: string;
    supplier_id: string;
    suppliers: { name: string; whatsapp: string | null; phone: string | null } | null;
  }[];

  const candidatos = linhas.filter((c) => {
    const w = normalizarTelefone(c.suppliers?.whatsapp ?? "");
    const t = normalizarTelefone(c.suppliers?.phone ?? "");
    return (w && w === alvo) || (t && t === alvo);
  });

  if (candidatos.length !== 1) return null;
  const c = candidatos[0];
  return {
    id: c.id,
    hash: c.hash,
    event_id: c.event_id,
    supplier_id: c.supplier_id,
    supplierName: c.suppliers?.name ?? "Fornecedor",
  };
}

// Fornecedor (e dono) a partir do telefone — para saber quem notificar.
async function fornecedorPorTelefone(admin: SupabaseClient, phone: string) {
  const alvo = normalizarTelefone(phone);
  if (!alvo) return null;

  const { data } = await admin
    .from("suppliers")
    .select("id, name, whatsapp, phone, cerimonialista_id");

  const linhas = (data ?? []) as unknown as {
    id: string;
    name: string;
    whatsapp: string | null;
    phone: string | null;
    cerimonialista_id: string | null;
  }[];

  return (
    linhas.find((s) => {
      const w = normalizarTelefone(s.whatsapp ?? "");
      const t = normalizarTelefone(s.phone ?? "");
      return (w && w === alvo) || (t && t === alvo);
    }) ?? null
  );
}

// Quando não dá para agir com segurança, a cerimonialista assume.
export async function notificarCerimonialistaMensagemNaoProcessada(
  admin: SupabaseClient,
  phone: string,
  texto: string
): Promise<string> {
  const fornecedor = await fornecedorPorTelefone(admin, phone);

  if (!fornecedor?.cerimonialista_id) {
    return `remetente ${phone} não corresponde a nenhum fornecedor cadastrado`;
  }

  // Evento mais próximo desse fornecedor, para dar destino ao link.
  const { data: links } = await admin
    .from("roteiro_links")
    .select("event_id, events!inner(id, date)")
    .eq("supplier_id", fornecedor.id)
    .order("date", { referencedTable: "events", ascending: true })
    .limit(1);

  const eventId = (links as unknown as { event_id: string }[] | null)?.[0]
    ?.event_id;

  const recorte = texto.length > 120 ? `${texto.slice(0, 120)}…` : texto;

  await admin.from("notifications").insert({
    cerimonialista_id: fornecedor.cerimonialista_id,
    type: "fornecedor",
    title: `WhatsApp de ${fornecedor.name}`,
    message: `Mensagem não processada automaticamente: "${recorte}"`,
    link: eventId ? `/eventos/${eventId}/comunicacao` : "/comunicacao",
  });

  return `notificada a cerimonialista sobre mensagem de ${fornecedor.name}`;
}
