import { notFound } from "next/navigation";
import { Inter, Playfair_Display } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { OrcamentoPublico } from "@/components/orcamento-publico/OrcamentoPublico";
import type { OrcamentoPublicoData } from "@/lib/orcamento-publico";

// Tipografia própria da peça pública: serifada nos títulos, sans no corpo.
// Carregada aqui (não no layout) para não pesar no painel administrativo.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-playfair",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const dynamic = "force-dynamic";
export const metadata = { title: "Sua proposta — Vela" };

// Página pública (sem login): tudo vem da RPC por hash, a tabela nunca é
// exposta. Mesmo padrão do roteiro público e da confirmação de fornecedor.
export default async function OrcamentoPublicoPage({
  params,
}: {
  params: { hash: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.rpc("consultar_orcamento_publico", {
    p_hash: params.hash,
  });

  if (!data) notFound();

  return (
    <div
      className={`${playfair.variable} ${inter.variable} min-h-screen [font-family:var(--font-inter)]`}
      style={{ background: "#FAF6F2" }}
    >
      <noscript>
        <style>{`[data-revelar]{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <OrcamentoPublico
        hash={params.hash}
        inicial={data as unknown as OrcamentoPublicoData}
      />
    </div>
  );
}
