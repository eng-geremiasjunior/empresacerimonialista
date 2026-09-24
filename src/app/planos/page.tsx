import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { dadosDoBanner, type PlanoNoBanner } from "@/lib/planos-banner";
import { SiteModelo2, type PlanosDoSite } from "@/components/planos/SiteModelo2";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";
import { PlanosModelo1 } from "./Modelo1";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "eorganizei — a gestão dos seus eventos, em um só lugar",
  description:
    "O sistema das cerimonialistas e assessorias de eventos. No dia do evento, cada fornecedor sabe a hora dele — e você sabe de tudo.",
};

// A fonte dos títulos do modelo 2 (Newsreader, com o eixo de tamanho
// óptico): só esta página usa, por isso é carregada aqui e não no layout.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

// A página de vendas — e o destino do anúncio pago.
//
// Desde 23/09/2026 a padrão é o MODELO 2, o desenho novo do dono
// (SiteModelo2: hero com o celular do fornecedor, tour de 6 passos,
// evento de teste, planos). O modelo 1, a página anterior, continua em
// /planos?modelo=1.
//
// NENHUM NÚMERO DE PLANO VIVE NO DESENHO: preço, limite e promoção vêm do
// painel (lib/planos-banner.ts), como na tela de planos do cadastro.
export default async function PlanosPage({
  searchParams,
}: {
  searchParams?: { modelo?: string };
}) {
  if (searchParams?.modelo === "1") return <PlanosModelo1 />;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dados = await dadosDoBanner();
  const por = (c: PlanoNoBanner["codigo"]) => dados.planos.find((p) => p.codigo === c);
  const preco = (p: PlanoNoBanner | undefined) => (p ? `R$ ${p.inteiro}${p.centavos}` : "");
  const eventos = (p: PlanoNoBanner | undefined) =>
    !p ? "" : p.limite === null ? "Eventos sem limite" : p.limite === 1 ? "1 evento" : `Até ${p.limite} eventos`;

  const essencial = por("essencial");
  const promo = dados.promocao;
  const planos: PlanosDoSite = {
    precoEssencial: promo ? promo.valor : preco(essencial),
    notaPromo: promo
      ? `${promo.meses === 1 ? "Primeiro mês" : `${promo.meses} primeiros meses`}, depois ${promo.aPartirDe}`
      : null,
    eventosEssencial: eventos(essencial),
    precoProfissional: preco(por("profissional")),
    eventosProfissional: eventos(por("profissional")),
    precoMaster: preco(por("master")),
    eventosMaster: eventos(por("master")),
  };

  // o visitante entra pelo cadastro (Gratuito ou pago); quem já tem conta
  // vai para a assinatura dela
  const hrefConta = user ? "/assinatura" : "/criar-conta";
  const hrefPlano = user ? "/assinatura?plano=" : "/comecar?plano=";

  return (
    <div className={newsreader.variable}>
      <SiteModelo2 planos={planos} hrefConta={hrefConta} hrefPlano={hrefPlano} />
      {/* a marca do anúncio guardada na primeira tela */}
      <Origem />
      {/* toda âncora desta página vira evento medido */}
      <MedirCliques />
      <Medicao />
    </div>
  );
}
