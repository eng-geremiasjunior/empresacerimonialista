// As cores do Convite 06 (Veneza · Máscara de baile) por papel, e as paletas
// que a noiva escolhe. ORIGINAL é o desenho (hex copiados literal); cada
// paleta dá o hex novo de cada papel, com as mesmas relações de claro e
// escuro do original. Não entram as cores da cidade, que valem em toda
// paleta: o céu do entardecer e a laguna do final (#121c33 #2a3358 #7a4660
// #e0875a #26334c #111a29), o sol (#ffe0a6 #f2955f), a silhueta, o reflexo e
// as janelas acesas (#160f1c #0b0810 #ffd88a), a água sob a foto (#cfd8dc
// #b9c7cd), a luz da lanterna (#ffe1a0 #ffd68c #ffe2aa) e o azul esmaltado
// do relógio da Torre dell'Orologio, que é também a noite no canal da cena
// do local (#1f3b57 #14223a #2d5578 #14283f) — e, por ser o mesmo hex, os
// losangos azuis da frase. O metal muda com a paleta: o ouro da máscara, do
// relógio e da lanterna vira prata no grafite.

import type { PaletaDoConvite } from "../../motor/modelo";

export const ORIGINAL = {
  /** o fundo da página (body) e o que aparece entre uma cena e outra */
  fundo: "#1a0c10",
  /** o veludo da abertura, na borda */
  veludoEscuro: "#1e0409",
  /** o veludo da abertura, no meio: onde ficam os textos */
  veludo: "#4a0b16",
  /** o centro do veludo; rótulos sobre o papel, nomes da frase, a dica nas cenas claras, o losango do meio */
  carmim: "#7a1626",
  /** a pedra no alto da máscara */
  joia: "#8a2a35",
  /** o traço desenhado sobre a máscara */
  bronze: "#5e4320",
  /** a sombra do ouro: máscara, relógio */
  ouroEscuro: "#8c6a34",
  /** o dourado sobre o papel: arcos, "&", divisórias, losangos */
  ouroVelho: "#b48a4a",
  /** o ouro do meio: máscara, relógio, lanterna, ondas do local, botão */
  ouro: "#c9a15e",
  /** o dourado sobre o escuro: rótulos, traço da abertura, dica e pontos */
  champanhe: "#d9b97f",
  /** algarismos, estrelas e centro do relógio; o reflexo na máscara */
  ouroClaro: "#e6c789",
  /** o brilho do ouro: máscara, relógio, ponteiro, começo do botão */
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
      veludoEscuro: "#03120b",
      veludo: "#082c20",
      carmim: "#0e4a37",
      joia: "#195a44",
      bronze: "#5e4320",
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
      veludoEscuro: "#180513",
      veludo: "#3d1036",
      carmim: "#682a5c",
      joia: "#7a356b",
      bronze: "#5e4320",
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
      veludoEscuro: "#0b0c0e",
      veludo: "#222429",
      carmim: "#3e4149",
      joia: "#4b4f58",
      bronze: "#484b52",
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
