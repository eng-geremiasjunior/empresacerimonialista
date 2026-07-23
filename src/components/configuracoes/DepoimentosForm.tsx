"use client";

// Configurações > Conteúdo da Proposta > Depoimentos.
// Mesmo padrão do FAQ: lista editável, reordenação por botões e toggle
// "Exibir na proposta" (inativo some da proposta sem perder o texto).

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { salvarDepoimentos } from "@/lib/conteudo-institucional";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none";

type Linha = {
  key: string;
  texto: string;
  autor: string;
  contexto: string;
  ativo: boolean;
};

let seq = 0;
const novaKey = () => `dep-${++seq}-${Date.now()}`;

export function DepoimentosForm({
  inicial,
}: {
  inicial: { texto: string; autor: string; contexto: string | null; ativo: boolean }[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>(
    inicial.map((d) => ({
      key: novaKey(),
      texto: d.texto,
      autor: d.autor,
      contexto: d.contexto ?? "",
      ativo: d.ativo,
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

  function alterar(key: string, campo: keyof Linha, valor: string | boolean) {
    setLinhas((prev) =>
      prev.map((x) => (x.key === key ? { ...x, [campo]: valor } : x))
    );
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const res = await salvarDepoimentos(
        linhas.map((l) => ({
          texto: l.texto,
          autor: l.autor,
          contexto: l.contexto,
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
          Nenhum depoimento cadastrado. Adicione falas de clientes reais — a
          seção só aparece na proposta quando houver ao menos um ativo.
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
              <textarea
                value={l.texto}
                onChange={(e) => alterar(l.key, "texto", e.target.value)}
                rows={2}
                placeholder="O que o cliente disse"
                className={inputClass}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={l.autor}
                  onChange={(e) => alterar(l.key, "autor", e.target.value)}
                  placeholder="Quem falou (ex.: Mariana & Felipe)"
                  className={inputClass}
                />
                <input
                  value={l.contexto}
                  onChange={(e) => alterar(l.key, "contexto", e.target.value)}
                  placeholder="Contexto (ex.: Casamento em 2024)"
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={l.ativo}
                  onChange={(e) => alterar(l.key, "ativo", e.target.checked)}
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
                aria-label="Remover depoimento"
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
              { key: novaKey(), texto: "", autor: "", contexto: "", ativo: true },
            ])
          }
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          <Plus size={15} /> Adicionar depoimento
        </button>
        <button
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar depoimentos"}
        </button>
        {salvo && (
          <span className="text-sm font-medium text-emerald-600">Salvo!</span>
        )}
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
    </div>
  );
}
