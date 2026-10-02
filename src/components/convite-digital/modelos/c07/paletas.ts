// As cores do Convite 07 (Veneza · Lacre de cera) por papel, e as paletas
// que a noiva escolhe. ORIGINAL é o desenho (hex copiados literal); cada
// paleta dá o hex novo de cada papel, com as mesmas relações de claro e
// escuro do original. Depois da abertura as cenas são as mesmas do 06 e do
// 08: os papéis em comum têm o nome do 06 e, em cada paleta, o hex do 06,
// para os venezianos reagirem igual à mesma escolha.
//
// O envelope acompanha a paleta: a noite da abertura, o cartão, o lacre de
// cera e as faixas do papel marmorizado (a lógica passa essas faixas por
// this.ajustar), menos as duas azuis (#1f3b57 #2a4c6a), que são o azul de
// Veneza. Não entram as cores da cidade, que valem em toda paleta: o céu do
// entardecer e a laguna do final (#121c33 #2a3358 #7a4660 #e0875a #26334c
// #111a29), o sol (#ffe0a6 #f2955f), a silhueta, o reflexo e as janelas
// acesas (#160f1c #0b0810 #ffd88a), a água sob a foto (#cfd8dc #b9c7cd), a
// luz da lanterna (#ffe1a0 #ffd68c #ffe2aa) e o azul esmaltado do relógio da
// Torre dell'Orologio, que é também a noite no canal da cena do local
// (#1f3b57 #14223a #2d5578 #14283f) — e, por ser o mesmo hex, os losangos
// azuis da frase. O metal muda com a paleta: o ouro do relógio, da lanterna
// e do botão vira prata no grafite.

import type { PaletaDoConvite } from "../../motor/modelo";

export const ORIGINAL = {
  /** o fundo da página (body) e o que aparece entre uma cena e outra */
  fundo: "#1a0c10",
  /** a noite da abertura, na borda */
  noite: "#121a24",
  /** a noite da abertura, no centro */
  noiteClara: "#2a3a4c",
  /** rótulos sobre o papel, nomes da frase, a dica nas cenas claras, o losango do meio; faixa do mármore */
  carmim: "#7a1626",
  /** a sombra do ouro do relógio */
  ouroEscuro: "#8c6a34",
  /** o dourado sobre o papel: arcos, "&", divisórias, losangos, o filete do cartão; faixa do mármore */
  ouroVelho: "#b48a4a",
  /** o ouro do meio: relógio, lanterna, ondas do local, botão; faixa do mármore */
  ouro: "#c9a15e",
  /** o dourado sobre o escuro: rótulos, traço da abertura, dica e pontos */
  champanhe: "#d9b97f",
  /** algarismos, estrelas e centro do relógio */
  ouroClaro: "#e6c789",
  /** o brilho do ouro: relógio, ponteiro, começo do botão */
  ouroLuz: "#f3dca6",
  /** o texto da abertura */
  creme: "#efe0c4",
  /** o texto da cena do local */
  cremeNoite: "#efe4d2",
  /** o texto do final */
  cremeFinal: "#f6ece0",
  /** a frase do final e o "&" dos nomes */
  ouroFinal: "#f0d6a4",
  /** o texto do botão */
  tintaBotao: "#2a1a1e",
  /** o texto sobre o papel e os nomes no cartão; os pontos nas cenas claras */
  tinta: "#2f2420",
  /** texto secundário */
  tintaSuave: "#5a4038",
  /** o papel dos nomes, da foto e da data: centro */
  papel: "#fbf6ec",
  /** o papel dos nomes, da foto e da data: borda */
  papelSombra: "#efe3cf",
  /** o papel da frase: centro */
  pergaminho: "#f6ecdc",
  /** o papel da frase: borda */
  pergaminhoSombra: "#e9dcc6",
  /** o cartão que sobe do envelope */
  cartao: "#f7efe1",
  /** o lacre: o reflexo no alto */
  lacreClaro: "#c23a44",
  /** o lacre: o corpo */
  lacre: "#8a1a24",
  /** o lacre: a borda e as iniciais em relevo */
  lacreEscuro: "#5a0c14",
  /** o brilho sob as iniciais do lacre */
  lacreBrilho: "#ff9696",
  /** as faixas escuras do mármore */
  marmoreEscuro: "#5a0f1c",
  marmoreProfundo: "#3e0812",
  /** as faixas claras do mármore */
  marmoreCreme: "#e9dcc3",
  marmoreClaro: "#efe4d0",
} as const;

export type PapelDaCor = keyof typeof ORIGINAL;

/** Os três papéis que a amostra da paleta mostra no seletor (os mesmos do 06). */
export const AMOSTRA: readonly PapelDaCor[] = ["carmim", "papel", "ouro"];

export const PALETAS: PaletaDoConvite<PapelDaCor>[] = [
  { id: "original", nome: "Carmim e ouro", cores: { ...ORIGINAL } },
  {
    id: "esmeralda",
    nome: "Esmeralda e ouro",
    cores: {
      fundo: "#09130f",
      noite: "#0f1c17",
      noiteClara: "#273d36",
      carmim: "#0e4a37",
      ouroEscuro: "#8c6a34",
      ouroVelho: "#b48a4a",
      ouro: "#c9a15e",
      champanhe: "#d9b97f",
      ouroClaro: "#e6c789",
      ouroLuz: "#f3dca6",
      creme: "#efe0c4",
      cremeNoite: "#efe4d2",
      cremeFinal: "#f6ece0",
      ouroFinal: "#f0d6a4",
      tintaBotao: "#13231c",
      tinta: "#1f2d26",
      tintaSuave: "#3e4b44",
      papel: "#fbf8ef",
      papelSombra: "#ebe5d1",
      pergaminho: "#f5f0e1",
      pergaminhoSombra: "#e5dec8",
      cartao: "#f5f0e0",
      lacreClaro: "#227e5f",
      lacre: "#0e543c",
      lacreEscuro: "#063525",
      lacreBrilho: "#a6ddc9",
      marmoreEscuro: "#0a3628",
      marmoreProfundo: "#07241b",
      marmoreCreme: "#e5ddc7",
      marmoreClaro: "#ebe5d2",
    },
  },
  {
    id: "ameixa",
    nome: "Ameixa e ouro",
    cores: {
      fundo: "#170a14",
      noite: "#231521",
      noiteClara: "#493145",
      carmim: "#682a5c",
      ouroEscuro: "#8c6a34",
      ouroVelho: "#b48a4a",
      ouro: "#c9a15e",
      champanhe: "#d9b97f",
      ouroClaro: "#e6c789",
      ouroLuz: "#f3dca6",
      creme: "#efe0c4",
      cremeNoite: "#efe4d2",
      cremeFinal: "#f6ece0",
      ouroFinal: "#f0d6a4",
      tintaBotao: "#2a1624",
      tinta: "#2f2229",
      tintaSuave: "#574050",
      papel: "#fcf6f0",
      papelSombra: "#f0e2d6",
      pergaminho: "#f7ece2",
      pergaminhoSombra: "#eadacb",
      cartao: "#f8eee6",
      lacreClaro: "#a15390",
      lacre: "#7a2868",
      lacreEscuro: "#4f1642",
      lacreBrilho: "#efbee5",
      marmoreEscuro: "#4b1443",
      marmoreProfundo: "#320d2d",
      marmoreCreme: "#eadbcc",
      marmoreClaro: "#f0e3d7",
    },
  },
  {
    id: "grafite",
    nome: "Grafite e prata",
    cores: {
      fundo: "#121315",
      noite: "#18191c",
      noiteClara: "#36393e",
      carmim: "#3e4149",
      ouroEscuro: "#767b84",
      ouroVelho: "#8f939b",
      ouro: "#aaaeb6",
      champanhe: "#c4c7cd",
      ouroClaro: "#d4d7dc",
      ouroLuz: "#e9ebee",
      creme: "#e8e9eb",
      cremeNoite: "#eceef0",
      cremeFinal: "#f2f2f0",
      ouroFinal: "#dde0e5",
      tintaBotao: "#1f2125",
      tinta: "#24262a",
      tintaSuave: "#45484f",
      papel: "#f8f8f6",
      papelSombra: "#e6e6e3",
      pergaminho: "#f3f3f0",
      pergaminhoSombra: "#e0e0dc",
      cartao: "#f0f0ed",
      lacreClaro: "#6a6f7c",
      lacre: "#454954",
      lacreEscuro: "#2a2d35",
      lacreBrilho: "#d3d7df",
      marmoreEscuro: "#2a2d33",
      marmoreProfundo: "#1c1d22",
      marmoreCreme: "#deded9",
      marmoreClaro: "#e5e5e2",
    },
  },
];
