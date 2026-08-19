import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Great_Vibes,
  Instrument_Serif,
  Inter,
  Manrope,
  Playfair_Display,
  Syne,
} from "next/font/google";

// As fontes das propostas públicas ficam AQUI, no layout, e não na
// página: next/font resolve a família na compilação do módulo, e
// declarar a mesma família em arquivos irmãos quebra o build de
// produção (o dev não reclama). Mesma regra escrita em
// confirmar/layout.tsx e guia/layout.tsx — a página de orçamento era a
// única que ainda desobedecia.
//
// Cormorant nos títulos de casamento, Playfair no debutante clássico,
// Syne no glam, Great Vibes na cursiva do Maison, Inter no corpo de
// todos.

const titulo = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-titulo",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});
const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-cursiva",
  display: "swap",
});
// Modelo 03 (Convite Vivo): serifa editorial + Manrope no corpo.
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sua proposta — Vela",
  // proposta comercial pessoal: fora do índice de buscadores
  robots: { index: false, follow: false },
};

export default function OrcamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${titulo.variable} ${playfair.variable} ${syne.variable} ${greatVibes.variable} ${instrument.variable} ${manrope.variable} ${inter.variable}`}
    >
      {children}
    </div>
  );
}
