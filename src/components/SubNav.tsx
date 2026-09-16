"use client";

// As visões de uma tela-mãe (Eventos, Gestão comercial, Fornecedores).
//
// É MENU, e menu se destaca do conteúdo. A primeira versão eram abas
// finas, de texto cinza, logo abaixo do título — e o dono, que conhece o
// sistema, não achava (16/09/2026). Agora é um seletor com fundo próprio,
// ícone e letra forte, e é SEMPRE o primeiro elemento da página: trocar de
// visão não pode fazer o menu mudar de lugar.
//
// O desenho é diferente, de propósito, dos filtros das telas (pílulas
// escuras soltas): "trocar de visão" e "filtrar a lista" não podem se
// confundir.
//
// Só o item de href mais longo que casa com o caminho fica ativo: em
// /orcamentos/novo o ativo é "Propostas"; em /catalogo/casamento,
// "Catálogo". Com menos de duas visões visíveis para o cargo, a barra nem
// aparece — uma aba sozinha não é navegação.
//
// No celular as abas quebram em linhas, todas à vista: uma aba escondida
// à direita, esperando a pessoa arrastar a barra, é menu que ninguém acha.
// E nada de rolagem vertical, que aparecia no Windows como duas setinhas
// ao lado das abas.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  FileSignature,
  FileText,
  Globe,
  Inbox,
  List,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { IconeDaVisao, Visao } from "@/lib/visoes";

// O ícone viaja como nome: componente não atravessa do servidor para o
// cliente (a mesma regra do menu lateral).
const ICONES: Record<IconeDaVisao, LucideIcon> = {
  lista: List,
  calendario: CalendarDays,
  propostas: FileText,
  pedidos: Inbox,
  pagina: Globe,
  catalogo: BookOpen,
  cadastro: Truck,
  contratos: FileSignature,
  agenda: CalendarClock,
};

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
      className={`max-w-full ${className ?? ""}`}
    >
      <ul className="flex flex-wrap items-center gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1 sm:inline-flex sm:flex-nowrap">
        {visiveis.map((i) => {
          const ativa = i.href === ativo;
          const Icone = ICONES[i.icone];
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={ativa ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-[15px] font-semibold transition-colors sm:px-4 ${
                  ativa
                    ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200"
                    : "text-stone-500 hover:bg-white/70 hover:text-stone-900"
                }`}
              >
                <Icone
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                  className={ativa ? "text-stone-900" : "text-stone-400"}
                />
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
