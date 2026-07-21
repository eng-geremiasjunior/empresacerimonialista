"use client";

// Mini-modal de adição de item ao orçamento: "Usar modelo cadastrado"
// (calcula na hora com o nº de convidados) ou "Item avulso" (valor manual).

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import {
  calcularValorModelo,
  formatBRL,
  valorResumo,
  type ModeloPrecificacao,
} from "@/lib/modelos-precificacao";
import type { ItemDraft } from "@/lib/orcamentos";

export function AdicionarItemModal({
  modelos,
  convidados,
  onAdicionar,
  onClose,
}: {
  modelos: ModeloPrecificacao[];
  convidados: number | null;
  onAdicionar: (item: Omit<ItemDraft, "draftId" | "ordem">) => void;
  onClose: () => void;
}) {
  const [aba, setAba] = useState<"modelo" | "avulso">("modelo");
  const [busca, setBusca] = useState("");

  // avulso
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return modelos.filter((m) => !q || m.nome.toLowerCase().includes(q));
  }, [modelos, busca]);

  function adicionarModelo(m: ModeloPrecificacao) {
    const n = convidados ?? 0;
    const valorCalc = calcularValorModelo(m, n);
    onAdicionar({
      modelo_precificacao_id: m.id,
      nome: m.nome,
      descricao: m.descricao,
      tipo_calculo: m.tipo_calculo,
      valor_unitario:
        m.tipo_calculo === "por_convidado"
          ? Number(m.valor_por_convidado) || 0
          : null,
      quantidade_convidados_aplicada:
        m.tipo_calculo === "por_convidado" ? n : null,
      taxa_fixa:
        m.tipo_calculo === "por_convidado"
          ? Number(m.taxa_fixa_adicional) || 0
          : 0,
      valor_calculado: valorCalc,
    });
    onClose();
  }

  function adicionarAvulso() {
    const v = Number(valor.replace(",", "."));
    if (!nome.trim() || !Number.isFinite(v) || v < 0) return;
    onAdicionar({
      modelo_precificacao_id: null,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      tipo_calculo: "manual",
      valor_unitario: null,
      quantidade_convidados_aplicada: null,
      taxa_fixa: 0,
      valor_calculado: v,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Adicionar item
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setAba("modelo")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              aba === "modelo"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 text-gray-700 hover:border-gray-400"
            }`}
          >
            Usar modelo cadastrado
          </button>
          <button
            onClick={() => setAba("avulso")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              aba === "avulso"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-300 text-gray-700 hover:border-gray-400"
            }`}
          >
            Item avulso
          </button>
        </div>

        {aba === "modelo" ? (
          <div>
            <div className="relative mb-3">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar modelo…"
                autoFocus
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>

            {convidados == null && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Informe o número de convidados na seção 1 — modelos “por
                convidado” serão calculados com 0 até lá.
              </p>
            )}

            {filtrados.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                {modelos.length === 0
                  ? "Nenhum modelo ativo cadastrado."
                  : "Nenhum modelo encontrado."}
              </p>
            ) : (
              <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                {filtrados.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => adicionarModelo(m)}
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-gray-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-900">
                          {m.nome}
                          {m.categoria && (
                            <span className="ml-2 rounded border border-gray-200 px-1.5 py-0.5 text-[11px] font-normal text-gray-500">
                              {categoriaLabel(m.categoria)}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {valorResumo(m)}
                        </span>
                      </span>
                      <span className="flex-shrink-0 text-sm font-semibold text-gray-900">
                        {formatBRL(calcularValorModelo(m, convidados ?? 0))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome *
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder='Ex.: "Decoração personalizada"'
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição{" "}
                <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Valor (R$) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ex.: 2000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <button
              onClick={adicionarAvulso}
              disabled={!nome.trim() || !valor}
              className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
            >
              Adicionar item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
