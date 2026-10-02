// As cores do Convite 05 (Livro envelhecido) por papel, e as paletas que a
// noiva escolhe. ORIGINAL é o desenho (hex copiados literal); cada paleta dá
// o hex novo de cada papel, com as mesmas relações de claro e escuro do
// original. A paleta é a encadernação (couro, costura, gravado e o dourado da
// capa e da contracapa) e o escuro em volta do livro. O miolo não entra: é do
// objeto, vale em toda paleta —
//  - o papel envelhecido e o que o envelhece: as páginas (#e8d5ac #e6d2a7), a
//    guarda (#d6bf92), o corte das folhas (#dcc596 #b99c68), o verso da página
//    que vira (#c4a979 #efe0bd #d9c294, borda rgba #6e461e), o passe-partout da
//    foto (#f3e8cf, sombra rgba #3c230f), a sombra da dobra (#2a1a0e), as
//    bordas queimadas (rgba #5f3712 #55300f #3c200a #5a3714) e as manchas,
//    vincos, queimados, luz e sombra da textura da lógica (rgba #784619
//    #734418 #5a3412 #fff5dc #82501c #7d4b19 #fff0cd #41240c, e o ruído, dado
//    em frações);
//  - a tinta sépia (#3b2a1a #5a3f26 #7a4e2a #6b4a2b);
//  - o bronze da chave e dos rebites (#e3c48a #a9844e #6b4e28 #5e4423) e o
//    #9a7440, que é dos rebites e também dos ornamentos das páginas;
//  - as cantoneiras da foto (#2e2117).
// O brilho e as manchas da textura do couro estão na lógica, dentro de
// this.ajustar(); o ruído do couro (frações) fica como no desenho.

import type { PaletaDoConvite } from "../../motor/modelo";

export const ORIGINAL = {
  /** o body e o fundo do convite: o escuro em volta do livro */
  fundo: "#1a130e",
  /** o claro do degradê da primeira cena (a luz no centro) */
  fundoClaro: "#3a2a1e",
  /** o escuro do degradê da primeira cena */
  fundoEscuro: "#140e0a",
  /** o couro do volume e da contracapa, e a borda dele por dentro da capa */
  couro: "#3e2a1c",
  /** a capa */
  couroCapa: "#4b3323",
  /** a tira que fecha o livro */
  couroTira: "#33221a",
  /** a presilha da tira, onde ficam os rebites */
  couroFecho: "#4f3626",
  /** o monograma e a data gravados na capa, mais escuros que o couro */
  gravado: "#2f1f15",
  /** a costura em x junto à lombada */
  costura: "#a87048",
  /** a luz nos frisos e no gravado do couro (só em rgba) */
  realceDoCouro: "#e6be8c",
  /** o brilho da textura do couro (rgba, na lógica) */
  brilhoDoCouro: "#c89664",
  /** as manchas da textura do couro (rgba, na lógica) */
  manchaDoCouro: "#785032",
  /** texto e botão sobre o escuro, na capa e na contracapa */
  creme: "#ecdcbc",
  /** o dourado sobre o escuro: rótulo e traço da capa, borda e fundo do botão */
  ouro: "#c9a46a",
  /** o dourado claro da contracapa: a frase, o &, a seta e os pontos */
  ouroClaro: "#d9b97f",
} as const;

export type PapelDaCor = keyof typeof ORIGINAL;

/** Os três papéis que a amostra da paleta mostra no seletor. */
export const AMOSTRA: readonly PapelDaCor[] = ["couroCapa", "creme", "ouroClaro"];

export const PALETAS: PaletaDoConvite<PapelDaCor>[] = [
  { id: "original", nome: "Tabaco e ouro", cores: { ...ORIGINAL } },
  {
    id: "bordo",
    nome: "Bordô e ouro",
    cores: {
      fundo: "#1d1111",
      fundoClaro: "#402526",
      fundoEscuro: "#160c0d",
      couro: "#4f1c20",
      couroCapa: "#5d2328",
      couroTira: "#3f191b",
      couroFecho: "#61272b",
      gravado: "#3b1618",
      costura: "#a37b47",
      realceDoCouro: "#e8baa6",
      brilhoDoCouro: "#cc9181",
      manchaDoCouro: "#864447",
      creme: "#f0dabd",
      ouro: "#c9a46a",
      ouroClaro: "#d9b97f",
    },
  },
  {
    id: "musgo",
    nome: "Verde-musgo e ouro",
    cores: {
      fundo: "#0f1711",
      fundoClaro: "#203325",
      fundoEscuro: "#0b110c",
      couro: "#1c3624",
      couroCapa: "#24412c",
      couroTira: "#192c1e",
      couroFecho: "#27442f",
      gravado: "#15281a",
      costura: "#a87048",
      realceDoCouro: "#c9c8a7",
      brilhoDoCouro: "#9da781",
      manchaDoCouro: "#42644b",
      creme: "#e8ddbd",
      ouro: "#c9a46a",
      ouroClaro: "#d9b97f",
    },
  },
  {
    id: "marinho",
    nome: "Azul-marinho e ouro",
    cores: {
      fundo: "#0f151e",
      fundoClaro: "#212e46",
      fundoEscuro: "#0b0f17",
      couro: "#1f2f4b",
      couroCapa: "#273959",
      couroTira: "#1a263d",
      couroFecho: "#2a3c5d",
      gravado: "#172339",
      costura: "#a77c51",
      realceDoCouro: "#b9c8d8",
      brilhoDoCouro: "#8fa4bc",
      manchaDoCouro: "#485b7c",
      creme: "#e7ddc4",
      ouro: "#c9a46a",
      ouroClaro: "#d9b97f",
    },
  },
];
