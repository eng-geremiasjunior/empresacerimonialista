import { Newsreader } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { dadosDoBanner, type PlanoNoBanner } from "@/lib/planos-banner";
import type { PlanosDoSite } from "@/components/planos/SiteModelo2";

// O que as páginas públicas de venda (a home e a /planos) montam no
// servidor: os preços do painel e para onde vão os botões. NENHUM NÚMERO
// DE PLANO VIVE NO DESENHO: preço, limite e promoção vêm do painel
// (lib/planos-banner.ts), como na tela de planos do cadastro.

// A fonte dos títulos do site (Newsreader, com o eixo de tamanho óptico):
// só as páginas de venda usam, por isso não mora no layout.
export const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

export async function planosDoSite(): Promise<{ planos: PlanosDoSite; hrefConta: string; hrefPlano: string }> {
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
  return {
    planos,
    hrefConta: user ? "/assinatura" : "/criar-conta",
    hrefPlano: user ? "/assinatura?plano=" : "/comecar?plano=",
  };
}
