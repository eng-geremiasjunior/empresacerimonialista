"use client";

// Configurações > Conteúdo da Proposta > Perguntas frequentes.
// Pergunta + resposta, reordenação por botões e toggle ativo/inativo
// (inativa some da proposta sem perder o texto).

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { salvarFaq } from "@/lib/conteudo-institucional";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none";

type Linha = {
  key: string;
  pergunta: string;
  resposta: string;
  ativo: boolean;
};

let seq = 0;
const novaKey = () => `faq-${++seq}-${Date.now()}`;

export function FaqForm({
  inicial,
}: {
  inicial: { pergunta: string; resposta: string; ativo: boolean }[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>(
    inicial.map((f) => ({
      key: novaKey(),
      pergunta: f.pergunta,
      resposta: f.resposta,
      ativo: f.ativo,
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
      const res = await salvarFaq(
        linhas.map((l) => ({
          pergunta: l.pergunta,
          resposta: l.resposta,
          ativo: l.ativo,
        }))
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
          Nenhuma pergunta cadastrada — adicione a primeira.
        </p>
      )}

      {linhas.map((l, i) => (
        <div
          key={l.key}
          className={`rounded-lg border border-gray-200 p-3 ${
            l.ativo ? "bg-gray-50/60" : "bg-gray-100/60 opacity-70"
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={l.pergunta}
                onChange={(e) =>
                  setLinhas((prev) =>
                    prev.map((x) =>
                      x.key === l.key ? { ...x, pergunta: e.target.value } : x
                    )
                  )
                }
                placeholder="Pergunta"
                className={inputClass}
              />
              <textarea
                value={l.resposta}
                onChange={(e) =>
                  setLinhas((prev) =>
                    prev.map((x) =>
                      x.key === l.key ? { ...x, resposta: e.target.value } : x
                    )
                  )
                }
                rows={2}
                placeholder="Resposta"
                className={inputClass}
              />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={l.ativo}
                  onChange={(e) =>
                    setLinhas((prev) =>
                      prev.map((x) =>
                        x.key === l.key ? { ...x, ativo: e.target.checked } : x
                      )
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                />
                Exibir na proposta
              </label>
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
                aria-label="Remover pergunta"
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
              { key: novaKey(), pergunta: "", resposta: "", ativo: true },
            ])
          }
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          <Plus size={15} /> Adicionar pergunta
        </button>
        <button
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar perguntas"}
        </button>
        {salvo && (
          <span className="text-sm font-medium text-emerald-600">Salvo!</span>
        )}
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
    </div>
  );
}
