"use client";

// Configurações > Conteúdo da Proposta > "Como funciona".
// Lista editável com reordenação por botões (↑/↓) — a ordem salva é a
// ordem da tela. Salvamento é substituição completa da lista.

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { salvarEtapas } from "@/lib/conteudo-institucional";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none";

type Linha = { key: string; titulo: string; descricao: string };

let seq = 0;
const novaKey = () => `etapa-${++seq}-${Date.now()}`;

export function ProcessoEtapasForm({
  inicial,
}: {
  inicial: { titulo: string; descricao: string | null }[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>(
    inicial.map((e) => ({
      key: novaKey(),
      titulo: e.titulo,
      descricao: e.descricao ?? "",
    }))
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, startTransition] = useTransition();

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= linhas.length) return;
    const copia = [...linhas];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setLinhas(copia);
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const res = await salvarEtapas(
        linhas.map((l) => ({ titulo: l.titulo, descricao: l.descricao }))
      );
      if ("error" in res) {
        setErro(res.error);
        return;
      }
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    });
  }

  return (
    <div className="space-y-3">
      {linhas.length === 0 && (
        <p className="text-sm text-gray-400">
          Nenhuma etapa cadastrada — adicione a primeira.
        </p>
      )}

      {linhas.map((l, i) => (
        <div
          key={l.key}
          className="rounded-lg border border-gray-200 bg-gray-50/60 p-3"
        >
          <div className="flex items-start gap-2">
            <span className="mt-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={l.titulo}
                onChange={(e) =>
                  setLinhas((prev) =>
                    prev.map((x) =>
                      x.key === l.key ? { ...x, titulo: e.target.value } : x
                    )
                  )
                }
                placeholder="Título da etapa (ex.: Briefing)"
                className={inputClass}
              />
              <textarea
                value={l.descricao}
                onChange={(e) =>
                  setLinhas((prev) =>
                    prev.map((x) =>
                      x.key === l.key ? { ...x, descricao: e.target.value } : x
                    )
                  )
                }
                rows={2}
                placeholder="Descrição (opcional)"
                className={inputClass}
              />
            </div>
            <div className="flex flex-shrink-0 flex-col gap-1">
              <button
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                aria-label="Mover para cima"
                className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => mover(i, 1)}
                disabled={i === linhas.length - 1}
                aria-label="Mover para baixo"
                className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30"
              >
                <ChevronDown size={16} />
              </button>
              <button
                onClick={() =>
                  setLinhas((prev) => prev.filter((x) => x.key !== l.key))
                }
                aria-label="Remover etapa"
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() =>
            setLinhas((prev) => [
              ...prev,
              { key: novaKey(), titulo: "", descricao: "" },
            ])
          }
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          <Plus size={15} /> Adicionar etapa
        </button>
        <button
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar etapas"}
        </button>
        {salvo && (
          <span className="text-sm font-medium text-emerald-600">Salvo!</span>
        )}
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
    </div>
  );
}
