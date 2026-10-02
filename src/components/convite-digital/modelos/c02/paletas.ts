// As cores do Convite 02 (Praiano) por papel, e as paletas que a noiva
// escolhe. ORIGINAL é o desenho (hex copiados literal); cada paleta dá o hex
// novo de cada papel, com as mesmas relações de claro e escuro do original.
// A luz do sol não entra: o sol que nasce (#f6dcae #e8b778 #d9966a) e o que
// se põe (#fbe3b6 #efb57f #de8d63), os reflexos deles na água (as mesmas
// cores), o céu do pôr do sol no final (#f6ead9 #efcfae #e2a487 #c97e6c) e a
// luz sobre a foto (#fff6e2 #fff0d6) valem em toda paleta. A espuma é branca
// e o grão vem como matriz de cor na lógica: nenhum dos dois muda. O mar muda
// de tom com a paleta, mas segue sendo mar.

import type { PaletaDoConvite } from "../../motor/modelo";

export const ORIGINAL = {
  /** o fundo da abertura, da frase e da data; a raiz e o body */
  areia: "#f3ebdf",
  /** o fundo dos nomes, da foto e do local; o texto do botão */
  papel: "#faf6ef",
  /** o texto, a linha do horizonte, o botão, os pontos e a sombra da foto */
  tinta: "#1f3d44",
  /** texto secundário: a legenda da foto e o endereço */
  cinza: "#4e6262",
  /** rótulos, o "&", os pontos da data e a onda da frase */
  terracota: "#a85a42",
  /** o rótulo e o "&" do final, sobre o céu do pôr do sol */
  terracotaEscura: "#8e4a36",
  /** as ondas desenhadas (nomes e local) e o traço entre as iniciais */
  ouro: "#c9a46a",
  /** a maré que traz cada cena e os círculos na água do local (sempre em rgba) */
  mar: "#2f6a73",
  /** o mar do final, junto do horizonte */
  marHorizonte: "#2f5a63",
  /** o mar do final, embaixo */
  marFundo: "#1d3a42",
} as const;

export type PapelDaCor = keyof typeof ORIGINAL;

/** Os três papéis que a amostra da paleta mostra no seletor. */
export const AMOSTRA: readonly PapelDaCor[] = ["tinta", "areia", "terracota"];

// Contraste conferido em cada uma, nunca abaixo do original: o texto sobre a
// areia, o papel, o céu do final e o sol ≥ 6,3:1; o endereço ≥ 6:1; os
// rótulos ≥ 4,2:1.
export const PALETAS: PaletaDoConvite<PapelDaCor>[] = [
  { id: "original", nome: "Azul-petróleo e terracota", cores: { ...ORIGINAL } },
  {
    id: "marinho",
    nome: "Azul-marinho e areia",
    cores: {
      areia: "#f2ece2",
      papel: "#faf8f3",
      tinta: "#1d2f4f",
      cinza: "#535f75",
      terracota: "#94633b",
      terracotaEscura: "#7a5336",
      ouro: "#c8ab7e",
      mar: "#3c6593",
      marHorizonte: "#34557c",
      marFundo: "#1a2a47",
    },
  },
  {
    id: "oliva",
    nome: "Verde-oliva e ouro",
    cores: {
      areia: "#f1ede0",
      papel: "#f9f8f1",
      tinta: "#343b24",
      cinza: "#5b604f",
      terracota: "#896a2a",
      terracotaEscura: "#6f5523",
      ouro: "#bfa96b",
      mar: "#3f6e5f",
      marHorizonte: "#3a5d52",
      marFundo: "#22382f",
    },
  },
  {
    id: "ameixa",
    nome: "Ameixa e rosé",
    cores: {
      areia: "#f4e9e3",
      papel: "#fbf6f3",
      tinta: "#3b2340",
      cinza: "#67576b",
      terracota: "#a35568",
      terracotaEscura: "#894356",
      ouro: "#cfa38a",
      mar: "#575d8a",
      marHorizonte: "#484c74",
      marFundo: "#262643",
    },
  },
];
