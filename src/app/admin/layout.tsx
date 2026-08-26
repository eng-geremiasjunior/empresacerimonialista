// O painel do dono — fora do (app) de propósito: sem AppShell, sem
// Copiloto, sem menu da cerimonialista. É outra pessoa olhando (o
// proprietário do SaaS) para outro objeto (o negócio, não um evento).
//
// O gate mora AQUI e em cada server action: quem não está em
// SUPER_ADMIN_EMAILS recebe 404 — nem confirmação de que a rota existe.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { emailDoSuperAdmin } from "@/lib/supabase/admin-painel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vela — Gestão",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await emailDoSuperAdmin();
  if (!email) notFound();

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-6">
            <span className="text-lg font-semibold tracking-tight text-stone-900">
              Vela · Gestão
            </span>
            <nav className="flex gap-4 text-sm">
              <Link
                href="/admin"
                className="text-stone-600 hover:text-stone-900"
              >
                Métricas
              </Link>
              <Link
                href="/admin/contas"
                className="text-stone-600 hover:text-stone-900"
              >
                Contas
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-stone-500">
            <span>{email}</span>
            <Link href="/eventos/dashboard" className="hover:text-stone-900">
              ← voltar ao app
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
