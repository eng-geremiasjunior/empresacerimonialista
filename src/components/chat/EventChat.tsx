"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useEventMessages } from "@/hooks/useEventMessages";
import {
  markConversationRead,
  sendCerimonialistaMessage,
  type ChatMessageRow,
} from "@/lib/messages";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";

export type ChatSupplier = { id: string; name: string };

type Props = {
  eventId: string;
  suppliers: ChatSupplier[];
  initialSupplierId: string | null;
};

export function EventChat({ eventId, suppliers, initialSupplierId }: Props) {
  const validInitial = suppliers.some((s) => s.id === initialSupplierId)
    ? initialSupplierId
    : null;

  const [selected, setSelected] = useState<string | null>(validInitial);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  // Pré-preenche a mensagem quando veio do botão "Contatar" do roteiro.
  const [prefill, setPrefill] = useState(() => {
    if (!validInitial) return "";
    const name = suppliers.find((s) => s.id === validInitial)?.name ?? "";
    return `Oi, ${name}! Tudo bem?`;
  });

  const { messages, loaded, addLocal } = useEventMessages(
    eventId,
    (message: ChatMessageRow) => {
      if (message.sender_type !== "fornecedor") return;
      if (
        message.supplier_id === selectedRef.current &&
        document.visibilityState === "visible"
      ) {
        markConversationRead(eventId, message.supplier_id);
        return;
      }
      const name =
        suppliers.find((s) => s.id === message.supplier_id)?.name ??
        "Fornecedor";
      toast(`💬 ${name}: ${message.message.slice(0, 60)}`, { id: message.id });
    }
  );

  // Abrir a conversa marca as mensagens do fornecedor como lidas.
  useEffect(() => {
    if (selected) {
      markConversationRead(eventId, selected);
    }
  }, [eventId, selected]);

  const unreadBySupplier = useMemo(() => {
    const counts = new Map<string, number>();
    for (const message of messages) {
      if (message.sender_type === "fornecedor" && !message.read_at) {
        counts.set(
          message.supplier_id,
          (counts.get(message.supplier_id) ?? 0) + 1
        );
      }
    }
    return counts;
  }, [messages]);

  const conversation = useMemo(
    () => messages.filter((m) => m.supplier_id === selected),
    [messages, selected]
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.length]);

  const selectedSupplier = suppliers.find((s) => s.id === selected) ?? null;

  async function handleSend(text: string) {
    if (!selected) return;
    const sent = await sendCerimonialistaMessage(eventId, selected, text);
    if (sent) {
      addLocal(sent);
    } else {
      toast.error(
        "Não foi possível enviar. Se o banco não foi atualizado, execute a migração 006_chat.sql."
      );
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
      {/* Lista de fornecedores (com não lidas) */}
      <div className={selected ? "hidden lg:block" : ""}>
        <ul className="space-y-1.5">
          {suppliers.map((supplier) => {
            const unread = unreadBySupplier.get(supplier.id) ?? 0;
            const active = supplier.id === selected;
            return (
              <li key={supplier.id}>
                <button
                  onClick={() => {
                    setSelected(supplier.id);
                    if (supplier.id !== validInitial) setPrefill("");
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      active
                        ? "bg-stone-700 text-white"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {supplier.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {supplier.name}
                  </span>
                  {unread > 0 && (
                    <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {unread}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Janela do chat */}
      {selected && selectedSupplier ? (
        <div className="flex flex-col rounded-xl border border-stone-200 bg-stone-50 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-stone-200 bg-white px-4 py-3">
            <button
              onClick={() => setSelected(null)}
              className="rounded-md p-1 text-stone-500 hover:bg-stone-100 lg:hidden"
              aria-label="Voltar para a lista"
            >
              ←
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600">
              {selectedSupplier.name.slice(0, 2).toUpperCase()}
            </span>
            <p className="font-medium">{selectedSupplier.name}</p>
          </div>

          <div className="h-[50vh] space-y-3 overflow-y-auto p-4">
            {!loaded ? (
              <p className="text-center text-sm text-stone-400">
                Carregando conversa...
              </p>
            ) : conversation.length === 0 ? (
              <p className="pt-10 text-center text-sm text-stone-400">
                Nenhuma mensagem ainda. Diga um oi! 👋
              </p>
            ) : (
              conversation.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  viewer="cerimonialista"
                  otherName={selectedSupplier.name}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-stone-200 bg-white p-3">
            <ChatInput
              key={selected}
              onSend={handleSend}
              initialText={selected === validInitial ? prefill : ""}
            />
          </div>
        </div>
      ) : (
        <div className="hidden items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-500 lg:flex">
          Escolha um fornecedor para abrir a conversa.
        </div>
      )}
    </div>
  );
}
