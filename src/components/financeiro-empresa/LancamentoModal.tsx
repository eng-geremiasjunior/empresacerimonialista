"use client";

// Modal genérico de lançamento da empresa: criação e edição de
// receitas/despesas de business_transactions.

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  criarLancamentoEmpresa,
  editarLancamentoEmpresa,
  type LancamentoInput,
} from "@/app/(app)/financeiro/actions";
import {
  DESPESA_CATEGORIAS,
  RECEITA_CATEGORIAS,
  type BusinessTransacao,
} from "@/lib/financeiro-empresa-shared";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export function LancamentoModal({
  tipo,
  categoriaFixa,
  editar,
  onClose,
}: {
  tipo: "receita" | "despesa";
  categoriaFixa?: string; // trava a categoria (ex.: "+ Outra despesa" => outro)
  editar?: BusinessTransacao; // presente = modo edição
  onClose: () => void;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const categorias = tipo === "receita" ? RECEITA_CATEGORIAS : DESPESA_CATEGORIAS;

  const [categoria, setCategoria] = useState(
    editar?.category ?? categoriaFixa ?? Object.keys(categorias)[0]
  );
  const [descricao, setDescricao] = useState(editar?.description ?? "");
  const [valor, setValor] = useState(editar ? String(editar.value) : "");
  const [data, setData] = useState(editar?.due_date ?? hoje);
  const [recorrente, setRecorrente] = useState(editar?.recurring ?? false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    const input: LancamentoInput = {
      type: tipo,
      category: categoria,
      description: descricao || null,
      value: Number(valor.replace(",", ".")),
      due_date: data,
      recurring: recorrente,
    };
    startTransition(async () => {
      const r = editar
        ? await editarLancamentoEmpresa(editar.id, input)
        : await criarLancamentoEmpresa(input);
      if (r.error) setErro(r.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {editar
              ? "Editar lançamento"
              : tipo === "receita"
                ? "Nova receita"
                : "Nova despesa"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {!categoriaFixa && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className={inputClass}
              >
                {Object.entries(categorias).map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Descrição {tipo === "despesa" && categoriaFixa ? "" : "(opcional)"}
            </label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={
                tipo === "receita"
                  ? "Ex.: consultoria para colega cerimonialista"
                  : "Ex.: manutenção do carro"
              }
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Valor (R$)
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Data
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {tipo === "despesa" && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
              />
              Despesa recorrente (todo mês)
            </label>
          )}

          {erro && <p className="text-sm text-rose-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
