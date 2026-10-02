// As cores do Convite 01 (Violino) por papel, e as paletas que a noiva
// escolhe. ORIGINAL é o desenho (hex copiados literal); cada paleta dá o hex
// novo de cada papel, com as mesmas relações de claro e escuro do original.
// As cores do arco do violino (madeira #3b2a1c #6b4a2b #8a5f36 #a87a4a e
// crina #e9dcc2 #f3ead6) não entram: são do objeto, valem em toda paleta.

import type { PaletaDoConvite } from "../../motor/modelo";

export const ORIGINAL = {
  /** fundo da abertura e do final, o disco do monograma, o body */
  noite: "#141b2c",
  /** o claro do degradê da abertura e do final */
  noiteClara: "#2c3858",
  /** texto e botão sobre o escuro */
  creme: "#f3ece0",
  /** o dourado sobre o escuro: cordas, rótulos, pontos */
  champanhe: "#dcc393",
  /** o dourado sobre o papel: linhas, moldura, cordas laterais */
  ouro: "#b08d57",
  /** rótulos dourados sobre o papel */
  ouroTexto: "#86652f",
  /** o texto */
  tinta: "#1f2a44",
  /** o fundo das cenas claras */
  papel: "#fcf8f1",
  /** texto secundário */
  cinza: "#586074",
  linha: "#e4d9c7",
  /** as linhas da data e os pontos apagados */
  linhaForte: "#c3b49c",
} as const;

export type PapelDaCor = keyof typeof ORIGINAL;

/** Os três papéis que a amostra da paleta mostra no seletor. */
export const AMOSTRA: readonly PapelDaCor[] = ["noite", "papel", "ouro"];

export const PALETAS: PaletaDoConvite<PapelDaCor>[] = [
  { id: "original", nome: "Azul-noite e ouro", cores: { ...ORIGINAL } },
  {
    id: "musgo",
    nome: "Verde-musgo e ouro",
    cores: {
      noite: "#142019",
      noiteClara: "#2b4033",
      creme: "#f2ede1",
      champanhe: "#dcc393",
      ouro: "#b08d57",
      ouroTexto: "#80612c",
      tinta: "#1f3327",
      papel: "#fbf9f2",
      cinza: "#56645b",
      linha: "#e2dccb",
      linhaForte: "#bfb79c",
    },
  },
  {
    id: "bordo",
    nome: "Bordô e ouro",
    cores: {
      noite: "#23121a",
      noiteClara: "#4a2433",
      creme: "#f5ebe3",
      champanhe: "#dfc394",
      ouro: "#b08d57",
      ouroTexto: "#84602e",
      tinta: "#3e1a28",
      papel: "#fcf7f3",
      cinza: "#6b5a60",
      linha: "#eadbd2",
      linhaForte: "#c9b3a6",
    },
  },
  {
    id: "grafite",
    nome: "Grafite e prata",
    cores: {
      noite: "#17181b",
      noiteClara: "#33363d",
      creme: "#f1f1ee",
      champanhe: "#cfd2d6",
      ouro: "#9a9ea6",
      ouroTexto: "#5c6068",
      tinta: "#222429",
      papel: "#f8f8f6",
      cinza: "#5d6068",
      linha: "#e1e2e4",
      linhaForte: "#b5b8be",
    },
  },
];
