import type { Metadata } from "next";
import { EB_Garamond, Jost } from "next/font/google";
import "../(portal)/portal.css";
import "./confirmar.css";

// As telas do convidado — a individual (/confirmar/[hash]) e a do link
// do evento (/confirmar/evento/[hash]).
//
// As fontes ficam AQUI, no layout, e não em cada página: next/font
// resolve a fonte na compilação do módulo, e declarar a mesma família em
// vários arquivos irmãos quebra o build de produção (o dev não reclama).

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
  title: "Confirmar presença",
  // convite pessoal: fora do índice de buscadores
  robots: { index: false, follow: false },
};

export default function ConfirmarLayout({
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
