"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  MoreVertical,
  Pencil,
  Star,
} from "lucide-react";
import { FornecedorFormModal } from "@/components/fornecedores/FornecedorFormModal";
import { setStatusFornecedor } from "@/app/(app)/fornecedores/actions";
import {
  buildFornecedoresHref,
  type FornecedoresParams,
} from "@/lib/fornecedores-url";
import {
  FAIXA_PRECO_CIFRAO,
  STATUS_BADGE,
  STATUS_LABELS,
  TIPO_OPERACIONAL_BADGE,
  TIPO_OPERACIONAL_LABELS,
  categoriaLabel,
  waLink,
  type Fornecedor,
} from "@/lib/fornecedores-shared";

function MenuAcoes({
  f,
  onEditar,
}: {
  f: Fornecedor;
  onEditar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const inativo = f.status === "inativo";

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
        <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <Link
            href={`/fornecedores/${f.id}`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Eye size={14} /> Ver detalhes
          </Link>
          <button
            onClick={() => {
              setAberto(false);
              onEditar();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} /> Editar
          </button>
          <button
            onClick={() => {
              setAberto(false);
              startTransition(async () => {
                await setStatusFornecedor(f.id, inativo ? "ativo" : "inativo");
              });
            }}
            className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            {inativo ? "Ativar" : "Desativar"}
          </button>
        </div>
      )}
    </div>
  );
}

export function FornecedoresTable({
  rows,
  total,
  current,
}: {
  rows: Fornecedor[];
  total: number;
  current: FornecedoresParams;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<Fornecedor | null>(null);

  const perPage = Number(current.perPage) || 20;
  const page = Number(current.page) || 1;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2.5 font-medium">Nome</th>
              <th className="px-4 py-2.5 font-medium">Categorias</th>
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Preço</th>
              <th className="px-4 py-2.5 font-medium">Contato</th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((f) => {
              const wa = waLink(f.whatsapp ?? f.phone);
              return (
                <tr
                  key={f.id}
                  onClick={() => router.push(`/fornecedores/${f.id}`)}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    f.status === "inativo" ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{f.name}</p>
                    {f.descricao && (
                      <p className="max-w-[240px] truncate text-xs text-gray-500">
                        {f.descricao}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {f.categorias.length === 0 ? (
                        <span className="text-xs text-gray-300">—</span>
                      ) : (
                        f.categorias.map((c) => (
                          <span
                            key={c}
                            className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-600"
                          >
                            {categoriaLabel(c)}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TIPO_OPERACIONAL_BADGE[f.tipo_operacional]}`}
                    >
                      {TIPO_OPERACIONAL_LABELS[f.tipo_operacional]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[f.status]}`}
                    >
                      {f.status === "favorito" && <Star size={11} className="fill-current" />}
                      {STATUS_LABELS[f.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {f.faixa_preco ? FAIXA_PRECO_CIFRAO[f.faixa_preco] : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {f.phone || f.whatsapp ? (
                      <span className="flex items-center gap-2 text-gray-600">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="WhatsApp"
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}
                        <span className="whitespace-nowrap">
                          {f.whatsapp ?? f.phone}
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <MenuAcoes f={f} onEditar={() => setEditando(f)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5 text-sm text-gray-500">
          <span>
            {total} fornecedor{total === 1 ? "" : "es"}
          </span>
          <div className="flex items-center gap-1">
            <Link
              aria-disabled={page <= 1}
              href={buildFornecedoresHref(current, { page: String(Math.max(1, page - 1)) })}
              className={`rounded p-1.5 hover:bg-gray-100 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              <ChevronLeft size={16} />
            </Link>
            <span className="px-1 tabular-nums">
              {page} / {totalPages}
            </span>
            <Link
              aria-disabled={page >= totalPages}
              href={buildFornecedoresHref(current, { page: String(Math.min(totalPages, page + 1)) })}
              className={`rounded p-1.5 hover:bg-gray-100 ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {editando && (
        <FornecedorFormModal editar={editando} onClose={() => setEditando(null)} />
      )}
    </div>
  );
}
