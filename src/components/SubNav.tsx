"use client";

// As visões de uma tela-mãe, como abas (mesmo desenho das abas do
// Financeiro do evento). Lê a lista de lib/visoes.ts.
//
// Só o item de href mais longo que casa com o caminho fica ativo: em
// /orcamentos/novo o ativo é "Propostas"; em /catalogo/casamento, "Catálogo".
// Com menos de duas visões visíveis para o cargo, a barra nem aparece —
// uma aba sozinha não é navegação.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Visao } from "@/lib/visoes";

export function SubNav({
  itens,
  cargo,
  className,
}: {
  itens: Visao[];
  cargo?: string | null;
  className?: string;
}) {
  const pathname = usePathname() ?? "";
  const visiveis = itens.filter(
    (i) => !i.cargos || (cargo != null && i.cargos.includes(cargo))
  );
  if (visiveis.length < 2) return null;

  const casa = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const ativo =
    visiveis
      .filter((i) => casa(i.href))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <nav
      aria-label="Visões desta tela"
      className={`flex gap-1 overflow-x-auto border-b border-gray-200 ${className ?? ""}`}
    >
      {visiveis.map((i) => {
        const ativa = i.href === ativo;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={ativa ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              ativa
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
