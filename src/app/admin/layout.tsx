// O painel do dono — fora do (app) de propósito: sem AppShell, sem
// Copiloto, sem menu da cerimonialista. É outra pessoa olhando (o
// proprietário do SaaS) para outro objeto (o negócio, não um evento).
//
// O gate mora AQUI e em cada server action: quem não está em
// SUPER_ADMIN_EMAILS recebe 404 — nem confirmação de que a rota existe.
//
// A moldura é chumbo e a área de trabalho é clara (handoff "Painel
// Admin", 09/2026): a barra escura tira a navegação do caminho do olho e
// deixa o branco para o que o dono veio ver — os números.
//
// O MENU (17/09/2026, regra dele: "menus sempre destacados"): cada item
// com ícone, peso e fundo próprio quando ativo, sempre no mesmo lugar, e
// no celular todos à vista (duas colunas, nada escondido para o lado).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Server,
  SlidersHorizontal,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { contarSuporteNaoLidas, emailDoSuperAdmin } from "@/lib/supabase/admin-painel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "eorganizei — Gestão",
  robots: { index: false, follow: false },
};

type Item = { chave: string; href: string; rotulo: string; Icone: LucideIcon };

const ITENS: Item[] = [
  { chave: "visao", href: "/admin", rotulo: "Visão geral", Icone: LayoutDashboard },
  { chave: "contas", href: "/admin/contas", rotulo: "Contas", Icone: Users },
  { chave: "ativacao", href: "/admin/ativacao", rotulo: "Ativação e uso", Icone: Activity },
  { chave: "receita", href: "/admin/receita", rotulo: "Receita", Icone: Wallet },
  { chave: "suporte", href: "/admin/suporte", rotulo: "Suporte", Icone: MessageSquare },
  { chave: "sistema", href: "/admin/sistema", rotulo: "Sistema", Icone: Server },
  { chave: "auditoria", href: "/admin/auditoria", rotulo: "Auditoria", Icone: ScrollText },
  { chave: "ajustes", href: "/admin/ajustes", rotulo: "Ajustes", Icone: SlidersHorizontal },
];

// O item ativo, sem componente cliente.
//
// Um layout de servidor não conhece a rota (não há usePathname aqui, e
// transformar a navegação em componente cliente por causa de um fundo
// seria pagar JavaScript por um destaque). Então cada PÁGINA se anuncia
// com `data-adm-secao` e a lateral responde por CSS. Quem não se anuncia
// simplesmente não acende nenhum item — nunca acende o errado.
//
// Escrito com dangerouslySetInnerHTML, e sem uma única aspa dentro:
// `<style>{\`...\`}</style>` com aspas no template faz o servidor
// escapá-las e o React refazer a página inteira na hidratação. Já
// derrubou duas telas nesta casa.
const CSS_LATERAL =
  ITENS.map(
    (i) =>
      `.adm-shell:has([data-adm-secao=${i.chave}]) .adm-nav-${i.chave}{background:#4d4e55;color:#fff;font-weight:600;box-shadow:inset 3px 0 0 #b98fac}` +
      `.adm-shell:has([data-adm-secao=${i.chave}]) .adm-nav-${i.chave} svg{color:#d9c2d2}`
  ).join("\n");

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await emailDoSuperAdmin();
  if (!email) notFound();
  // As mensagens novas da caixinha do sistema (161), sem as das contas da
  // casa. Erro vira 0 dentro da função: sem a migração, o item só não acende.
  const suporteNovas = await contarSuporteNaoLidas();

  return (
    <div
      className="adm-shell grid min-h-screen bg-[#e9e9e6] md:grid-cols-[228px_1fr]"
      style={{ fontFamily: "var(--font-ui), system-ui, sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS_LATERAL }} />

      <aside className="flex flex-col gap-3 bg-[#33343a] px-4 py-4 md:gap-1.5 md:px-[16px] md:py-[22px]">
        <div className="px-1 text-[15px] font-bold tracking-[-0.01em] text-white md:mb-[18px]">
          eorganizei{" "}
          <span className="font-medium text-[#b9bac0]">· Gestão</span>
        </div>

        <nav
          aria-label="Painel do dono"
          className="grid grid-cols-2 gap-1 md:flex md:flex-col"
        >
          {ITENS.map(({ chave, href, rotulo, Icone }) => (
            <Link
              key={chave}
              href={href}
              className={`adm-nav-${chave} flex items-center gap-2.5 rounded-md px-3 py-[9px] text-[13.5px] font-medium text-[#c9cacf] transition-colors hover:bg-[#42434a] hover:text-white`}
            >
              <Icone size={16} strokeWidth={2} aria-hidden className="shrink-0 text-[#9a9ba1]" />
              <span className="min-w-0 flex-1 truncate">{rotulo}</span>
              {chave === "suporte" && suporteNovas > 0 && (
                <span className="rounded-full bg-[#b98fac] px-1.5 py-0.5 text-[10px] font-semibold text-[#2a1f27]">
                  {suporteNovas}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-2 px-1 text-[11px] leading-[1.5] text-[#8e8f96] md:mt-auto md:pt-8">
          <span className="block break-all">{email}</span>
          <Link
            href="/eventos/dashboard"
            className="text-[#b9bac0] hover:text-white"
          >
            ← voltar ao app
          </Link>
        </div>
      </aside>

      <main className="min-w-0 bg-[#f4f4f2] px-4 pb-8 pt-5 md:px-[30px] md:pb-[34px] md:pt-[26px]">
        {children}
      </main>
    </div>
  );
}
