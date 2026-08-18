import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropostaV2 } from "@/components/orcamento-publico/PropostaV2";
import { PropostaDebutante } from "@/components/orcamento-publico/PropostaDebutante";
import { PropostaDebutanteGlam } from "@/components/orcamento-publico/PropostaDebutanteGlam";
import { PropostaCasamentoMaison } from "@/components/orcamento-publico/PropostaCasamentoMaison";
import type { OrcamentoPublicoData } from "@/lib/orcamento-publico";
import { variaveisDoTema } from "@/lib/orcamento-temas";
import { TEMPLATE_PADRAO_POR_TIPO } from "@/lib/proposta-templates";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  if (proposta.tipo_evento === "debutante") {
    // O template vem do orçamento (059); null cai no padrão do tipo.
    const template =
      proposta.template_proposta ??
      TEMPLATE_PADRAO_POR_TIPO[proposta.tipo_evento as EventType] ??
      "debutante_classico";

    if (template === "debutante_glam") {
      return (
        <div className="min-h-screen">
          <PropostaDebutanteGlam hash={params.hash} inicial={proposta} />
        </div>
      );
    }

    return (
      <div
        className="min-h-screen font-[var(--font-inter)]"
      >
        <PropostaDebutante hash={params.hash} inicial={proposta} />
      </div>
    );
  }

  // Casamento também tem dois templates desde a 060.
  const templateCasamento =
    proposta.template_proposta ??
    TEMPLATE_PADRAO_POR_TIPO[proposta.tipo_evento as EventType] ??
    "casamento_v2";

  if (templateCasamento === "casamento_maison") {
    return (
      <div
        className="min-h-screen"
      >
        <PropostaCasamentoMaison hash={params.hash} inicial={proposta} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen [font-family:var(--fonte-corpo)]"
      style={{ ...variaveisDoTema(), background: "var(--cor-fundo)" }}
    >
      <PropostaV2 hash={params.hash} inicial={proposta} />
    </div>
  );
}
