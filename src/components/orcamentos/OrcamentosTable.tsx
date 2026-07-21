"use client";

// Listagem de Orçamentos: filtros por URL (padrão do sistema), tabela e
// menu de ações por linha. Paginação server-side.

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import {
  duplicarOrcamento,
  excluirOrcamento,
} from "@/app/(app)/orcamentos/actions";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import {
  ORCAMENTO_STATUS_BADGE,
  ORCAMENTO_STATUS_LABELS,
  formatBRL,
  formatDateBR,
  validadeVencida,
  type Orcamento,
  type OrcamentoStatus,
} from "@/lib/orcamentos";

type Current = { busca: string; status: string; tipo: string; page: number };

function buildHref(c: Current, patch: Partial<Current>): string {
  const merged = { ...c, ...patch };
  const p = new URLSearchParams();
  if (merged.busca) p.set("busca", merged.busca);
  if (merged.status) p.set("status", merged.status);
  if (merged.tipo) p.set("tipo", merged.tipo);
  if (merged.page > 1) p.set("page", String(merged.page));
  const qs = p.toString();
  return qs ? `/orcamentos?${qs}` : "/orcamentos";
}

function MenuAcoes({ o }: { o: Orcamento }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const rascunho = o.status === "rascunho";

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
        setErro(null);
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setAberto((v) => !v)}
        disabled={pending}
        aria-label="Ações"
        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
      >
        <MoreVertical size={16} />
      </button>
      {aberto && (
        <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {rascunho && (
            <Link
              href={`/orcamentos/${o.id}/editar`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil size={14} /> Editar
            </Link>
          )}
          <Link
            href={`/orcamentos/${o.id}`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Eye size={14} /> Ver proposta
          </Link>
          <button
            onClick={() =>
              startTransition(async () => {
                const res = await duplicarOrcamento(o.id);
                if ("error" in res) setErro(res.error);
                else router.push(`/orcamentos/${res.id}/editar`);
              })
            }
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Copy size={14} /> Duplicar
          </button>
          <button
            disabled={!rascunho}
            title={!rascunho ? "Só rascunhos podem ser excluídos" : undefined}
            onClick={() => {
              if (!confirm(`Excluir o orçamento de "${o.contato_nome}"?`)) return;
              startTransition(async () => {
                const res = await excluirOrcamento(o.id);
                if ("error" in res) setErro(res.error);
                else setAberto(false);
              });
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
          >
            <Trash2 size={14} /> Excluir
          </button>
          {erro && <p className="px-3 py-1.5 text-xs text-red-600">{erro}</p>}
        </div>
      )}
    </div>
  );
}

export function OrcamentosTable({
  rows,
  total,
  perPage,
  current,
}: {
  rows: Orcamento[];
  total: number;
  perPage: number;
  current: Current;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(current.busca);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // Busca com debounce leve via Enter/blur (padrão simples do sistema).
  function aplicarBusca() {
    router.push(buildHref(current, { busca, page: 1 }));
  }

  return (
    <div>
      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onBlur={aplicarBusca}
            onKeyDown={(e) => e.key === "Enter" && aplicarBusca()}
            placeholder="Buscar por contato…"
            className="w-56 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <select
          value={current.status}
          onChange={(e) =>
            router.push(buildHref(current, { status: e.target.value, page: 1 }))
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">Todos os status</option>
          {Object.entries(ORCAMENTO_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={current.tipo}
          onChange={(e) =>
            router.push(buildHref(current, { tipo: e.target.value, page: 1 }))
          }
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-gray-600">
            {total === 0
              ? "Nenhum orçamento ainda."
              : "Nenhum orçamento corresponde aos filtros."}
          </p>
          {total === 0 && (
            <Link
              href="/orcamentos/novo"
              className="mt-4 inline-block text-sm font-medium text-gray-900 underline underline-offset-4 hover:no-underline"
            >
              Criar o primeiro orçamento
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-2.5 font-medium">Contato</th>
                  <th className="px-4 py-2.5 font-medium">Tipo de evento</th>
                  <th className="px-4 py-2.5 font-medium">Data prevista</th>
                  <th className="px-4 py-2.5 font-medium">Valor total</th>
                  <th className="px-4 py-2.5 font-medium">Validade</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((o) => {
                  const vencido =
                    validadeVencida(o) &&
                    !["aprovado", "recusado"].includes(o.status);
                  const badge =
                    ORCAMENTO_STATUS_BADGE[o.status as OrcamentoStatus];
                  return (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/orcamentos/${o.id}`)}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {o.contato_nome}
                        </p>
                        {(o.contato_telefone || o.contato_email) && (
                          <p className="max-w-[220px] truncate text-xs text-gray-500">
                            {o.contato_telefone || o.contato_email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {EVENT_TYPE_LABELS[o.tipo_evento as EventType] ??
                          o.tipo_evento}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDateBR(o.data_evento)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatBRL(Number(o.valor_total))}
                      </td>
                      <td className="px-4 py-3">
                        {vencido ? (
                          <span className="text-xs font-medium text-red-500">
                            Expirado em {formatDateBR(o.data_validade)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Válido até {formatDateBR(o.data_validade)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${badge.pill}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${badge.dot}`}
                          />
                          {ORCAMENTO_STATUS_LABELS[o.status as OrcamentoStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <MenuAcoes o={o} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5 text-sm text-gray-500">
              <span>
                Página {current.page} de {totalPages} · {total} orçamento
                {total === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={current.page <= 1}
                  onClick={() =>
                    router.push(buildHref(current, { page: current.page - 1 }))
                  }
                  className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={current.page >= totalPages}
                  onClick={() =>
                    router.push(buildHref(current, { page: current.page + 1 }))
                  }
                  className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="Próxima página"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
