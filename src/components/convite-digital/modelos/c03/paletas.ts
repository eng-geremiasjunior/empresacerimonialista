// As cores do Convite 03 (Conto de fadas) por papel, e as paletas que a
// noiva escolhe. ORIGINAL é o desenho (hex copiados literal); cada paleta dá
// o hex novo de cada papel, com as mesmas relações de claro e escuro do
// original. A luz quase branca não entra: as estrelas e a estrela cadente
// (#fff3dc) com o halo delas (#ffecc8), as faíscas claras (#fff6e6) e o
// reflexo que passa na foto (#fff6e2 #fffaf0; #fffaf0 é também o miolo da luz
// dos portões) são luz, valem em toda paleta. O resto da luz dos portões
// entra (luz, luzBorda): o tom dela acompanha o metal. Branco e preto nunca
// entram (o realce e as sombras do brasão e do botão).

import type { PaletaDoConvite } from "../../motor/modelo";

export const ORIGINAL = {
  /** o escuro do degradê da abertura e do final, o fundo do convite, o body */
  noite: "#2e1b2e",
  /** o claro do degradê da abertura e do final */
  noiteClara: "#6b4560",
  /** texto sobre o escuro */
  creme: "#f6ece6",
  /** o dourado sobre o escuro (rótulo, moldura do portão, título e & do final), a poeira, as gemas da tiara, o arco da transição */
  champanhe: "#e6cf9a",
  /** o dourado das linhas: portões, tiara, enfeites, moldura da foto, relógio, castelo; o meio do brasão e o fim do botão */
  ouro: "#c6a15b",
  /** o brilho do ouro: o realce do brasão, o começo do botão, o pulso do brasão, as faíscas */
  ouroClaro: "#f1d9a4",
  /** a borda escura do brasão */
  ouroEscuro: "#9c7a3c",
  /** o aro fino dentro do brasão */
  ouroSombra: "#785828",
  /** a luz atrás dos portões e o halo dela */
  luz: "#f6deb0",
  /** a borda da luz atrás dos portões */
  luzBorda: "#e5b98c",
  /** o texto das cenas claras, as iniciais do brasão, os ponteiros e as marcas do relógio, o texto do botão */
  tinta: "#3a2433",
  /** o fundo das cenas claras (nomes, foto, local), o mostrador, a face dos portões */
  papel: "#fbf3ef",
  /** o fundo da frase e da data, um tom abaixo do papel */
  papelRosado: "#f6e8e3",
  /** a borda da folha esquerda do portão (degradê até o papel) */
  portao: "#f3e2d8",
  /** a borda da folha direita, mais sombreada */
  portaoSombra: "#ead5ca",
  /** o acento: rótulos, "Era uma vez...", o & dos nomes, o ponteiro dos minutos, a dica */
  rosa: "#9c5265",
  /** as bandeiras do castelo e a pedra do meio da tiara */
  rosaClaro: "#d98b98",
  /** texto secundário: o convite, a legenda da foto, o endereço */
  cinza: "#7a6270",
} as const;

export type PapelDaCor = keyof typeof ORIGINAL;

/** Os três papéis que a amostra da paleta mostra no seletor. */
export const AMOSTRA: readonly PapelDaCor[] = ["noite", "papel", "ouro"];

export const PALETAS: PaletaDoConvite<PapelDaCor>[] = [
  { id: "original", nome: "Ameixa e ouro", cores: { ...ORIGINAL } },
  {
    id: "noite",
    nome: "Azul-noite e ouro",
    cores: {
      noite: "#172036",
      noiteClara: "#43507a",
      creme: "#f3efe8",
      champanhe: "#e6cf9a",
      ouro: "#c6a15b",
      ouroClaro: "#f1d9a4",
      ouroEscuro: "#9c7a3c",
      ouroSombra: "#785828",
      luz: "#f6deb0",
      luzBorda: "#e5b98c",
      tinta: "#1f2a44",
      papel: "#faf8f3",
      papelRosado: "#f2efe7",
      portao: "#ebe6dc",
      portaoSombra: "#e0dace",
      rosa: "#4c6094",
      rosaClaro: "#8b9ccb",
      cinza: "#5f6579",
    },
  },
  {
    id: "esmeralda",
    nome: "Verde-esmeralda e ouro",
    cores: {
      noite: "#13281f",
      noiteClara: "#2f5948",
      creme: "#f2efe6",
      champanhe: "#e6cf9a",
      ouro: "#c6a15b",
      ouroClaro: "#f1d9a4",
      ouroEscuro: "#9c7a3c",
      ouroSombra: "#785828",
      luz: "#f6deb0",
      luzBorda: "#e5b98c",
      tinta: "#1c3329",
      papel: "#f7f8f2",
      papelRosado: "#eef0e7",
      portao: "#e6e8dc",
      portaoSombra: "#dadecf",
      rosa: "#2f6b56",
      rosaClaro: "#78ad96",
      cinza: "#5d6b63",
    },
  },
  {
    id: "lavanda",
    nome: "Lavanda e prata",
    cores: {
      noite: "#211e33",
      noiteClara: "#4f4977",
      creme: "#f2f0f7",
      champanhe: "#d4d5e2",
      ouro: "#a3a6b8",
      ouroClaro: "#e4e6ef",
      ouroEscuro: "#7a7d92",
      ouroSombra: "#555870",
      luz: "#e3e1f1",
      luzBorda: "#bfb9da",
      tinta: "#2a2740",
      papel: "#f8f7fb",
      papelRosado: "#f0eff6",
      portao: "#e8e4ef",
      portaoSombra: "#dcd7e6",
      rosa: "#6a5c96",
      rosaClaro: "#a899d0",
      cinza: "#66637c",
    },
  },
];
