// As cores do Convite 09 (Tradicional de luxo) por papel, e as paletas que a
// noiva escolhe. ORIGINAL é o desenho (hex copiados literal); cada paleta dá
// o hex novo de cada papel, com a mesma luminosidade do original (mudam o
// matiz e o croma) e o contraste conferido: texto ≥ 4,5:1, rótulos ≥ 3:1.
// A laca acompanha a paleta: a tampa, a base da caixa e os fundos da
// abertura e do final são a cor do convite. Não entram, valem em toda
// paleta: o papel vegetal (#faf6ec e os brancos), a fita e o laço de cetim
// marfim (#d9cdb4 #f6efe0 #fffaf0 #cfc2a6 #e9dfc9 #c9bb9c e as dobras
// #96825f) e o forro marfim da caixa (#e6dcc6, que divide o #cfc2a6 com a
// fita): o cetim marfim combina com o ouro e com a prata. O grão do papel é
// um feColorMatrix na lógica, sem hex: fica sempre quente.

import type { PaletaDoConvite } from "../../motor/modelo";

export const ORIGINAL = {
  /** o mais fundo da laca: o body, o fundo do convite, a borda dos degradês da abertura e do final */
  laca: "#0d0c0b",
  /** o centro do degradê da abertura */
  fundoAbertura: "#2a2622",
  /** o centro do degradê do final e o canto claro da tampa */
  lacaClara: "#25221f",
  /** a tampa: a faixa escura do meio */
  tampaSombra: "#121110",
  /** a tampa: o reflexo da laca */
  tampaReflexo: "#1d1b19",
  /** a tampa: o canto mais escuro */
  tampaFundo: "#0b0a09",
  /** a base da caixa, lado claro */
  caixaClara: "#1b1917",
  /** a base da caixa, lado escuro */
  caixaEscura: "#0a0908",
  /** o dourado sobre o papel: molduras, fios, losangos, filete da foto, o meio do relevo */
  ouro: "#b8975a",
  /** as pontas do relevo dourado (monogramas e data) */
  ouroEscuro: "#8e6d38",
  /** o brilho que corre no relevo dourado */
  ouroBrilho: "#f0dfb0",
  /** o dourado sobre a laca: rótulo da abertura, filetes e data da tampa, molduras e botão do final */
  champanhe: "#cdb283",
  /** a frase e a seta do final */
  champanheClaro: "#e3cfa3",
  /** rótulos dourados sobre o papel: Cerimônia, Recepção, referência, o "&" */
  ouroTexto: "#9a7a42",
  /** a linha de luz da transição: as pontas */
  luz: "#d9bf86",
  /** a linha de luz: o centro */
  luzBrilho: "#fff1c8",
  /** a linha de luz: o halo */
  luzHalo: "#f0d7a0",
  /** o cartão do convite, da foto e do local */
  papel: "#f8f4ea",
  /** o cartão do versículo e da data */
  papelAlternado: "#f4efe3",
  /** o passe-partout da foto */
  passePartout: "#fdfbf6",
  /** o texto sobre o papel e os pontos; a sombra do passe-partout */
  tinta: "#26221d",
  /** texto secundário: pais, o convite, endereços, a legenda da foto */
  tintaSuave: "#4a4238",
  /** o texto sobre a laca: abertura, final, botão */
  creme: "#efe6d4",
  /** "Toque para continuar" */
  dica: "#7d6a4a",
} as const;

export type PapelDaCor = keyof typeof ORIGINAL;

/** Os três papéis que a amostra da paleta mostra no seletor: a caixa, o papel e o dourado. */
export const AMOSTRA: readonly PapelDaCor[] = ["lacaClara", "papel", "ouro"];

export const PALETAS: PaletaDoConvite<PapelDaCor>[] = [
  { id: "original", nome: "Preto e ouro", cores: { ...ORIGINAL } },
  {
    id: "esmeralda",
    nome: "Verde-esmeralda e ouro",
    cores: {
      laca: "#021009",
      fundoAbertura: "#0c2e21",
      lacaClara: "#0a291d",
      tampaSombra: "#03150e",
      tampaReflexo: "#072117",
      tampaFundo: "#020d08",
      caixaClara: "#061f15",
      caixaEscura: "#020c07",
      ouro: "#b8975a",
      ouroEscuro: "#8e6d38",
      ouroBrilho: "#f0dfb0",
      champanhe: "#cdb283",
      champanheClaro: "#e3cfa3",
      ouroTexto: "#9a7a42",
      luz: "#d9bf86",
      luzBrilho: "#fff1c8",
      luzHalo: "#f0d7a0",
      papel: "#f7f4eb",
      papelAlternado: "#f2efe4",
      passePartout: "#fcfbf7",
      tinta: "#192620",
      tintaSuave: "#374840",
      creme: "#efe6d4",
      dica: "#7d6a4a",
    },
  },
  {
    id: "bordo",
    nome: "Bordô e ouro",
    cores: {
      laca: "#190508",
      fundoAbertura: "#41171d",
      lacaClara: "#3b141a",
      tampaSombra: "#21080b",
      tampaReflexo: "#300f14",
      tampaFundo: "#160406",
      caixaClara: "#2d0e12",
      caixaEscura: "#150406",
      ouro: "#b8975a",
      ouroEscuro: "#8e6d38",
      ouroBrilho: "#f0dfb0",
      champanhe: "#cdb283",
      champanheClaro: "#e3cfa3",
      ouroTexto: "#9a7a42",
      luz: "#d9bf86",
      luzBrilho: "#fff1c8",
      luzHalo: "#f0d7a0",
      papel: "#faf3eb",
      papelAlternado: "#f6eee4",
      passePartout: "#fefbf6",
      tinta: "#301c1e",
      tintaSuave: "#543c3e",
      creme: "#f3e4d5",
      dica: "#7d6a4a",
    },
  },
  {
    id: "marinho",
    nome: "Azul-marinho e prata",
    cores: {
      laca: "#060c19",
      fundoAbertura: "#182641",
      lacaClara: "#15223b",
      tampaSombra: "#081121",
      tampaReflexo: "#101b30",
      tampaFundo: "#050a16",
      caixaClara: "#0e192d",
      caixaEscura: "#040915",
      ouro: "#969da6",
      ouroEscuro: "#6e747c",
      ouroBrilho: "#dbe0e8",
      champanhe: "#b1b7be",
      champanheClaro: "#ccd2d8",
      ouroTexto: "#7a8089",
      luz: "#bcc3cb",
      luzBrilho: "#edf2f8",
      luzHalo: "#d4dae3",
      papel: "#f5f4f1",
      papelAlternado: "#f0efeb",
      passePartout: "#fcfbf9",
      tinta: "#1a2333",
      tintaSuave: "#3a4456",
      creme: "#e3e7ec",
      dica: "#676e78",
    },
  },
];
