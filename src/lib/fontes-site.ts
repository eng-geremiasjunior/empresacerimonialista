import localFont from "next/font/local";
import { marcellus } from "./fonte-marcellus";
import { garamond, jost } from "./fontes-convite";

// As fontes dos 8 pares dos modelos de site (desenho de 30/09/2026),
// declaradas UMA vez (aqui, ou em fontes-convite e fonte-marcellus, de onde
// vêm reexportadas): declarar a mesma família em dois arquivos quebra o
// build de produção. Arquivos woff2 latin em src/fontes/site
// (OFL.txt junto), nunca next/font/google — já derrubou build sem cache
// na Vercel.
//
// preload:false em todas as dos pares: a raiz do site aponta, por
// variável CSS, só para as famílias do par do casal, e o navegador só
// baixa a @font-face que algum texto na tela usa. Com preload, todo site
// pré-carregaria as ~23 faces.
//
// Faixa de peso = a real do arquivo variável: os rótulos e botões 600 dos
// modelos 03–06 saem com o 600 de verdade (no protótipo eram negrito
// sintético). Jost, Italiana, Marcellus e Poiret One não têm itálico: o
// oblíquo sintético é o do protótipo, por isso nada de font-synthesis:none.
//
// O fallback ajustado do next/font/local é medido contra Arial por padrão:
// nas serifadas vai "Times New Roman", senão o título pisca sem serifa até
// a fonte chegar (e a maioria aqui é preload:false).
//
// next/font exige chamadas literais no topo do módulo: nada de laço.

// Marcellus (títulos e texto do par Riviera) é a do portal dos noivos, e
// EB Garamond e Jost são as do convite: reexportadas, sem redeclarar. O
// convite não importa este módulo (ver fontes-convite).
export { marcellus, garamond, jost };

// ---- texto e títulos ----

export const hanken = localFont({
  src: "../fontes/site/HankenGrotesk-latin-var.woff2",
  weight: "100 900",
  style: "normal",
  preload: false,
  display: "swap",
  fallback: ["sans-serif"],
});

// Bodoni Moda guarda o eixo opsz 6–96: o font-optical-sizing:auto do
// navegador ajusta o contraste pelo tamanho, como no desenho.
export const bodoni = localFont({
  src: [
    { path: "../fontes/site/BodoniModa-latin-var.woff2", weight: "400 900", style: "normal" },
    { path: "../fontes/site/BodoniModa-italic-latin-var.woff2", weight: "400 900", style: "italic" },
  ],
  preload: false,
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Didot", "Georgia", "serif"],
});

export const figtree = localFont({
  src: "../fontes/site/Figtree-latin-var.woff2",
  weight: "300 900",
  style: "normal",
  preload: false,
  display: "swap",
  fallback: ["sans-serif"],
});

export const italiana = localFont({
  src: "../fontes/site/Italiana-latin.woff2",
  weight: "400",
  style: "normal",
  preload: false,
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

export const cormorant = localFont({
  src: [
    { path: "../fontes/site/CormorantGaramond-latin-var.woff2", weight: "300 700", style: "normal" },
    { path: "../fontes/site/CormorantGaramond-italic-latin-var.woff2", weight: "300 700", style: "italic" },
  ],
  preload: false,
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

export const lora = localFont({
  src: [
    { path: "../fontes/site/Lora-latin-var.woff2", weight: "400 700", style: "normal" },
    { path: "../fontes/site/Lora-italic-latin-var.woff2", weight: "400 700", style: "italic" },
  ],
  preload: false,
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

export const poiret = localFont({
  src: "../fontes/site/PoiretOne-latin.woff2",
  weight: "400",
  style: "normal",
  preload: false,
  display: "swap",
  fallback: ["sans-serif"],
});

export const josefin = localFont({
  src: "../fontes/site/JosefinSans-latin-var.woff2",
  weight: "100 700",
  style: "normal",
  preload: false,
  display: "swap",
  fallback: ["sans-serif"],
});

export const playfair = localFont({
  src: [
    { path: "../fontes/site/PlayfairDisplay-latin-var.woff2", weight: "400 900", style: "normal" },
    { path: "../fontes/site/PlayfairDisplay-italic-latin-var.woff2", weight: "400 900", style: "italic" },
  ],
  preload: false,
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

export const baskerville = localFont({
  src: [
    { path: "../fontes/site/LibreBaskerville-latin.woff2", weight: "400", style: "normal" },
    { path: "../fontes/site/LibreBaskerville-italic-latin.woff2", weight: "400", style: "italic" },
  ],
  preload: false,
  display: "swap",
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "serif"],
});

// ---- as corsivas (só nos nomes) ----
// Sem ajuste de métrica: medir corsiva contra Times não aproxima nada.

export const pinyon = localFont({
  src: "../fontes/site/PinyonScript-latin.woff2",
  weight: "400",
  style: "normal",
  preload: false,
  display: "swap",
  adjustFontFallback: false,
  fallback: ["cursive"],
});

export const monsieur = localFont({
  src: "../fontes/site/MonsieurLaDoulaise-latin.woff2",
  weight: "400",
  style: "normal",
  preload: false,
  display: "swap",
  adjustFontFallback: false,
  fallback: ["cursive"],
});

export const sacramento = localFont({
  src: "../fontes/site/Sacramento-latin.woff2",
  weight: "400",
  style: "normal",
  preload: false,
  display: "swap",
  adjustFontFallback: false,
  fallback: ["cursive"],
});

// Chave curta de cada família, para os pares apontarem sem repetir o
// objeto. Só os nomes resolvidos (font.style.fontFamily) saem daqui.
export type FamiliaDoSite =
  | "jost"
  | "hanken"
  | "bodoni"
  | "figtree"
  | "italiana"
  | "garamond"
  | "pinyon"
  | "cormorant"
  | "monsieur"
  | "marcellus"
  | "sacramento"
  | "lora"
  | "poiret"
  | "josefin"
  | "playfair"
  | "baskerville";

export const FAMILIAS: Record<FamiliaDoSite, string> = {
  jost: jost.style.fontFamily,
  hanken: hanken.style.fontFamily,
  bodoni: bodoni.style.fontFamily,
  figtree: figtree.style.fontFamily,
  italiana: italiana.style.fontFamily,
  garamond: garamond.style.fontFamily,
  pinyon: pinyon.style.fontFamily,
  cormorant: cormorant.style.fontFamily,
  monsieur: monsieur.style.fontFamily,
  // a do portal foi declarada sem fallback: a genérica entra aqui
  marcellus: `${marcellus.style.fontFamily}, serif`,
  sacramento: sacramento.style.fontFamily,
  lora: lora.style.fontFamily,
  poiret: poiret.style.fontFamily,
  josefin: josefin.style.fontFamily,
  playfair: playfair.style.fontFamily,
  baskerville: baskerville.style.fontFamily,
};
