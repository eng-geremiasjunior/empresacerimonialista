import localFont from "next/font/local";

// As fontes do convite (/c, /confirmar e /entrada), declaradas UMA vez:
// declarar a mesma família em dois arquivos quebra o build de produção.
// Desde os modelos de site (01/10/2026) são locais (src/fontes/site, OFL),
// porque o next/font/google já derrubou build sem cache na Vercel.
//
// Moram aqui, e não em fontes-site, de propósito: o next/font pré-carrega
// toda fonte com preload do grafo de módulos da rota. Se o convite
// importasse fontes-site, /c passaria a pré-carregar também a Marcellus e
// a puxar as ~20 @font-face dos pares. fontes-site importa daqui, nunca o
// contrário.
//
// Com preload (o convite já pré-carregava as duas) e com as variáveis que
// os layouts usam. EB Garamond é serifada: o fallback ajustado é medido
// contra Times, não Arial (o padrão do next/font/local).

export const garamond = localFont({
  src: [
    { path: "../fontes/site/EBGaramond-latin-var.woff2", weight: "400 800", style: "normal" },
    { path: "../fontes/site/EBGaramond-italic-latin-var.woff2", weight: "400 800", style: "italic" },
  ],
  variable: "--fonte-portal-titulo",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

export const jost = localFont({
  src: "../fontes/site/Jost-latin-var.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--fonte-portal-corpo",
  display: "swap",
  fallback: ["sans-serif"],
});
