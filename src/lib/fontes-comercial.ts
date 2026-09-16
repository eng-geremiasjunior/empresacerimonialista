import { Newsreader } from "next/font/google";

// A serifada da Gestão comercial, declarada UMA vez e importada pelas
// telas que a usam (Propostas e Relatório). next/font resolve a família
// na compilação do módulo, e declarar a mesma família em páginas irmãs
// quebra o build de produção (lição do /confirmar; o dev não reclama).
//
// Fica fora do layout do painel para não pesar nas outras telas, que
// seguem com a tipografia atual.

export const serifComercial = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif-orcamentos",
  display: "swap",
  // O next/font não tem métricas de fallback para esta família e avisa no
  // build; declarar a fonte de reserva resolve e evita o salto de layout.
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});
