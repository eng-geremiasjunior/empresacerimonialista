"use client";

// "Observações do evento" (Modelo A): a caixa marfim no pé das
// Informações do evento. Cada observação é uma linha; o ✎ abre o campo
// para escrever outra. Substitui as Notas rápidas — mesmas ações
// (criarNota / excluirNota), outra roupa.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, X } from "lucide-react";
import {
  criarNota,
  excluirNota,
  type NotaEvento,
} from "@/app/(app)/eventos/[id]/notas-actions";

export function ObservacoesDoEvento({
  eventId,
  notas,
  currentUserId,
}: {
  eventId: string;
  notas: NotaEvento[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [escrevendo, setEscrevendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar() {
    if (!texto.trim()) return;
    setErro(null);
    startTransition(async () => {
      const r = await criarNota(eventId, texto);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setTexto("");
      setEscrevendo(false);
      router.refresh();
    });
  }

  function remover(id: string) {
    startTransition(async () => {
      await excluirNota(eventId, id);
      router.refresh();
    });
  }

  return (
    <div
      id="observacoes"
      style={{
        margin: "0 24px 24px",
        padding: "16px 18px",
        borderRadius: 12,
        background: "var(--ev-marfim)",
        border: "1px solid var(--ev-card-border)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        scrollMarginTop: 90,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--ev-text-strong)" }}>
          Observações do evento
        </span>
        <button
          type="button"
          onClick={() => setEscrevendo((v) => !v)}
          aria-label={escrevendo ? "Fechar" : "Adicionar observação"}
          title={escrevendo ? "Fechar" : "Adicionar observação"}
          className="rounded p-1 text-[color:var(--ev-text-faint)] hover:bg-black/5 hover:text-[color:var(--ev-text-body)]"
        >
          {escrevendo ? <X size={14} /> : <Pencil size={14} />}
        </button>
      </div>

      {escrevendo && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            autoFocus
            placeholder="Anote algo sobre este evento…"
            className="ev-foco"
            style={{
              flex: 1,
              minWidth: 0,
              height: 38,
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
            onClick={salvar}
            disabled={pending || !texto.trim()}
            className="ev-btn-primario"
            style={{
              height: 38,
              padding: "0 14px",
              borderRadius: 10,
              border: "none",
              background: "var(--ev-accent)",
              color: "#fff",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              opacity: pending || !texto.trim() ? 0.5 : 1,
            }}
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}
      {erro && <p style={{ margin: 0, fontSize: 12.5, color: "var(--ev-late)" }}>{erro}</p>}

      {notas.length === 0 ? (
        <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.6, color: "var(--ev-text-muted)" }}>
          Nenhuma observação ainda.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {notas.map((n) => (
            <li
              key={n.id}
              className="group"
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--ev-text-body)",
              }}
            >
              <span style={{ minWidth: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {n.content}
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ev-text-faint)", whiteSpace: "nowrap" }}>
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </span>
              {n.author_id === currentUserId && (
                <button
                  type="button"
                  onClick={() => remover(n.id)}
                  disabled={pending}
                  aria-label="Excluir observação"
                  className="shrink-0 rounded p-1 text-[color:var(--ev-text-faint)] opacity-0 transition-opacity hover:text-[color:var(--ev-late)] group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
