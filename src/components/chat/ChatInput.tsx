"use client";

import { useState } from "react";

type Props = {
  onSend: (text: string) => Promise<void>;
  initialText?: string;
  placeholder?: string;
};

export function ChatInput({ onSend, initialText, placeholder }: Props) {
  const [text, setText] = useState(initialText ?? "");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder ?? "Escreva uma mensagem..."}
        maxLength={2000}
        className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
      />
      <button
        type="submit"
        disabled={sending || text.trim().length === 0}
        className="shrink-0 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40"
      >
        {sending ? "..." : "Enviar"}
      </button>
    </form>
  );
}
