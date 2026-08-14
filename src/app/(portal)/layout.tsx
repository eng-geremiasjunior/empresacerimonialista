import type { Metadata } from "next";
import { EB_Garamond, Jost } from "next/font/google";
import "./portal.css";

// As duas famílias do portal, e nenhuma terceira. A EB Garamond faz o
// gesto (nome do evento, títulos, números); a Jost desaparece atrás da
// informação. Carregadas aqui, não no layout raiz: a área profissional
// não usa nenhuma das duas.
const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--fonte-portal-titulo",
  display: "swap",
});

// 400 é o padrão; o 300 saiu dos textos pequenos por legibilidade.
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--fonte-portal-corpo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Seu evento",
  // O portal é área privada da cliente: fora do índice de buscadores.
  robots: { index: false, follow: false },
};

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${garamond.variable} ${jost.variable}`}>{children}</div>
  );
}
