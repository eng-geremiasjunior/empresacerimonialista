"use client";

// Multi-select de categorias de serviço com grupos (Operacionais / Apoio)
// e opção de digitar uma categoria customizada. Trabalha com slugs.

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  CATEGORIAS_APOIO,
  CATEGORIAS_OPERACIONAIS,
  categoriaLabel,
  slugCategoria,
} from "@/lib/fornecedores-shared";

export function CategoriasMultiSelect({
  value,
  onChange,
}: {
  value: string[]; // slugs selecionados
  onChange: (slugs: string[]) => void;
}) {
  const [custom, setCustom] = useState("");

  const grupos = useMemo(
    () => [
      { titulo: "Operacionais", itens: Object.keys(CATEGORIAS_OPERACIONAIS) },
      { titulo: "Apoio", itens: Object.keys(CATEGORIAS_APOIO) },
    ],
    []
  );

  function toggle(slug: string) {
    onChange(
      value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]
    );
  }

  function addCustom() {
    const slug = slugCategoria(custom);
    if (slug && !value.includes(slug)) onChange([...value, slug]);
    setCustom("");
  }

  // Slugs selecionados que não estão nos grupos conhecidos (customizados).
  const conhecidos = new Set([
    ...Object.keys(CATEGORIAS_OPERACIONAIS),
    ...Object.keys(CATEGORIAS_APOIO),
  ]);
  const customizados = value.filter((s) => !conhecidos.has(s));

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((slug) => (
            <span
              key={slug}
              className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
            >
              {categoriaLabel(slug)}
              <button
                type="button"
                onClick={() => toggle(slug)}
                aria-label={`Remover ${categoriaLabel(slug)}`}
                className="text-indigo-400 hover:text-indigo-700"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 p-2">
        {grupos.map((g) => (
          <div key={g.titulo} className="mb-2 last:mb-0">
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {g.titulo}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {g.itens.map((slug) => {
                const ativa = value.includes(slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggle(slug)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      ativa
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {categoriaLabel(slug)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {customizados.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Personalizadas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {customizados.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggle(slug)}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                >
                  {categoriaLabel(slug)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Categoria personalizada…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={addCustom}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>
    </div>
  );
}
