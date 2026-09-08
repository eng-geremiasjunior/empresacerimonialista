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
import { FaixaDoRascunho } from "@/components/orcamento-publico/FaixaDoRascunho";
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
// está vendendo — não o da ferramenta. A noiva não contratou o eorganizei.
export async function generateMetadata({
  params,
}: {
  params: { hash: string };
}): Promise<Metadata> {
  const proposta = await carregarProposta(params.hash);
  const empresa = proposta?.nome_empresa?.trim();
  return { title: empresa ? `Sua proposta — ${empresa}` : "Sua proposta" };
}

/**
 * Quem está olhando é da casa? Só é perguntado quando a proposta é
 * RASCUNHO — e é a RLS que responde: a leitura da tabela `orcamentos`
 * pela sessão só devolve linha para quem é da empresa dona. Cliente
 * nenhuma, logada em outra conta ou sem conta, recebe null aqui.
 *
 * Existe porque a dona abre "Acessar orçamento" antes de enviar, encontra
 * o botão de aceite apagado e não tem como saber por quê. A saída passa a
 * ficar onde o erro acontece.
 */
async function orcamentoDaCasa(hash: string): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("orcamentos")
    .select("id")
    .eq("hash_publico", hash)
    .maybeSingle();
  return data?.id ?? null;
}

export default async function OrcamentoPublicoPage({
  params,
}: {
  params: { hash: string };
}) {
  const proposta = await carregarProposta(params.hash);

  if (!proposta) notFound();

  const idParaEnviar =
    proposta.status === "rascunho" ? await orcamentoDaCasa(params.hash) : null;

  // O cartão flutua sobre a peça, sem empurrar nem cobrir: a proposta
  // continua sendo lida exatamente como a cliente a lê.
  const comFaixa = (conteudo: React.ReactNode) =>
    idParaEnviar ? (
      <>
        <FaixaDoRascunho orcamentoId={idParaEnviar} />
        {conteudo}
      </>
    ) : (
      conteudo
    );

  if (proposta.tipo_evento === "debutante") {
    // O template vem do orçamento (059); null cai no padrão do tipo.
    const template =
      proposta.template_proposta ??
      TEMPLATE_PADRAO_POR_TIPO[proposta.tipo_evento as EventType] ??
      "debutante_classico";

    if (template === "debutante_convite_vivo") {
      return comFaixa(<PropostaConviteVivo hash={params.hash} inicial={proposta} />);
    }

    if (template === "debutante_glam") {
      return comFaixa(
        <div className="min-h-screen">
          <PropostaDebutanteGlam hash={params.hash} inicial={proposta} />
        </div>
      );
    }

    return comFaixa(
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
    return comFaixa(<PropostaCasamentoPraia hash={params.hash} inicial={proposta} />);
  }

  if (templateCasamento === "casamento_maison") {
    return comFaixa(
      <div
        className="min-h-screen"
      >
        <PropostaCasamentoMaison hash={params.hash} inicial={proposta} />
      </div>
    );
  }

  // O slug casamento_v2 sempre foi rotulado "Clássico — Creme e dourado";
  // este É o Clássico agora (o dono redesenhou e o novo assumiu o slug).
  return comFaixa(<PropostaCasamentoClassico hash={params.hash} inicial={proposta} />);
}
