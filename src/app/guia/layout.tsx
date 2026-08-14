import type { Metadata } from "next";
import { EB_Garamond, Jost } from "next/font/google";
import "../(portal)/portal.css";
import "../(portal)/portal/[eventoId]/guia-estilo/guia.css";

// O guia na mão do fornecedor mora fora do portal, então precisa carregar
// as fontes por conta própria — sem isto o documento inteiro cai em
// sans-serif e perde a serifa, que é o que faz a página parecer editorial
// em vez de tela de sistema.
//
// As fontes ficam no LAYOUT, nunca na página: next/font resolve a família
// na compilação do módulo, e declarar a mesma em arquivos irmãos quebra o
// build de produção (lição do /confirmar).

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--fonte-portal-titulo",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--fonte-portal-corpo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Guia de estilo",
  // material de trabalho de um casamento: fora do índice de buscadores
  robots: { index: false, follow: false },
};

export default function GuiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${garamond.variable} ${jost.variable} portal-raiz`}>
      {children}
    </div>
  );
}
