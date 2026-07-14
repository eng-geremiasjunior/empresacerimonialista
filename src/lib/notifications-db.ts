import { createClient } from "@/lib/supabase/client";

export type NotificationType =
  | "tarefa_proxima"
  | "evento"
  | "pagamento"
  | "mensagem"
  | "fornecedor";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const COLUMNS = "id, type, title, message, link, read_at, created_at";

export async function fetchNotifications(
  limit = 20
): Promise<NotificationRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as NotificationRow[];
}

export async function createNotification(input: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) return;

  const { error } = await supabase.from("notifications").insert({
    cerimonialista_id: userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
  });

  if (error) {
    console.debug("[vela:notificações] não foi possível registrar:", error.message);
  }
}

export async function markNotificationRead(id: string) {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
}

export async function markAllNotificationsRead() {
  const supabase = createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
}

export async function deleteNotification(id: string) {
  const supabase = createClient();
  await supabase.from("notifications").delete().eq("id", id);
}
