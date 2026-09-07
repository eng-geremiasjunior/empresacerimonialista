import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  comTetoDoPlano,
  ehCodigoDoPlano,
  faixasDaEscada,
  fraseDasFaixas,
  getCatalogoDePlanos,
  getEscadaDaPromocao,
  PLANO_DA_PROMOCAO,
  PROMOCAO_LANCAMENTO,
  reais,
  tetoEmTexto,
} from "@/lib/planos";
import { ComecarAgora, type OfertaDoCheckout } from "@/components/assinatura/ComecarAgora";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Começar — eorganizei",
  // Esta tela não é destino de busca: é o fim do funil do anúncio.
  robots: { index: false, follow: false },
};

// O checkout de quem chega do anúncio sem conta.
//
// Não existe conta gratuita (decisão do dono, 07/09/2026), e a confirmação
// de e-mail está ligada no Supabase — o que significa que o caminho
// "cadastre-se, confirme o e-mail, volte e pague" faria a pessoa sair do
// site no meio da compra. Aqui a conta nasce junto com a cobrança, já
// confirmada: quem põe um cartão que a operadora aprova está mais
// verificada do que quem clica num link de e-mail.
//
// NENHUM NÚMERO VIVE AQUI: preço e tetos vêm de `plano_catalogo` (147) e
// os degraus de `plano_promocao` (153), pela MESMA régua da vitrine —
// degrau que não desconta não é promoção. O que a landing anuncia é o que
// esta tela cobra.
export default async function ComecarPage({
  searchParams,
}: {
  searchParams?: { plano?: string };
}) {
  // Quem já está logada não passa por aqui: ela tem a tela de assinatura
  // de dentro do app, que sabe o plano dela e a escada em curso.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/assinatura");

  const planos = await getCatalogoDePlanos();
  if (planos.length === 0) redirect("/planos");

  const pedido = searchParams?.plano;
  const plano =
    (ehCodigoDoPlano(pedido) ? planos.find((p) => p.codigo === pedido) : null) ??
    planos.find((p) => p.codigo === PLANO_DA_PROMOCAO) ??
    [...planos].sort((a, b) => a.valorMensal - b.valorMensal)[0];

  // A promoção só vale no plano dela, e só quando desconta de verdade.
  const escada =
    plano.codigo === PLANO_DA_PROMOCAO ? await getEscadaDaPromocao(PROMOCAO_LANCAMENTO) : null;
  const faixas =
    escada && escada.degraus.length > 0 ? faixasDaEscada(escada, plano.valorMensal) : null;
  const desconta =
    faixas !== null && faixas[0].valorMensal > 0 && faixas[0].valorMensal < plano.valorMensal;

  const precoAgora = desconta
    ? comTetoDoPlano(faixas[0].valorMensal, plano.valorMensal)
    : plano.valorMensal;

  const oferta: OfertaDoCheckout = {
    planoCodigo: plano.codigo,
    planoNome: plano.nome,
    precoTexto: reais(precoAgora),
    precoCheioTexto: desconta ? reais(plano.valorMensal) : null,
    fraseDaEscada: desconta && faixas ? fraseDasFaixas(faixas) : null,
    eventosTexto: tetoEmTexto(plano.eventosEmAndamento),
    loginsTexto: tetoEmTexto(plano.logins),
  };

  return <ComecarAgora oferta={oferta} />;
}
