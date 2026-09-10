import type { Metadata } from "next";
import { BrandShowcase, Logo } from "@/components/auth/BrandShowcase";
import { LoginForm } from "@/components/auth/LoginForm";
import { Medicao } from "@/components/marketing/Medicao";
import {
  comTetoDoPlano,
  getCatalogoDePlanos,
  getEscadaDaPromocao,
  PLANO_DA_PROMOCAO,
  PROMOCAO_LANCAMENTO,
  reais,
} from "@/lib/planos";

export const metadata: Metadata = {
  title: "Entrar — eorganizei",
  // Tela de conta: não tem por que aparecer em busca.
  robots: { index: false, follow: false },
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

// O preço de entrada aparece nesta tela porque ela é o meio do caminho
// entre o anúncio e o cartão: quem chegou lendo "Começar por R$ 27,90"
// precisa reconhecer o mesmo número aqui. Vem do catálogo e da escada,
// nunca escrito à mão — se o dono mudar o valor, esta tela acompanha.
async function precoDeEntrada(): Promise<string | null> {
  try {
    const planos = await getCatalogoDePlanos();
    const plano =
      planos.find((p) => p.codigo === PLANO_DA_PROMOCAO) ??
      [...planos].sort((a, b) => a.valorMensal - b.valorMensal)[0];
    if (!plano) return null;
    const escada = await getEscadaDaPromocao(PROMOCAO_LANCAMENTO);
    const degrau = escada?.degraus[0];
    // a mesma régua da vitrine: degrau que não desconta não é promoção
    const valor =
      degrau && comTetoDoPlano(degrau.valorMensal, plano.valorMensal) < plano.valorMensal
        ? comTetoDoPlano(degrau.valorMensal, plano.valorMensal)
        : plano.valorMensal;
    return reais(valor);
  } catch {
    return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { erro?: string; criar?: string; entrar?: string };
}) {
  if (!supabaseConfigured) return <SetupInstructions />;

  // DUAS PORTAS, UMA TELA (10/09/2026, molde do CREA que o dono trouxe).
  // A porta vem da URL, não do estado do formulário: assim o servidor já
  // monta a coluna certa, /equipe é um endereço que a funcionária pode
  // guardar, e trocar de aba é navegar, não hidratar.
  const daEquipe = searchParams?.entrar === "equipe";
  const quem = daEquipe ? "equipe" : "dona";
  const criar = !daEquipe && searchParams?.criar === "1";
  const preco = criar ? await precoDeEntrada() : null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <main className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
        {/* Coluna esquerda — apresentação (desktop) */}
        <section className="hidden lg:block">
          <BrandShowcase quem={quem} />
        </section>

        {/* Coluna direita — formulário */}
        <section className="flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-8">
          {/* versão resumida da marca no mobile */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <Logo compact />
            <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {daEquipe
                ? "Acesso da equipe"
                : "Gestão inteligente para cerimonialistas"}
            </p>
          </div>

          <LoginForm
            erroInicial={searchParams?.erro}
            criarConta={criar}
            precoDeEntrada={preco}
            quem={quem}
          />
        </section>
      </main>

      {/* Rodapé full width */}
      <footer className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-gray-500 sm:flex-row">
          <p>© 2026 eorganizei. Todos os direitos reservados.</p>
          <nav className="flex items-center gap-4">
            <a href="/planos" className="hover:text-gray-900">
              Planos
            </a>
            <a href="/termos" className="hover:text-gray-900">
              Termos e Condições
            </a>
            <a href="/privacidade" className="hover:text-gray-900">
              Política de Privacidade
            </a>
          </nav>
        </div>
      </footer>
      {/* O pixel fica só na porta de quem pode virar cliente. A equipe já
          é gente de dentro: medi-la só sujaria o público do anúncio. */}
      {!daEquipe && <Medicao />}
    </div>
  );
}
