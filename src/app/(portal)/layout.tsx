import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./portal.css";

// As duas famílias do portal, e nenhuma terceira. A Cormorant faz o gesto
// (nome do evento, títulos, valores grandes); a Jost desaparece atrás da
// informação. Carregadas aqui, não no layout raiz: a área profissional
// não usa nenhuma das duas.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--fonte-portal-titulo",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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
    <div className={`${cormorant.variable} ${jost.variable}`}>{children}</div>
  );
}
