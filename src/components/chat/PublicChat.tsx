"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatMessage, type ChatBubbleMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";

const REFRESH_MS = 5_000;

type Props = {
  hash: string;
};

// Chat do fornecedor na página pública do roteiro.
// Credencial = hash do link; tudo passa por funções security definer
// (chat_mensagens / chat_enviar / chat_marcar_lidas). Atualiza a cada 5s.
export function PublicChat({ hash }: Props) {
  const [messages, setMessages] = useState<ChatBubbleMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function refresh() {
      const { data, error } = await supabase.rpc("chat_mensagens", {
        link_hash: hash,
      });
      if (!active) return;
      if (error) {
        setUnavailable(true);
        setLoaded(true);
        return;
      }
      const rows = (data ?? []) as ChatBubbleMessage[];
      setMessages(rows);
      setLoaded(true);

      // Marca como lidas as mensagens da cerimonialista ainda não lidas.
      if (
        rows.some((m) => m.sender_type === "cerimonialista" && !m.read_at) &&
        document.visibilityState === "visible"
      ) {
        await supabase.rpc("chat_marcar_lidas", { link_hash: hash });
      }
    }

    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hash]);

  useEffect(() => {
    if (messages.length > countRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
    countRef.current = messages.length;
  }, [messages.length]);

  async function handleSend(text: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("chat_enviar", {
      link_hash: hash,
      conteudo: text,
    });
    if (!error && data) {
      setMessages((prev) => [
        ...prev,
        {
          id: (data as { id: string }).id,
          sender_type: "fornecedor",
          message: text,
          created_at: (data as { created_at: string }).created_at,
          read_at: null,
        },
      ]);
    }
  }

  if (unavailable) return null;

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">Fale com a cerimonialista</h2>
      <p className="mt-0.5 text-sm text-stone-500">
        Dúvidas sobre o roteiro? Mande uma mensagem — ela responde por aqui.
      </p>

      <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50">
        <div className="max-h-[45vh] min-h-[8rem] space-y-3 overflow-y-auto p-4">
          {!loaded ? (
            <p className="text-center text-sm text-stone-400">Carregando...</p>
          ) : messages.length === 0 ? (
            <p className="pt-6 text-center text-sm text-stone-400">
              Nenhuma mensagem ainda.
            </p>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                viewer="fornecedor"
                otherName="Cerimonialista"
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-stone-200 bg-white p-3">
          <ChatInput onSend={handleSend} />
        </div>
      </div>
    </section>
  );
}
