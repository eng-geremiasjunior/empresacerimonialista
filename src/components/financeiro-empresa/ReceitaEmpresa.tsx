"use client";

// Seção "Receita" da empresa: lançamentos do mês, editáveis, com botão
// "+ Nova receita" e o atalho "Puxar receita dos eventos do mês" (soma o
// que já foi recebido nos eventos e grava como lançamento próprio).

import { useState, useTransition } from "react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import { LancamentoModal } from "@/components/financeiro-empresa/LancamentoModal";
import {
  excluirLancamentoEmpresa,
  puxarReceitaEventosMes,
} from "@/app/(app)/financeiro/actions";
import {
  categoriaLabel,
  type BusinessTransacao,
} from "@/lib/financeiro-empresa-shared";
import { formatCurrency, formatDate } from "@/lib/format";

export function ReceitaEmpresa({ receitas }: { receitas: BusinessTransacao[] }) {
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<BusinessTransacao | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function puxarDosEventos() {
    setMsg(null);
    setErro(null);
    startTransition(async () => {
      const r = await puxarReceitaEventosMes();
      if (r.error) setErro(r.error);
      else
        setMsg(
          `Receita de ${formatCurrency(r.valor ?? 0)} registrada a partir dos eventos.`
        );
    });
  }

  function excluir(id: string) {
    startTransition(async () => {
      await excluirLancamentoEmpresa(id);
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Receita</h2>
          <p className="text-xs text-gray-500">Lançamentos deste mês</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={puxarDosEventos}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-60"
          >
            <Download size={14} />
            Puxar receita dos eventos do mês
          </button>
          <button
            onClick={() => setNovo(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Plus size={14} />
            Nova receita
          </button>
        </div>
      </div>

      {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
      {erro && <p className="mt-3 text-sm text-rose-600">{erro}</p>}

      {receitas.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Nenhuma receita lançada este mês.
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
              {receitas.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 pr-3 text-gray-900">
                    {r.description ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {categoriaLabel("receita", r.category)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-gray-900">
                    {formatCurrency(r.value)}
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

      {novo && <LancamentoModal tipo="receita" onClose={() => setNovo(false)} />}
      {editando && (
        <LancamentoModal
          tipo="receita"
          editar={editando}
          onClose={() => setEditando(null)}
        />
      )}
    </section>
  );
}
