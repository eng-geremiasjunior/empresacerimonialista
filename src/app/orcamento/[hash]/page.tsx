import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrcamentoPublico } from "@/components/orcamento-publico/OrcamentoPublico";
import type { OrcamentoPublicoData } from "@/lib/orcamento-publico";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orçamento — Vela" };

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
    <main className="min-h-screen bg-[#F6F6FA] px-4 py-8">
      <OrcamentoPublico
        hash={params.hash}
        inicial={data as unknown as OrcamentoPublicoData}
      />
    </main>
  );
}
