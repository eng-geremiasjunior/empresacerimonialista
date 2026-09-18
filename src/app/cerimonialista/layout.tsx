import type { Metadata } from "next";
import { Archivo, Bodoni_Moda, EB_Garamond, Gilda_Display, Jost, Manrope } from "next/font/google";
import "./vitrine.css";
import "./capitulos.css";
import "./curadoria.css";

// A vitrine profissional tem dois modelos, cada um com a sua voz:
//   * Clássico: EB Garamond nos títulos e citações, Jost no texto (a voz do
//     portal da cliente; desenho do Claude Design, 16/09/2026);
//   * Capítulos: Bodoni Moda nos títulos e numerais, Archivo no texto
//     (Claude Design, "Modelo 3 — Capítulos", 16/09/2026);
//   * Curadoria: Gilda Display no nome, títulos, citações e numerais,
//     Manrope na interface (Claude Design, "Modelo 5 — Curadoria",
//     18/09/2026).
// Não é o painel do eOrganizei: a área profissional (Inter / Instrument
// Sans) não entra aqui.
//
// As fontes moram no layout e não na página: next/font resolve a família
// na compilação do módulo, e declarar a mesma família em arquivos irmãos
// quebra o build de produção (lição do /confirmar). Variáveis próprias,
// porque o desenho usa o peso 600 da Jost, que o portal não carrega.
//
// As do Capítulos e da Curadoria não são pré-carregadas: a rota é a mesma para os dois
// modelos, e a vitrine clássica não deve baixar fonte que não usa (sem o
// aviso antecipado, o navegador só busca a fonte quando a folha a pede).

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

// variável com o eixo óptico: o desenho pede opsz de 6 a 96, e o navegador
// escolhe o desenho da letra pelo tamanho (títulos finos, numerais firmes)
const capTitulo = Bodoni_Moda({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--fonte-cap-titulo",
  display: "swap",
  preload: false,
  // o next/font não tem as medidas de reserva desta família e avisa;
  // declarar a reserva resolve (mesmo caso da Newsreader, em Propostas)
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

const capCorpo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fonte-cap-corpo",
  display: "swap",
  preload: false,
});

const cuTitulo = Gilda_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--fonte-cu-titulo",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const cuCorpo = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--fonte-cu-corpo",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // o título e a indexação de verdade vêm da página, com os dados dela;
  // isto é o fallback de quem cair num endereço que não existe
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

export default function PaginaCerimonialistaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${titulo.variable} ${corpo.variable} ${capTitulo.variable} ${capCorpo.variable} ${cuTitulo.variable} ${cuCorpo.variable}`}
    >
      {children}
    </div>
  );
}
