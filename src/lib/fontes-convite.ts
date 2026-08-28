import { EB_Garamond, Jost } from "next/font/google";

// As fontes do convite, declaradas UMA vez e importadas pelos dois
// layouts (/confirmar e /c). Declarar a mesma família em arquivos
// irmãos quebra o build de produção — a lição está no comentário
// original do layout de /confirmar.

export const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--fonte-portal-titulo",
  display: "swap",
});

export const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--fonte-portal-corpo",
  display: "swap",
});
