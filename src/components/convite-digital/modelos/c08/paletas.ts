// As cores do Convite 08 (Veneza · Cortina de teatro) por papel, e as
// paletas que a noiva escolhe. ORIGINAL é o desenho (hex copiados literal);
// cada paleta dá o hex novo de cada papel, com as mesmas relações de claro e
// escuro do original. Os papéis que o 08 divide com o 06 (as cenas
// venezianas) têm o nome, o id de paleta e o hex do 06, para os venezianos
// responderem igual à mesma escolha. Só o 08 tem as listras da cortina e a
// bambinela (veludoSombra, bambinela, veludoBrilho): em cada paleta elas
// guardam com o carmim a mesma razão de contraste do desenho.
//
// O veludo acompanha a paleta (o carmim das cortinas é o mesmo dos rótulos
// sobre o papel) e o metal também: o ouro do lustre, do galão da bambinela,
// do relógio, da lanterna e do botão vira prata no grafite. Não entram,
// porque valem em toda paleta: o cristal e a luz do lustre (#fff6e2 #ffe6a8
// #ffe2a0 #ffd282, e o #ffdc96 do brilho, na lógica), a luz da lanterna
// (#ffe1a0 #ffd68c #ffe2aa), o azul esmaltado do relógio da Torre
// dell'Orologio, que é também a noite no canal da cena do local (#1f3b57
// #14223a #2d5578 #14283f) — e, por ser o mesmo hex, os losangos azuis da
// frase —, a água sob a foto (#cfd8dc #b9c7cd) e a cidade do final: o céu do
// entardecer e a laguna (#121c33 #2a3358 #7a4660 #e0875a #26334c #111a29), o
// sol (#ffe0a6 #f2955f), a silhueta, o reflexo e as janelas acesas (#160f1c
// #0b0810 #ffd88a). Branco e preto (sombras, o reflexo da foto, as linhas da
// água) nunca entram.

import type { PaletaDoConvite } from "../../motor/modelo";

export const ORIGINAL = {
  /** o fundo da página (body) e o que aparece entre uma cena e outra */
  fundo: "#1a0c10",
  /** a dobra funda do veludo das cortinas */
  veludoSombra: "#3e0812",
  /** o alto da bambinela, a faixa de veludo sobre as cortinas */
  bambinela: "#5a0f1c",
  /** o veludo das cortinas e da bambinela; rótulos sobre o papel, nomes da frase, a dica nas cenas claras, o losango do meio */
  carmim: "#7a1626",
  /** o brilho da dobra do veludo */
  veludoBrilho: "#a32a38",
  /** a sombra do ouro: lustre, galão da bambinela, relógio */
  ouroEscuro: "#8c6a34",
  /** o dourado sobre o papel: arcos, "&", divisórias, losangos */
  ouroVelho: "#b48a4a",
  /** o ouro do meio: lustre, relógio, lanterna, ondas do local, botão */
  ouro: "#c9a15e",
  /** o dourado sobre o escuro: rótulos, traço da abertura, dica e pontos */
  champanhe: "#d9b97f",
  /** algarismos, estrelas e centro do relógio */
  ouroClaro: "#e6c789",
  /** o brilho do ouro: lustre, galão, relógio, ponteiro, começo do botão */
  ouroLuz: "#f3dca6",
  /** o texto da abertura, sobre o veludo */
  creme: "#efe0c4",
  /** o texto da cena do local */
  cremeNoite: "#efe4d2",
  /** o texto do final */
  cremeFinal: "#f6ece0",
  /** a frase do final e o "&" dos nomes */
  ouroFinal: "#f0d6a4",
  /** o texto do botão */
  tintaBotao: "#2a1a1e",
  /** o texto sobre o papel; os pontos nas cenas claras */
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
} as const;

export type PapelDaCor = keyof typeof ORIGINAL;

/** Os três papéis que a amostra da paleta mostra no seletor. */
export const AMOSTRA: readonly PapelDaCor[] = ["carmim", "papel", "ouro"];

export const PALETAS: PaletaDoConvite<PapelDaCor>[] = [
  { id: "original", nome: "Carmim e ouro", cores: { ...ORIGINAL } },
  {
    id: "esmeralda",
    nome: "Esmeralda e ouro",
    cores: {
      fundo: "#09130f",
      veludoSombra: "#06251c",
      bambinela: "#0b3629",
      carmim: "#0e4a37",
      veludoBrilho: "#20664e",
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
    },
  },
  {
    id: "ameixa",
    nome: "Ameixa e ouro",
    cores: {
      fundo: "#170a14",
      veludoSombra: "#3c0f34",
      bambinela: "#521a48",
      carmim: "#682a5c",
      veludoBrilho: "#8b3f7c",
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
    },
  },
  {
    id: "grafite",
    nome: "Grafite e prata",
    cores: {
      fundo: "#121315",
      veludoSombra: "#1f2126",
      bambinela: "#2d2f36",
      carmim: "#3e4149",
      veludoBrilho: "#565a65",
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
    },
  },
];
