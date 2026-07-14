import type { Metadata } from "next";
import { BrandShowcase, VelaLogo } from "@/components/auth/BrandShowcase";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Entrar — Vela",
};

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Ícones de marca (a lucide-react instalada não inclui ícones de marcas)
function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function WhatsAppIcon() {
  // lucide não tem ícone de marca do WhatsApp
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.2-.3.1-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

function SetupInstructions() {
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
            <VelaLogo compact />
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
          <p>© 2026 Vela. Todos os direitos reservados.</p>
          <nav className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-900">
              Política de Privacidade
            </a>
            <span className="text-gray-300">|</span>
            <a href="#" className="hover:text-gray-900">
              Termos de Uso
            </a>
            <span className="text-gray-300">|</span>
            <a href="#" className="hover:text-gray-900">
              Suporte
            </a>
          </nav>
          <div className="flex items-center gap-3 text-gray-400">
            <a href="#" aria-label="Instagram" className="hover:text-indigo-600">
              <InstagramIcon />
            </a>
            <a href="#" aria-label="Facebook" className="hover:text-indigo-600">
              <FacebookIcon />
            </a>
            <a href="#" aria-label="WhatsApp" className="hover:text-indigo-600">
              <WhatsAppIcon />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
