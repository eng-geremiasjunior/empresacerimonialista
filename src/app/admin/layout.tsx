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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { emailDoSuperAdmin } from "@/lib/supabase/admin-painel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "eorganizei — Gestão",
  robots: { index: false, follow: false },
};

// O item ativo da lateral, sem componente cliente.
//
// Um layout de servidor não conhece a rota (não há usePathname aqui, e
// transformar a navegação em componente cliente por causa de um fundo
// seria pagar JavaScript por um destaque). Então a PÁGINA se anuncia
// com `data-adm-secao` e a lateral responde por CSS. Quem não se
// anuncia simplesmente não acende nenhum item — nunca acende o errado.
//
// Escrito com dangerouslySetInnerHTML, e sem uma única aspa dentro:
// `<style>{\`...\`}</style>` com aspas no template faz o servidor
// escapá-las e o React refazer a página inteira na hidratação. Já
// derrubou duas telas nesta casa.
//
// Hoje só a Visão geral se anuncia. Contas e Gateway não emitem o
// atributo, e regra de CSS que nunca casa é código morto disfarçado de
// funcionalidade: as duas saíram daqui, junto com as classes que elas
// procuravam. Para acender aquele item, basta a página pôr
// `data-adm-secao="contas"` (ou "gateway") no elemento raiz e voltar a
// linha correspondente aqui — as duas telas estão fora desta entrega.
const CSS_LATERAL = `
.adm-shell:has([data-adm-secao=visao]) .adm-nav-visao{
background:#4d4e55;color:#fff;font-weight:600}
`;

function ItemLateral({
  href,
  marca,
  children,
}: {
  href: string;
  marca?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-[9px] text-[13px] text-[#b9bac0] transition-colors hover:bg-[#42434a] hover:text-white ${marca ?? ""}`}
    >
      {children}
    </Link>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await emailDoSuperAdmin();
  if (!email) notFound();

  return (
    <div
      className="adm-shell grid min-h-screen bg-[#e9e9e6] md:grid-cols-[220px_1fr]"
      style={{ fontFamily: "var(--font-ui), system-ui, sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS_LATERAL }} />

      <aside className="flex flex-col gap-1.5 bg-[#33343a] px-[18px] py-[22px]">
        <div className="mb-[22px] text-[15px] font-bold tracking-[-0.01em] text-white">
          eorganizei{" "}
          <span className="font-medium text-[#b9bac0]">· Gestão</span>
        </div>

        <ItemLateral href="/admin" marca="adm-nav-visao">
          Visão geral
        </ItemLateral>
        {/* Financeiro e Relatório são seções desta mesma tela — âncora, não
            rota. Página vazia para dar sensação de menu grande é ruído. */}
        <ItemLateral href="/admin#financeiro">Financeiro</ItemLateral>
        <ItemLateral href="/admin#relatorio">Relatório</ItemLateral>
        <ItemLateral href="/admin/contas">Contas</ItemLateral>
        <ItemLateral href="/admin/gateway">Gateway</ItemLateral>

        <div className="mt-auto pt-8 text-[11px] leading-[1.5] text-[#8e8f96]">
          <span className="block break-all">{email}</span>
          <Link
            href="/eventos/dashboard"
            className="text-[#b9bac0] hover:text-white"
          >
            ← voltar ao app
          </Link>
        </div>
      </aside>

      <main
        className="min-w-0 bg-[#f4f4f2] px-5 pb-8 pt-6 md:px-[30px] md:pb-[34px] md:pt-[26px]"
      >
        {children}
      </main>
    </div>
  );
}
