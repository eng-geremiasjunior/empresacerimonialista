"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/lib/notifications-db";

const MAX_ITEMS = 20;

// Últimas notificações + assinatura realtime (RLS limita à usuária logada).
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    fetchNotifications(MAX_ITEMS).then((rows) => {
      if (active) setNotifications(rows);
    });

    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as NotificationRow;
          setNotifications((prev) =>
            prev.some((n) => n.id === row.id)
              ? prev
              : [row, ...prev].slice(0, MAX_ITEMS)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as NotificationRow;
          setNotifications((prev) =>
            prev.map((n) => (n.id === row.id ? { ...n, ...row } : n))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        (payload) => {
          const removedId = (payload.old as { id: string }).id;
          setNotifications((prev) => prev.filter((n) => n.id !== removedId));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const unread = notifications.filter((n) => !n.read_at).length;

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id && !n.read_at
          ? { ...n, read_at: new Date().toISOString() }
          : n
      )
    );
    await markNotificationRead(id);
  }

  async function markAll() {
    const stamp = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: stamp }))
    );
    await markAllNotificationsRead();
  }

  async function remove(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
  }

  return { notifications, unread, markRead, markAll, remove };
}
