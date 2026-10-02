// As cores do Convite 04 (Folha que se abre) por papel, e as paletas que a
// noiva escolhe. ORIGINAL é o desenho (hex copiados literal); cada paleta dá
// o hex novo de cada papel, com as mesmas relações de claro e escuro do
// original. Aqui não há cor de objeto fixo: o cartão, a dobrinha que vira a
// página e o dourado em folha seguem a paleta. Ficam de fora só o preto da
// sombra do cartão fechado e o branco do brilho do vinco (rgba): são luz e
// sombra, valem em toda paleta.
// As três alternativas mantêm o dourado do desenho e trocam a contracapa, a
// tinta e o tom do papel. Contraste nas três: tinta sobre o papel ≥ 12:1;
// cinza ≥ 4,6:1 (também no linho); creme e champanhe sobre o escuro ≥ 5,3:1.

import type { PaletaDoConvite } from "../../motor/modelo";

export const ORIGINAL = {
  /** o fundo atrás das páginas, o body */
  fundo: "#2f2b27",
  /** a contracapa escura: a borda do degradê da abertura e do final */
  contracapa: "#2b2824",
  /** o claro do degradê da abertura e do final */
  contracapaLuz: "#4a443d",
  /** texto e botão sobre o escuro */
  creme: "#f3ece1",
  /** o dourado sobre o escuro: rótulo da abertura, frase final, "&", seta e pontos */
  champanhe: "#d9c08a",
  /** o dourado dos detalhes: filetes, molduras, losangos, borda do cartão e do botão */
  ouro: "#b8975a",
  /** o brilho do dourado em folha (monograma e "&" dos nomes) */
  ouroClaro: "#ecd9a6",
  /** o começo do dourado em folha */
  ouroVelho: "#9a7a42",
  /** o fim do dourado em folha */
  ouroEscuro: "#8e6d38",
  /** o texto sobre o papel, as sombras e os pontos */
  tinta: "#2d2a26",
  /** texto secundário e rótulos sobre o papel */
  cinza: "#766c60",
  /** o papel do cartão: nomes, foto, local e a aba aberta */
  marfim: "#faf6ef",
  /** a capa do cartão fechado, com o monograma */
  capa: "#f7f2e9",
  /** o papel das páginas da frase e da data */
  linho: "#f4eee4",
  /** a dobrinha que vira a página: a luz no meio */
  dobraLuz: "#fdfaf4",
  /** a ponta da dobrinha */
  dobraPonta: "#ece2d1",
  /** o lado do vinco da dobrinha, na sombra */
  dobraSombra: "#d6c9b2",
} as const;

export type PapelDaCor = keyof typeof ORIGINAL;

/** Os três papéis que a amostra da paleta mostra no seletor. */
export const AMOSTRA: readonly PapelDaCor[] = ["contracapa", "marfim", "ouro"];

export const PALETAS: PaletaDoConvite<PapelDaCor>[] = [
  { id: "original", nome: "Café e ouro", cores: { ...ORIGINAL } },
  {
    id: "oliva",
    nome: "Verde-oliva e ouro",
    cores: {
      fundo: "#292e1d",
      contracapa: "#262b1a",
      contracapaLuz: "#43482f",
      creme: "#f0ede1",
      champanhe: "#d9c08a",
      ouro: "#b8975a",
      ouroClaro: "#ecd9a6",
      ouroVelho: "#9a7a42",
      ouroEscuro: "#8e6d38",
      tinta: "#272d1e",
      cinza: "#6a6c5a",
      marfim: "#f9f7ef",
      capa: "#f5f3e9",
      linho: "#f2efe4",
      dobraLuz: "#fcfaf4",
      dobraPonta: "#e8e4d1",
      dobraSombra: "#d1cbb2",
    },
  },
  {
    id: "marinho",
    nome: "Azul-marinho e ouro",
    cores: {
      fundo: "#1f2c42",
      contracapa: "#1c2840",
      contracapaLuz: "#344563",
      creme: "#f1ede4",
      champanhe: "#d9c08a",
      ouro: "#b8975a",
      ouroClaro: "#ecd9a6",
      ouroVelho: "#9a7a42",
      ouroEscuro: "#8e6d38",
      tinta: "#1e2a41",
      cinza: "#606b7b",
      marfim: "#f9f6f0",
      capa: "#f6f2eb",
      linho: "#f2eee6",
      dobraLuz: "#fcfaf5",
      dobraPonta: "#e9e3d5",
      dobraSombra: "#d3cab7",
    },
  },
  {
    id: "bordo",
    nome: "Bordô e ouro",
    cores: {
      fundo: "#441e26",
      contracapa: "#411a23",
      contracapaLuz: "#65343c",
      creme: "#f6ebe2",
      champanhe: "#d9c08a",
      ouro: "#b8975a",
      ouroClaro: "#ecd9a6",
      ouroVelho: "#9a7a42",
      ouroEscuro: "#8e6d38",
      tinta: "#411e24",
      cinza: "#7b6464",
      marfim: "#fcf5f0",
      capa: "#f9f1ea",
      linho: "#f6ede5",
      dobraLuz: "#fff9f5",
      dobraPonta: "#f0e0d3",
      dobraSombra: "#dcc6b4",
    },
  },
];
