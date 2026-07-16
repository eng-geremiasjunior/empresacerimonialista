"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import {
  criarNota,
  excluirNota,
  type NotaEvento,
} from "@/app/(app)/eventos/[id]/notas-actions";
import { useRouter } from "next/navigation";

export function NotasRapidas({
  eventId,
  notas,
  currentUserId,
}: {
  eventId: string;
  notas: NotaEvento[];
  currentUserId: string | null;
}) {
  const router = useRouter();
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
    <section>
      <h2 className="text-sm font-semibold text-gray-900">Notas rápidas</h2>

      <div className="mt-3 flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && salvar()}
          placeholder="Adicionar uma nota…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          onClick={salvar}
          disabled={pending || !texto.trim()}
          className="rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      {erro && <p className="mt-1 text-sm text-rose-600">{erro}</p>}

      {notas.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">
          Nenhuma nota adicionada ainda.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notas.map((n) => (
            <li
              key={n.id}
              className="group flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="whitespace-pre-wrap break-words text-sm text-gray-700">
                  {n.content}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
              {n.author_id === currentUserId && (
                <button
                  onClick={() => remover(n.id)}
                  disabled={pending}
                  aria-label="Excluir nota"
                  className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
