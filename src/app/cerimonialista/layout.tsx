import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";

// A página pública da cerimonialista tem voz própria: não é o painel do
// eOrganizei, é a vitrine dela. Fraunces nos títulos (serifa com calor,
// sem cara de convite de casamento — a página atende os nove tipos de
// evento) e Figtree no corpo, legível no celular.
//
// As fontes moram no layout e não na página: next/font resolve a família
// na compilação do módulo (a mesma regra escrita em orcamento/layout.tsx).

const titulo = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-pagina-titulo",
  display: "swap",
});

const corpo = Figtree({
  subsets: ["latin"],
  variable: "--font-pagina-corpo",
  display: "swap",
});

export const metadata: Metadata = {
  // o título e a indexação de verdade vêm da página, com os dados dela;
  // isto é o fallback de quem cair num endereço que não existe
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

export default function PaginaCerimonialistaLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${titulo.variable} ${corpo.variable}`}>{children}</div>;
}
