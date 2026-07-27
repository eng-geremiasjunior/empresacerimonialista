"use client";

// Configurações > Proposta > Extras opcionais.
// São os itens que o casal marca na calculadora e somam ao total.

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { salvarExtras, type ExtraEntrada } from "@/lib/proposta-config";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none";

type Linha = ExtraEntrada & { key: string };

let seq = 0;
const novaKey = () => `ext-${++seq}-${Date.now()}`;

export function ExtrasForm({
  inicial,
}: {
  inicial: {
    nome: string;
    descricao: string | null;
    preco: number;
    ativo: boolean;
  }[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>(
    inicial.map((x) => ({
      key: novaKey(),
      nome: x.nome,
      descricao: x.descricao ?? "",
      preco: String(x.preco ?? ""),
      ativo: x.ativo,
    }))
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, startTransition] = useTransition();

  const alterar = (key: string, campo: keyof Linha, valor: string | boolean) =>
    setLinhas((p) => p.map((x) => (x.key === key ? { ...x, [campo]: valor } : x)));

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
      const res = await salvarExtras(linhas.map(({ key, ...r }) => r));
      if ("error" in res) return setErro(res.error);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    });
  }

  return (
    <div className="space-y-3">
      {linhas.length === 0 && (
        <p className="text-sm text-gray-400">
          Nenhum extra cadastrado — a seção não aparece na proposta.
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
              <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                <input
                  value={l.nome}
                  onChange={(e) => alterar(l.key, "nome", e.target.value)}
                  placeholder="Nome (ex.: Cerimônia no campo)"
                  className={inputClass}
                />
                <input
                  value={l.preco}
                  onChange={(e) => alterar(l.key, "preco", e.target.value)}
                  inputMode="decimal"
                  placeholder="600"
                  className={inputClass}
                />
              </div>
              <input
                value={l.descricao}
                onChange={(e) => alterar(l.key, "descricao", e.target.value)}
                placeholder="Descrição curta (opcional)"
                className={inputClass}
              />
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
                onClick={() => setLinhas((p) => p.filter((x) => x.key !== l.key))}
                aria-label="Remover extra"
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
            setLinhas((p) => [
              ...p,
              { key: novaKey(), nome: "", descricao: "", preco: "", ativo: true },
            ])
          }
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          <Plus size={15} /> Adicionar extra
        </button>
        <button
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar extras"}
        </button>
        {salvo && <span className="text-sm font-medium text-emerald-600">Salvo!</span>}
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
    </div>
  );
}
