"use client";

// Perguntar sobre este evento (Modelo A): pergunta e resposta sobre ESTE
// evento. Só consulta — não cria nem altera nada. As quatro perguntas
// prontas preenchem o campo; enviar é o clique dela.

import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

// O modelo às vezes responde em markdown mesmo pedido que não, e a tela
// mostra texto puro: "**Buffet**" apareceria com os asteriscos.
function semMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(\s*)\*\s+/gm, "$1- ");
}

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
  const inputRef = useRef<HTMLInputElement>(null);

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
        setMessages([
          ...novas,
          { role: "assistant", content: semMarkdown(String(data.text ?? "")) },
        ]);
      }
    } catch {
      setErro("não consegui responder agora.");
    } finally {
      setCarregando(false);
      setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function preencher(s: string) {
    setInput(s);
    inputRef.current?.focus();
  }

  return (
    <section
      aria-label="Perguntar sobre este evento"
      style={{
        background: "var(--ev-card-bg)",
        border: "1px solid var(--ev-card-border)",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={16} strokeWidth={1.6} style={{ color: "var(--ev-accent)" }} />
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--ev-text-strong)" }}>
          Perguntar sobre este evento
        </span>
      </div>

      {messages.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUGESTOES.map((s) => {
            const marcada = input === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => preencher(s)}
                className="ev-pilula"
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: `1px solid ${marcada ? "var(--ev-accent)" : "var(--ev-card-border)"}`,
                  background: marcada ? "var(--ev-accent-tint)" : "#fff",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ev-text-body)",
                  cursor: "pointer",
                  transition: "border-color 140ms ease",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}

      {messages.length > 0 && (
        <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ textAlign: m.role === "user" ? "right" : "left" }}>
              <span
                style={{
                  display: "inline-block",
                  maxWidth: "92%",
                  whiteSpace: "pre-wrap",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  lineHeight: 1.45,
                  textAlign: "left",
                  background: m.role === "user" ? "var(--ev-accent)" : "var(--ev-marfim)",
                  color: m.role === "user" ? "#fff" : "var(--ev-text-strong)",
                  border: m.role === "user" ? "none" : "1px solid var(--ev-card-border)",
                }}
              >
                {m.content}
              </span>
            </div>
          ))}
          {carregando && (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ev-text-muted)" }}>consultando o evento…</p>
          )}
          <div ref={fimRef} />
        </div>
      )}

      {erro && <p style={{ margin: 0, fontSize: 12.5, color: "var(--ev-late)" }}>{erro}</p>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && perguntar(input)}
          placeholder="Ex.: o que falta fechar?"
          disabled={carregando}
          className="ev-foco"
          style={{
            flex: 1,
            minWidth: 0,
            height: 40,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid var(--ev-card-border)",
            background: "#fff",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ev-text-strong)",
          }}
        />
        <button
          type="button"
          onClick={() => perguntar(input)}
          disabled={carregando || !input.trim()}
          aria-label="Perguntar"
          className="ev-btn-primario"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "none",
            background: "var(--ev-accent)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            flex: "none",
            cursor: "pointer",
            opacity: carregando || !input.trim() ? 0.5 : 1,
            transition: "background 140ms ease",
          }}
        >
          <Send size={16} strokeWidth={1.8} />
        </button>
      </div>

      <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ev-text-muted)" }}>
        Responde com os dados deste evento. Não altera nada.
      </p>
    </section>
  );
}
