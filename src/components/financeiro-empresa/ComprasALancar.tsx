"use client";

// Compras de estoque a lançar (184): a compra registrada no Estoque
// sugere a despesa; ela confirma com um clique. Nada entra sozinho.
// Só aparece quando existe compra esperando.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CompraDoEstoque } from "@/lib/supabase/estoque";
import { lancarCompra, marcarLancadaFora } from "@/app/(app)/estoque/actions";
import { formatCurrency, formatDate } from "@/lib/format";

export function ComprasALancar({ compras }: { compras: CompraDoEstoque[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  if (compras.length === 0) return null;

  function rodar(fn: () => Promise<{ error?: string } & Record<string, unknown>>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (typeof r.error === "string") setErro(r.error);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Compras de estoque a lançar</h2>
        <Link href="/estoque/compras" className="text-xs text-gray-500 underline underline-offset-2">
          ver as compras
        </Link>
      </div>
      <ul className="divide-y divide-gray-100">
        {compras.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <div className="min-w-[200px] flex-1">
              <div className="text-sm font-medium text-gray-900">
                {formatDate(c.data)}
                {c.fornecedorNome ? ` · ${c.fornecedorNome}` : ""}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {c.itens} {c.itens === 1 ? "item" : "itens"}
                {c.resumo ? ` · ${c.resumo}` : ""}
              </div>
            </div>
            <div className="text-sm font-medium tabular-nums text-gray-900">{formatCurrency(c.total)}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => rodar(() => lancarCompra(c.id))}
                disabled={pendente}
                className="h-9 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white disabled:opacity-50"
              >
                Lançar
              </button>
              <button
                onClick={() => rodar(() => marcarLancadaFora(c.id))}
                disabled={pendente}
                className="text-xs text-gray-500 underline underline-offset-2 disabled:opacity-50"
              >
                já lancei por fora
              </button>
            </div>
          </li>
        ))}
      </ul>
      {erro && <p className="px-4 pb-3 text-sm text-red-700">{erro}</p>}
    </section>
  );
}
