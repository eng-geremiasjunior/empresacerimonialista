"use client";

// Assistente do evento: pergunta e resposta sobre ESTE evento.
//
// Só consulta — não cria nem altera nada. Serve para a cerimonialista
// achar rápido o que já está no sistema ("quanto falta receber?", "o que
// vence essa semana?") sem navegar por quatro abas.

import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

// Perguntas de partida: mostram o que ele sabe responder, sem manual.
const SUGESTOES = [
  "O que vence esta semana?",
  "Quanto falta receber?",
  "Quais decisões ainda faltam?",
  "Quais fornecedores já confirmaram?",
];

export function AssistenteEvento({ eventId }: { eventId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  async function perguntar(texto: string) {
    const pergunta = texto.trim();
    if (!pergunta || carregando) return;

    const novas: Msg[] = [...messages, { role: "user", content: pergunta }];
    setMessages(novas);
    setInput("");
    setErro(null);
    setCarregando(true);

    try {
      const res = await fetch("/api/ai/evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, messages: novas }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data?.error ?? "não consegui responder agora.");
      } else {
        setMessages([...novas, { role: "assistant", content: data.text }]);
      }
    } catch {
      setErro("não consegui responder agora.");
    } finally {
      setCarregando(false);
      setTimeout(
        () => fimRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <Sparkles size={15} className="text-indigo-500" />
        Perguntar sobre este evento
      </h3>

      {messages.length === 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              onClick={() => perguntar(s)}
              className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-3 max-h-80 space-y-2.5 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "text-right" : "text-left"}
            >
              <span
                className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[13px] leading-snug ${
                  m.role === "user"
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 bg-gray-50 text-gray-800"
                }`}
              >
                {m.content}
              </span>
            </div>
          ))}
          {carregando && (
            <p className="text-[12.5px] text-gray-500">consultando o evento…</p>
          )}
          <div ref={fimRef} />
        </div>
      )}

      {erro && <p className="mt-2 text-[12.5px] text-rose-600">{erro}</p>}

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && perguntar(input)}
          placeholder="Ex.: o que falta fechar?"
          disabled={carregando}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          onClick={() => perguntar(input)}
          disabled={carregando || !input.trim()}
          aria-label="Perguntar"
          className="rounded-lg bg-gray-900 px-3 py-2 text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          <Send size={15} />
        </button>
      </div>

      <p className="mt-2 text-[11px] text-gray-500">
        Responde com os dados deste evento. Não altera nada.
      </p>
    </section>
  );
}
