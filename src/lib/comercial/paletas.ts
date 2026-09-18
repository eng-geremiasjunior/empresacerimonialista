// As cores da vitrine: poucas, prontas, as mesmas nos três modelos.
//
// Decisão do dono (18/09/2026): nada de escolher cor livre. Cor livre deixa
// texto ilegível e página "árvore de natal", e a vitrine vende o serviço
// dela. A paleta muda só a cor de destaque (botão, link, fio, menu ativo) e
// os tons que nascem dela; o fundo e o texto continuam os do modelo.
//
// O banco guarda só o código (empresa_pagina.paleta, 165). Módulo puro: o
// editor (navegador) e a vitrine (servidor) leem a mesma tabela.

import type { ModeloDaVitrine } from "./pagina-publica";

export type PaletaDaVitrine = "original" | "rose" | "dourado" | "azul" | "grafite";

type Cor = { destaque: string; hover: string };

/**
 * A cor de cada modelo como o desenho a trouxe (as mesmas das folhas
 * vitrine.css, capitulos.css e curadoria.css). Todas verdes.
 */
const DO_MODELO: Record<ModeloDaVitrine, Cor> = {
  classico: { destaque: "#4e5c2e", hover: "#3a4422" },
  capitulos: { destaque: "#55705a", hover: "#3f5643" },
  curadoria: { destaque: "#66703c", hover: "#4e5629" },
};

/**
 * As outras. Escuras o bastante para o texto branco do botão e para o link
 * sobre o fundo claro (contraste acima de 4,5 nos três modelos).
 */
const OUTRAS: Record<Exclude<PaletaDaVitrine, "original">, Cor> = {
  rose: { destaque: "#8f5763", hover: "#72434e" },
  dourado: { destaque: "#836432", hover: "#654c24" },
  azul: { destaque: "#34506e", hover: "#243a52" },
  grafite: { destaque: "#3d3c3a", hover: "#252423" },
};

export const PALETAS_DA_VITRINE: { codigo: PaletaDaVitrine; nome: string }[] = [
  { codigo: "original", nome: "Verde" },
  { codigo: "rose", nome: "Rosé" },
  { codigo: "dourado", nome: "Dourado" },
  { codigo: "azul", nome: "Azul" },
  { codigo: "grafite", nome: "Grafite" },
];

/** O que vier do banco (ou de antes da 165 reaplicada) vira uma paleta válida. */
export function paletaDaVitrine(valor: unknown): PaletaDaVitrine {
  return PALETAS_DA_VITRINE.some((p) => p.codigo === valor) ? (valor as PaletaDaVitrine) : "original";
}

function cores(modelo: ModeloDaVitrine, paleta: PaletaDaVitrine): Cor {
  return paleta === "original" ? DO_MODELO[modelo] : OUTRAS[paleta];
}

/** A cor da bolinha no editor: a de destaque, naquele modelo. */
export function amostraDaPaleta(modelo: ModeloDaVitrine, paleta: PaletaDaVitrine): string {
  return cores(modelo, paleta).destaque;
}

/** A foto do modelo naquela cor, para o editor (public/vitrine/modelos). */
export function miniaturaDoModelo(
  modelo: ModeloDaVitrine,
  paleta: PaletaDaVitrine,
  tamanho: "miniatura" | "pagina" = "miniatura"
): string {
  return `/vitrine/modelos/${modelo}-${paleta}${tamanho === "pagina" ? "-pagina" : ""}.webp`;
}

/* ------------------------------------------------------------------ */

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** `parte` de `a` e o resto de `b`, em hexadecimal. */
function misturar(a: string, b: string, parte: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x
    .map((v, i) => Math.round(v * parte + y[i] * (1 - parte)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * As variáveis que a raiz do modelo recebe (estilo em linha, que vence a
 * folha). A original não recebe nenhuma: vale a folha como o desenho fez.
 * Os tons claros saem do destaque misturado ao fundo do modelo, na mesma
 * proporção que o desenho usou para o verde.
 */
export function variaveisDaPaleta(
  modelo: ModeloDaVitrine,
  paleta: PaletaDaVitrine
): Record<string, string> {
  if (paleta === "original") return {};
  const { destaque, hover } = OUTRAS[paleta];
  const trinca = rgb(destaque).join(", ");
  if (modelo === "curadoria") {
    const fundo = "#f7f5ef";
    return {
      "--cu-destaque": destaque,
      "--cu-destaque-hover": hover,
      "--cu-destaque-rgb": trinca,
      "--cu-numeral-servico": misturar(destaque, fundo, 0.71),
      "--cu-aspas": misturar(destaque, fundo, 0.33),
      "--cu-barra-previa": misturar(destaque, fundo, 0.53),
    };
  }
  if (modelo === "capitulos") {
    return {
      "--cp-destaque": destaque,
      "--cp-destaque-hover": hover,
      "--cp-barra-previa": misturar(destaque, "#f4f1ec", 0.5),
    };
  }
  return {
    "--vt-destaque": destaque,
    "--vt-destaque-hover": hover,
    "--vt-destaque-rgb": trinca,
  };
}
