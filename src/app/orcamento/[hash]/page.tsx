import { notFound } from "next/navigation";
import { Inter, Playfair_Display } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { PropostaV2 } from "@/components/orcamento-publico/PropostaV2";
import type { OrcamentoPublicoData } from "@/lib/orcamento-publico";
import { variaveisDoTema } from "@/lib/orcamento-temas";

// Tipografia conforme o page.tsx de referência: Playfair Display nos
// títulos, Inter no corpo. Carregada aqui (não no layout) para não pesar no painel.
const titulo = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-titulo",
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

  const proposta = data as unknown as OrcamentoPublicoData;

  return (
    <div
      className={`${titulo.variable} ${inter.variable} min-h-screen [font-family:var(--fonte-corpo)]`}
      style={{ ...variaveisDoTema(), background: "var(--cor-fundo)" }}
    >
      <PropostaV2 hash={params.hash} inicial={proposta} />
    </div>
  );
}
