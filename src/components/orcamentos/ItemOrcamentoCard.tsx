"use client";

// Card de um item na montagem do orçamento: nome, descrição do cálculo,
// valor editável (para desconto pontual) e remoção.

import { X } from "lucide-react";
import {
  descricaoCalculoItem,
  formatBRL,
  type ItemDraft,
} from "@/lib/orcamentos";

export function ItemOrcamentoCard({
  item,
  onRemover,
  onValorManual,
}: {
  item: ItemDraft;
  onRemover: () => void;
  onValorManual: (novoValor: number) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{item.nome}</p>
        <p className="text-xs text-gray-500">{descricaoCalculoItem(item)}</p>
        {item.descricao && (
          <p className="mt-0.5 max-w-[380px] truncate text-xs text-gray-400">
            {item.descricao}
          </p>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <input
          type="number"
          min={0}
          step="0.01"
          value={item.valor_calculado}
          onChange={(e) => onValorManual(Number(e.target.value) || 0)}
          aria-label={`Valor de ${item.nome}`}
          className="w-28 rounded-lg border border-gray-300 px-2.5 py-1.5 text-right text-sm font-medium text-gray-900 focus:border-gray-500 focus:outline-none"
        />
        <span className="hidden text-xs text-gray-400 sm:inline">
          {formatBRL(item.valor_calculado)}
        </span>
        <button
          onClick={onRemover}
          aria-label={`Remover ${item.nome}`}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
