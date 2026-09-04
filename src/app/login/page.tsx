import type { Metadata } from "next";
import { BrandShowcase, Logo } from "@/components/auth/BrandShowcase";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Entrar — eorganizei",
};

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);



function SetupInstructions() {
  // Em produção isto não pode aparecer: é passo a passo de instalação
  // (criar projeto, copiar .env, rodar o schema) numa rota que qualquer
  // visitante alcança. Se as variáveis faltarem no deploy, o app inteiro
  // está fora do ar de qualquer jeito — o que ela precisa saber é isso.
  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-gray-900">
          Serviço temporariamente indisponível
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Tente de novo em alguns minutos.
        </p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold">Supabase não configurado</h1>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-gray-600">
          <li>
            Crie um projeto em <span className="font-medium">supabase.com</span>
          </li>
          <li>
            Copie{" "}
            <code className="rounded bg-gray-100 px-1">.env.local.example</code>{" "}
            para <code className="rounded bg-gray-100 px-1">.env.local</code> e
            preencha a URL e a anon key
          </li>
          <li>
            Execute{" "}
            <code className="rounded bg-gray-100 px-1">supabase/schema.sql</code>{" "}
            no SQL Editor do painel
          </li>
          <li>Reinicie o servidor de desenvolvimento</li>
        </ol>
      </div>
    </main>
  );
}

export default function LoginPage() {
  if (!supabaseConfigured) return <SetupInstructions />;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Coluna esquerda — apresentação (desktop) */}
        <section className="hidden lg:block">
          <BrandShowcase />
        </section>

        {/* Coluna direita — formulário */}
        <section className="flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-8">
          {/* versão resumida da marca no mobile */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <Logo compact />
            <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Gestão inteligente para cerimonialistas
            </p>
          </div>

          <LoginForm />
        </section>
      </main>

      {/* Rodapé full width */}
      <footer className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-gray-500 sm:flex-row">
          <p>© 2026 eorganizei. Todos os direitos reservados.</p>
          <nav className="flex items-center gap-4">
            <a href="/privacidade" className="hover:text-gray-900">
              Política de Privacidade
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
