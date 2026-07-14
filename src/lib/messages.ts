import { createClient } from "@/lib/supabase/client";

export type ChatMessageRow = {
  id: string;
  event_id: string;
  supplier_id: string;
  sender_type: "cerimonialista" | "fornecedor";
  message: string;
  created_at: string;
  read_at: string | null;
};

const MESSAGE_COLUMNS =
  "id, event_id, supplier_id, sender_type, message, created_at, read_at";

export async function fetchEventMessages(
  eventId: string
): Promise<ChatMessageRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("event_messages")
    .select(MESSAGE_COLUMNS)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return (data ?? []) as ChatMessageRow[];
}

export async function sendCerimonialistaMessage(
  eventId: string,
  supplierId: string,
  text: string
): Promise<ChatMessageRow | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("event_messages")
    .insert({
      event_id: eventId,
      supplier_id: supplierId,
      sender_type: "cerimonialista",
      sender_id: user?.id ?? null,
      message: text,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  return error ? null : (data as ChatMessageRow);
}

// Marca como lidas as mensagens do FORNECEDOR na conversa aberta.
export async function markConversationRead(
  eventId: string,
  supplierId: string
) {
  const supabase = createClient();
  await supabase
    .from("event_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId)
    .eq("sender_type", "fornecedor")
    .is("read_at", null);
}
