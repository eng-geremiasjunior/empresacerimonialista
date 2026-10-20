"use client";

// O menu do celular (18/10/2026, pedido dele): no computador fica a
// moldura nova; no celular volta o modelo anterior (o do AppShell, apagado
// em 311556e) — cabeçalho branco com o ☰, avisos, a foto e Sair, e a
// gaveta escura com o menu inteiro em grupos e o suporte no pé.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Marca } from "@/components/marca/Marca";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { CaixaDeSuporte } from "@/components/suporte/CaixaDeSuporte";
import { ICONES_DO_MENU as ICONS, MENU_DO_APP as NAV } from "@/lib/menu-do-app";

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const TAMBEM_ATIVO: Record<string, string[]> = {
  "/eventos": ["/calendario"],
  "/orcamentos": ["/catalogo"],
  "/fornecedores": ["/contratos", "/agenda"],
};

function isActive(pathname: string, href: string) {
  if ((TAMBEM_ATIVO[href] ?? []).some((h) => pathname === h || pathname.startsWith(`${h}/`))) return true;
  if (href === "/eventos/dashboard") return pathname === href;
  if (href === "/eventos") return pathname.startsWith("/eventos") && pathname !== "/eventos/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MenuDoCelular({
  cargo,
  userEmail,
  avatarUrl,
  signOut,
  avisosComerciais = 0,
}: {
  cargo: string | null;
  userEmail: string;
  avatarUrl: string | null;
  signOut: () => Promise<void>;
  /** avisos do Comercial ainda não vistos (19/10/2026) */
  avisosComerciais?: number;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const navVisivel = NAV.filter((item) => !item.cargos || (cargo !== null && item.cargos.includes(cargo)));
  const grupos = Array.from(new Set(navVisivel.map((item) => item.grupo)));
  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100"
            aria-label="Abrir menu"
          >
            <Icon name="menu" />
          </button>
          <Link href="/eventos/dashboard" aria-label="eorganizei, início" className="flex items-center">
            <Marca tamanho={16} comSimbolo={false} />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <Link
              href="/configuracoes"
              title="Editar perfil"
              className="flex items-center rounded-full p-0.5 transition-colors hover:bg-stone-100"
            >
              <Avatar src={avatarUrl} fallback={initials} size="sm" />
            </Link>
            <form action={signOut}>
              <button
                title="Sair"
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              >
                <Icon name="sair" className="h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-stone-900 transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between px-5">
            <Marca tamanho={18} escuro comSimbolo={false} />
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-stone-400 hover:text-white"
              aria-label="Fechar menu"
            >
              <Icon name="fechar" />
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
            {grupos.map((grupo) => (
              <div key={grupo ?? "solto"} className="pt-3 first:pt-0">
                {grupo && (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                    {grupo}
                  </p>
                )}
                <div className="space-y-0.5">
                  {navVisivel
                    .filter((item) => item.grupo === grupo)
                    .map((item) => {
                      const ativo = isActive(pathname, item.href);
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            ativo ? "bg-stone-800 text-white" : "text-stone-400 hover:bg-stone-800/60 hover:text-white"
                          }`}
                        >
                          <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {item.href === "/orcamentos" && avisosComerciais > 0 && (
                            <span className="ml-auto rounded-full bg-[var(--mo-destaque)] px-2 py-0.5 text-xs font-semibold text-white">
                              {avisosComerciais > 9 ? "9+" : avisosComerciais}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-stone-800 p-3">
            <CaixaDeSuporte />
          </div>
          <div className="border-t border-stone-800 px-5 py-3">
            <p className="truncate text-xs text-stone-500">{userEmail}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
