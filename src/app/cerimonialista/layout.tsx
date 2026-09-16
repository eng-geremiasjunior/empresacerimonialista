import type { Metadata } from "next";
import { EB_Garamond, Jost } from "next/font/google";
import "./vitrine.css";

// A vitrine profissional tem a voz do portal da cliente: EB Garamond nos
// títulos e citações, Jost no texto e na interface (desenho do Claude
// Design, 16/09/2026). Não é o painel do eOrganizei: a área profissional
// (Inter / Instrument Sans) não entra aqui.
//
// As fontes moram no layout e não na página: next/font resolve a família
// na compilação do módulo, e declarar a mesma família em arquivos irmãos
// quebra o build de produção (lição do /confirmar). Variáveis próprias,
// porque o desenho usa o peso 600 da Jost, que o portal não carrega.

const titulo = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--fonte-vitrine-titulo",
  display: "swap",
});

const corpo = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--fonte-vitrine-corpo",
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
