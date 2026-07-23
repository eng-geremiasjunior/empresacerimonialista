// Resumo do que foi vendido na proposta aprovada que originou o evento.
//
// É INFORMATIVO: não soma no Financeiro. As receitas reais são as parcelas
// geradas pela cerimonialista. Por isso os valores aqui aparecem em tom
// discreto e o bloco tem borda tracejada — precisa parecer anotação, não
// lançamento.

import { FileText } from "lucide-react";
import Link from "next/link";
import { formatBRL } from "@/lib/orcamentos";

export type ItemOrcamentoOriginal = {
  nome: string;
  descricao: string | null;
  valor_calculado: number;
};

export function ItensOrcamentoOriginal({
  orcamentoId,
  itens,
  valorTotal,
}: {
  orcamentoId: string;
  itens: ItemOrcamentoOriginal[];
  valorTotal: number;
}) {
  if (itens.length === 0) return null;

  return (
    <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-5">
      <div className="mb-1 flex items-center gap-2">
        <FileText size={16} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">
          Itens do orçamento original
        </h2>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        O que foi vendido na proposta aprovada. Serve de referência e{" "}
        <strong className="font-semibold">não entra no cálculo</strong> do
        Financeiro — as receitas do evento são as parcelas acima.
      </p>

      <ul className="divide-y divide-gray-200">
        {itens.map((item, i) => (
          <li
            key={`${item.nome}-${i}`}
            className="flex items-start justify-between gap-4 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm text-gray-700">{item.nome}</p>
              {item.descricao && (
                <p className="text-xs text-gray-400">{item.descricao}</p>
              )}
            </div>
            <span className="flex-shrink-0 text-sm text-gray-500">
              {formatBRL(Number(item.valor_calculado))}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Total da proposta
        </span>
        <span className="text-sm font-semibold text-gray-600">
          {formatBRL(Number(valorTotal))}
        </span>
      </div>

      <Link
        href={`/orcamentos/${orcamentoId}`}
        className="mt-3 inline-block text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        Ver orçamento completo →
      </Link>
    </section>
  );
}
