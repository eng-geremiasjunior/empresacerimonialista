import localFont from "next/font/local";

// As fontes do portal dos noivos (desenho v4, 30/09/2026), declaradas UMA
// vez (declarar a mesma família em dois arquivos quebra o build de
// produção) e servidas do repositório: o next/font/google já derrubou
// build sem cache na Vercel (memória "redeploy sem cache").
//
//   Marcellus         — títulos, números, nomes, iniciais (OFL)
//   Nunito Sans       — toda a interface; variável, com tamanho óptico (OFL)
//   Material Symbols  — os ícones, só o subconjunto que o desenho usa
//                       (~80 ícones, 76 KB contra ~4 MB do arquivo cheio;
//                       Apache 2.0). Ícone novo = baixar de novo com o nome
//                       incluído em `icon_names` (lista em ferramentas).

export const marcellus = localFont({
  src: "../fontes/noivos/Marcellus-latin.woff2",
  weight: "400",
  style: "normal",
  variable: "--pn-f-titulo",
  display: "swap",
});

export const nunitoSans = localFont({
  src: "../fontes/noivos/NunitoSans-latin-var.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--pn-f-corpo",
  display: "swap",
});

export const simbolos = localFont({
  src: "../fontes/noivos/MaterialSymbolsRounded-sub.woff2",
  weight: "200 500",
  style: "normal",
  variable: "--pn-f-icone",
  // block: sem a fonte, o nome do ícone apareceria como texto
  display: "block",
});
