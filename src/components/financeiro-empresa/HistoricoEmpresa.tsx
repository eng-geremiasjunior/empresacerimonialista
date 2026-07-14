"use client";

// Histórico de lançamentos da empresa: filtros por tipo/categoria/período
// na URL (padrão das listagens de Eventos/Tarefas) + paginação + ações.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { LancamentoModal } from "@/components/financeiro-empresa/LancamentoModal";
import { excluirLancamentoEmpresa } from "@/app/(app)/financeiro/actions";
import {
  buildFinanceiroEmpresaHref,
  type FinanceiroEmpresaParams,
} from "@/lib/financeiro-empresa-url";
import {
  DESPESA_CATEGORIAS,
  RECEITA_CATEGORIAS,
  categoriaLabel,
  type BusinessTransacao,
} from "@/lib/financeiro-empresa-shared";
import { formatCurrency, formatDate } from "@/lib/format";

const selectClass =
  "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none";

// União das categorias (com labels distintos para "outro")
const TODAS_CATEGORIAS: [string, string][] = [
  ...Object.entries(DESPESA_CATEGORIAS).filter(([slug]) => slug !== "outro"),
  ...Object.entries(RECEITA_CATEGORIAS).filter(([slug]) => slug !== "outro"),
  ["outro", "Outro"],
];

export function HistoricoEmpresa({
  rows,
  total,
  current,
}: {
  rows: BusinessTransacao[];
  total: number;
  current: FinanceiroEmpresaParams;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<BusinessTransacao | null>(null);
  const [pending, startTransition] = useTransition();

  const perPage = Number(current.perPage) || 20;
  const page = Number(current.page) || 1;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function setFiltro(patch: Partial<FinanceiroEmpresaParams>) {
    router.push(buildFinanceiroEmpresaHref(current, { ...patch, page: "1" }));
  }

  function excluir(id: string) {
    startTransition(async () => {
      await excluirLancamentoEmpresa(id);
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Histórico</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={current.tipo}
            onChange={(e) => setFiltro({ tipo: e.target.value })}
            className={selectClass}
          >
            <option value="">Receitas e despesas</option>
            <option value="receita">Só receitas</option>
            <option value="despesa">Só despesas</option>
          </select>
          <select
            value={current.categoria}
            onChange={(e) => setFiltro({ categoria: e.target.value })}
            className={selectClass}
          >
            <option value="">Todas as categorias</option>
            {TODAS_CATEGORIAS.map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={current.periodo}
            onChange={(e) => setFiltro({ periodo: e.target.value })}
            className={selectClass}
          >
            <option value="todas">Todo o período</option>
            <option value="mes">Este mês</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Nenhum lançamento encontrado com estes filtros.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="pb-2 pr-3">Descrição</th>
                <th className="pb-2 pr-3">Categoria</th>
                <th className="pb-2 pr-3 text-right">Valor</th>
                <th className="pb-2 pr-3">Data</th>
                <th className="pb-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 pr-3 text-gray-900">
                    {r.description ?? categoriaLabel(r.type, r.category)}
                    {r.recurring && (
                      <span className="ml-2 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                        recorrente
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.type === "receita"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {categoriaLabel(r.type, r.category)}
                    </span>
                  </td>
                  <td
                    className={`py-2.5 pr-3 text-right font-medium tabular-nums ${
                      r.type === "receita" ? "text-emerald-700" : "text-gray-900"
                    }`}
                  >
                    {r.type === "receita" ? "+" : "−"} {formatCurrency(r.value)}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-500">
                    {r.due_date ? formatDate(r.due_date) : "—"}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditando(r)}
                        aria-label="Editar"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => excluir(r.id)}
                        disabled={pending}
                        aria-label="Excluir"
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>
            {total} lançamento{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-1">
            <Link
              aria-disabled={page <= 1}
              href={buildFinanceiroEmpresaHref(current, {
                page: String(Math.max(1, page - 1)),
              })}
              className={`rounded p-1.5 hover:bg-gray-100 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="px-1 tabular-nums">
              {page} / {totalPages}
            </span>
            <Link
              aria-disabled={page >= totalPages}
              href={buildFinanceiroEmpresaHref(current, {
                page: String(Math.min(totalPages, page + 1)),
              })}
              className={`rounded p-1.5 hover:bg-gray-100 ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {editando && (
        <LancamentoModal
          tipo={editando.type}
          editar={editando}
          onClose={() => setEditando(null)}
        />
      )}
    </section>
  );
}
