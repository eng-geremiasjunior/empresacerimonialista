import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropostaCasamentoClassico } from "@/components/orcamento-publico/PropostaCasamentoClassico";
import { PropostaDebutante } from "@/components/orcamento-publico/PropostaDebutante";
import { PropostaConviteVivo } from "@/components/orcamento-publico/PropostaConviteVivo";
import { PropostaDebutanteGlam } from "@/components/orcamento-publico/PropostaDebutanteGlam";
import { PropostaCasamentoMaison } from "@/components/orcamento-publico/PropostaCasamentoMaison";
import { PropostaCasamentoPraia } from "@/components/orcamento-publico/PropostaCasamentoPraia";
import type { OrcamentoPublicoData } from "@/lib/orcamento-publico";
import { TEMPLATE_PADRAO_POR_TIPO } from "@/lib/proposta-templates";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

// Página pública (sem login): tudo vem da RPC por hash, a tabela nunca é
// exposta. Mesmo padrão do roteiro público e da confirmação de fornecedor.
// A RPC roda duas vezes por request (título + página); `cache` do React
// junta as duas no mesmo render.
const carregarProposta = cache(async (hash: string) => {
  const supabase = createClient();
  const { data } = await supabase.rpc("consultar_orcamento_publico", {
    p_hash: hash,
  });
  return (data as unknown as OrcamentoPublicoData) ?? null;
});

// A aba do navegador e a prévia do link no WhatsApp dizem o nome de quem
// está vendendo — não o da ferramenta. A noiva não contratou o Vela.
export async function generateMetadata({
  params,
}: {
  params: { hash: string };
}): Promise<Metadata> {
  const proposta = await carregarProposta(params.hash);
  const empresa = proposta?.nome_empresa?.trim();
  return { title: empresa ? `Sua proposta — ${empresa}` : "Sua proposta" };
}

export default async function OrcamentoPublicoPage({
  params,
}: {
  params: { hash: string };
}) {
  const proposta = await carregarProposta(params.hash);

  if (!proposta) notFound();

  if (proposta.tipo_evento === "debutante") {
    // O template vem do orçamento (059); null cai no padrão do tipo.
    const template =
      proposta.template_proposta ??
      TEMPLATE_PADRAO_POR_TIPO[proposta.tipo_evento as EventType] ??
      "debutante_classico";

    if (template === "debutante_convite_vivo") {
      return <PropostaConviteVivo hash={params.hash} inicial={proposta} />;
    }

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

  if (templateCasamento === "casamento_praia") {
    return <PropostaCasamentoPraia hash={params.hash} inicial={proposta} />;
  }

  if (templateCasamento === "casamento_maison") {
    return (
      <div
        className="min-h-screen"
      >
        <PropostaCasamentoMaison hash={params.hash} inicial={proposta} />
      </div>
    );
  }

  // O slug casamento_v2 sempre foi rotulado "Clássico — Creme e dourado";
  // este É o Clássico agora (o dono redesenhou e o novo assumiu o slug).
  return <PropostaCasamentoClassico hash={params.hash} inicial={proposta} />;
}
