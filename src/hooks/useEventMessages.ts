"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchEventMessages, type ChatMessageRow } from "@/lib/messages";

// Carrega o histórico do evento e assina INSERT/UPDATE via Supabase Realtime.
// O RLS garante que só chegam mensagens dos eventos da cerimonialista logada.
export function useEventMessages(
  eventId: string,
  onIncoming?: (message: ChatMessageRow) => void
) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    fetchEventMessages(eventId).then((rows) => {
      if (active) {
        setMessages(rows);
        setLoaded(true);
      }
    });

    const channel = supabase
      .channel(`event-chat-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const message = payload.new as ChatMessageRow;
          setMessages((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [...prev, message]
          );
          onIncomingRef.current?.(message);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const message = payload.new as ChatMessageRow;
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? message : m))
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Mensagem enviada localmente (eco imediato, sem esperar o realtime).
  function addLocal(message: ChatMessageRow) {
    setMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message]
    );
  }

  return { messages, loaded, addLocal };
}
