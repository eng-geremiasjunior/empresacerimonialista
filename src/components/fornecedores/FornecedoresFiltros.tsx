"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  buildFornecedoresHref,
  type FornecedoresParams,
} from "@/lib/fornecedores-url";
import {
  FAIXA_PRECO_CIFRAO,
  STATUS_LABELS,
  TIPO_OPERACIONAL_LABELS,
  categoriaLabel,
} from "@/lib/fornecedores-shared";

function Chip({
  ativo,
  href,
  children,
}: {
  ativo: boolean;
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        ativo
          ? "bg-gray-900 text-white"
          : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

export function FornecedoresFiltros({
  current,
  categoriasDisponiveis,
}: {
  current: FornecedoresParams;
  categoriasDisponiveis: string[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(current.q);

  const categoriasSel = current.categoria
    ? current.categoria.split(",").filter(Boolean)
    : [];

  function nav(patch: Partial<FornecedoresParams>) {
    router.push(buildFornecedoresHref(current, { ...patch, page: "1" }));
  }

  function toggleCategoria(slug: string) {
    const next = categoriasSel.includes(slug)
      ? categoriasSel.filter((s) => s !== slug)
      : [...categoriasSel, slug];
    nav({ categoria: next.join(",") });
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          nav({ q: busca });
        }}
        className="relative max-w-md"
      >
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou descrição…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </form>

      {/* Tipo operacional */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">Tipo:</span>
        <Chip ativo={!current.tipo} href={buildFornecedoresHref(current, { tipo: "", page: "1" })}>
          Todos
        </Chip>
        {Object.entries(TIPO_OPERACIONAL_LABELS).map(([v, l]) => (
          <Chip
            key={v}
            ativo={current.tipo === v}
            href={buildFornecedoresHref(current, { tipo: current.tipo === v ? "" : v, page: "1" })}
          >
            {l}
          </Chip>
        ))}
      </div>

      {/* Status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">Status:</span>
        <Chip ativo={!current.status} href={buildFornecedoresHref(current, { status: "", page: "1" })}>
          Todos
        </Chip>
        {Object.entries(STATUS_LABELS).map(([v, l]) => (
          <Chip
            key={v}
            ativo={current.status === v}
            href={buildFornecedoresHref(current, { status: current.status === v ? "" : v, page: "1" })}
          >
            {l}
          </Chip>
        ))}
      </div>

      {/* Faixa de preço */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-400">Preço:</span>
        <Chip ativo={!current.faixa} href={buildFornecedoresHref(current, { faixa: "", page: "1" })}>
          Todos
        </Chip>
        {(["economico", "intermediario", "premium"] as const).map((v) => (
          <Chip
            key={v}
            ativo={current.faixa === v}
            href={buildFornecedoresHref(current, { faixa: current.faixa === v ? "" : v, page: "1" })}
          >
            {FAIXA_PRECO_CIFRAO[v]}
          </Chip>
        ))}
      </div>

      {/* Categorias (multi) */}
      {categoriasDisponiveis.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Categoria:</span>
          {categoriasDisponiveis.map((slug) => (
            <button
              key={slug}
              onClick={() => toggleCategoria(slug)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoriasSel.includes(slug)
                  ? "bg-indigo-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {categoriaLabel(slug)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
