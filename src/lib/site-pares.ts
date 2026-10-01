import { FAMILIAS, type FamiliaDoSite } from "./fontes-site";
import type { ModeloNovo } from "./site-modelos";

// Os 8 pares de fonte dos modelos de site, tirados do theme() dos 6
// protótipos (handoff/prototipos/Template 0N.dc.html), que é a fonte da
// verdade — o catálogo "Tipografia Casamento" diverge dele e não vale.
// As tabelas F do T03 e do T04 são iguais, e as do T05 e do T06 também:
// sobram 4 grupos. Cada par guarda os valores do T01 e só o que muda nos
// outros grupos. Só dados: o root do site recebe style={varsDoPar(...)}
// e o CSS de cada modelo lê as variáveis --sf-*.

export type ParDeFonte =
  | "essencial"
  | "maison"
  | "atelier"
  | "caligrafia"
  | "riviera"
  | "bilhete"
  | "soiree"
  | "relicario";

export type Grupo = "t01" | "t02" | "t0304" | "t0506";

// [mínimo px, vw, máximo px] de um clamp
type Faixa = readonly [number, number, number];

export type ValoresDoPar = {
  /** família, peso, caixa, letter-spacing, estilo, escala e altura de linha do nome */
  nf: FamiliaDoSite;
  nw: number;
  ntt: "uppercase" | "none";
  nls: string;
  ns: "normal" | "italic";
  s: number;
  nlh: number;
  /** o "&" entre os nomes; só o T01 usa */
  amp: "normal" | "italic";
  /** títulos */
  hf: FamiliaDoSite;
  hw: number;
  htt: "uppercase" | "none";
  hls: string;
  hs: "normal" | "italic";
  hz: Faixa;
  /** texto corrido; rótulos 500 e botões 600 herdam esta família */
  tf: FamiliaDoSite;
  tz: number;
  tw: number;
};

export type Par = {
  nome: string;
  numero: string;
  base: ValoresDoPar;
  grupos: Partial<Record<Exclude<Grupo, "t01">, Partial<ValoresDoPar>>>;
};

export const PARES_DE_FONTE: Record<ParDeFonte, Par> = {
  essencial: {
    nome: "Essencial",
    numero: "01",
    base: { nf: "jost", nw: 300, ntt: "uppercase", nls: ".14em", ns: "normal", s: 0.72, amp: "normal", nlh: 1.1, hf: "jost", hw: 300, htt: "uppercase", hls: ".18em", hs: "normal", hz: [22, 3, 34], tf: "hanken", tz: 16, tw: 400 },
    grupos: {
      t02: { hls: ".16em" },
      t0304: { nls: ".12em", s: 0.74, hls: ".12em" },
      t0506: { hls: ".14em" },
    },
  },
  maison: {
    nome: "Maison",
    numero: "02",
    base: { nf: "bodoni", nw: 400, ntt: "none", nls: "-.01em", ns: "normal", s: 0.92, amp: "italic", nlh: 1.05, hf: "bodoni", hw: 400, htt: "none", hls: "-.01em", hs: "normal", hz: [36, 5.2, 64], tf: "figtree", tz: 16, tw: 400 },
    grupos: {
      t02: { hz: [34, 5, 62] },
      t0304: { hz: [32, 4.4, 54] },
      t0506: { hz: [34, 5, 60] },
    },
  },
  atelier: {
    nome: "Atelier",
    numero: "03",
    base: { nf: "italiana", nw: 400, ntt: "none", nls: ".04em", ns: "normal", s: 0.94, amp: "normal", nlh: 1.1, hf: "italiana", hw: 400, htt: "none", hls: ".04em", hs: "normal", hz: [36, 5.2, 62], tf: "garamond", tz: 19, tw: 400 },
    grupos: {
      t02: { hz: [34, 5, 60] },
      // no T03/T04 o texto troca de família
      t0304: { nls: ".03em", s: 0.96, hls: ".03em", hz: [32, 4.4, 54], tf: "figtree", tz: 16 },
      t0506: { hz: [34, 5, 60] },
    },
  },
  caligrafia: {
    nome: "Caligrafia",
    numero: "04",
    base: { nf: "pinyon", nw: 400, ntt: "none", nls: "0", ns: "normal", s: 1.1, amp: "normal", nlh: 1.35, hf: "cormorant", hw: 400, htt: "none", hls: "0", hs: "normal", hz: [36, 5.2, 64], tf: "cormorant", tz: 20, tw: 400 },
    grupos: {
      t0304: { nlh: 1.3, hw: 500, hz: [34, 4.6, 56], tz: 19 },
      t0506: { hw: 500, hz: [36, 5.2, 62] },
    },
  },
  riviera: {
    nome: "Riviera",
    numero: "05",
    base: { nf: "monsieur", nw: 400, ntt: "none", nls: "0", ns: "normal", s: 1.3, amp: "normal", nlh: 1.35, hf: "marcellus", hw: 400, htt: "none", hls: ".03em", hs: "normal", hz: [30, 4.2, 50], tf: "marcellus", tz: 17, tw: 400 },
    grupos: {
      t0304: { nlh: 1.3, hls: ".02em", hz: [28, 3.8, 46], tz: 16 },
    },
  },
  bilhete: {
    nome: "Bilhete",
    numero: "06",
    base: { nf: "sacramento", nw: 400, ntt: "none", nls: "0", ns: "normal", s: 1.15, amp: "normal", nlh: 1.3, hf: "lora", hw: 400, htt: "none", hls: "0", hs: "italic", hz: [32, 4.6, 56], tf: "lora", tz: 17, tw: 400 },
    grupos: {
      t0304: { nlh: 1.25, hz: [30, 4.2, 50], tz: 16 },
      t0506: { hz: [32, 4.6, 54] },
    },
  },
  soiree: {
    nome: "Soirée",
    numero: "07",
    base: { nf: "poiret", nw: 400, ntt: "uppercase", nls: ".12em", ns: "normal", s: 0.74, amp: "normal", nlh: 1.15, hf: "poiret", hw: 400, htt: "uppercase", hls: ".14em", hs: "normal", hz: [26, 3.6, 42], tf: "josefin", tz: 17, tw: 300 },
    grupos: {
      t0304: { nls: ".1em", s: 0.76, hls: ".1em", hz: [24, 3.2, 38], tw: 400 },
      t0506: { hls: ".12em", tw: 400 },
    },
  },
  relicario: {
    nome: "Relicário",
    numero: "08",
    base: { nf: "playfair", nw: 400, ntt: "none", nls: "0", ns: "italic", s: 0.92, amp: "italic", nlh: 1.1, hf: "playfair", hw: 400, htt: "none", hls: "0", hs: "italic", hz: [36, 5.2, 62], tf: "baskerville", tz: 16, tw: 400 },
    grupos: {
      t02: { hz: [34, 5, 60] },
      // títulos em itálico só no T01/T02
      t0304: { hs: "normal", hz: [32, 4.4, 52], tz: 15 },
      t0506: { hs: "normal", hz: [34, 5, 58] },
    },
  },
};

/** Ordem de exibição no seletor do editor. */
export const ORDEM_DOS_PARES: ParDeFonte[] = [
  "essencial",
  "maison",
  "atelier",
  "caligrafia",
  "riviera",
  "bilhete",
  "soiree",
  "relicario",
];

export function ehParDeFonte(x: unknown): x is ParDeFonte {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(PARES_DE_FONTE, x);
}

// Par que o modelo usa quando o tema não diz (ou diz algo desconhecido).
export const PAR_PADRAO: Record<ModeloNovo, ParDeFonte> = {
  classico: "caligrafia",
  aliancas: "caligrafia",
  cartoes: "atelier",
  monograma: "maison",
  franca: "riviera",
  violino: "caligrafia",
};

// A escala de cada modelo vale para todos os pares; o s do par multiplica
// as faixas do nome e das iniciais e os tamanhos fixos (selo, monograma).
export type Escala = {
  grupo: Grupo;
  /** variável --sf-* → faixa do clamp (escalada por s) */
  faixas: Record<string, Faixa>;
  /** variável --sf-* → px (escalado por s) */
  fixos: Record<string, number>;
  /** multiplicadores de hz para o título pequeno */
  titSm: Faixa;
  /** letter-spacing suave dos títulos em maiúsculas */
  lsSuave: string;
  /** título de cartão: [maiúsculas, demais] */
  cardTit: readonly [string, string];
};

const ESCALA_T01: Escala = {
  grupo: "t01",
  faixas: {
    "--sf-nome-tam": [46, 9, 124],
    "--sf-nome-tam-sm": [34, 5.6, 76],
    "--sf-nome-tam-md": [34, 5, 64],
    "--sf-inic-tam": [96, 16, 200],
    "--sf-inic-tam-sm": [60, 9, 116],
  },
  fixos: { "--sf-selo-tam": 40, "--sf-nav-mono-tam": 24 },
  titSm: [0.8, 0.7, 0.66],
  lsSuave: ".08em",
  cardTit: ["17px", "24px"],
};

const ESCALA_T02: Escala = {
  grupo: "t02",
  faixas: {
    "--sf-nome-tam": [42, 7.4, 108],
    "--sf-nome-tam-sm": [34, 5.4, 72],
    "--sf-nome-tam-md": [34, 5, 64],
    "--sf-nome-tam-xs": [26, 3.6, 46],
    "--sf-inic-tam": [80, 13, 170],
    "--sf-inic-tam-sm": [56, 8, 104],
  },
  fixos: { "--sf-mono-tam": 17 },
  titSm: [0.8, 0.7, 0.66],
  lsSuave: ".08em",
  cardTit: ["16px", "23px"],
};

const ESCALA_T0304: Escala = {
  grupo: "t0304",
  faixas: {
    "--sf-nome-tam": [46, 7.4, 104],
    "--sf-nome-tam-sm": [30, 4, 56],
    "--sf-nome-tam-md": [36, 5, 64],
    "--sf-inic-tam": [110, 20, 260],
    "--sf-inic-tam-hero": [80, 11, 150],
    "--sf-inic-tam-sm": [56, 7, 96],
  },
  fixos: { "--sf-palavra-tam": 20, "--sf-vinil-tam": 30 },
  titSm: [0.82, 0.75, 0.72],
  lsSuave: ".06em",
  cardTit: ["17px", "23px"],
};

const ESCALA_T0506: Escala = {
  grupo: "t0506",
  faixas: {
    "--sf-nome-tam": [46, 8, 116],
    "--sf-nome-tam-sm": [32, 4.6, 64],
    "--sf-nome-tam-md": [36, 5, 68],
    "--sf-nome-tam-xs": [22, 3.2, 34],
    "--sf-inic-tam": [90, 15, 190],
    "--sf-inic-tam-sm": [56, 8, 104],
  },
  fixos: { "--sf-selo-tam": 30, "--sf-brasao-tam": 44, "--sf-nav-mono-tam": 22, "--sf-carimbo-tam": 14 },
  titSm: [0.82, 0.75, 0.72],
  lsSuave: ".06em",
  cardTit: ["17px", "24px"],
};

export const ESCALA_POR_MODELO: Record<ModeloNovo, Escala> = {
  classico: ESCALA_T01,
  aliancas: ESCALA_T02,
  cartoes: ESCALA_T0304,
  monograma: ESCALA_T0304,
  franca: ESCALA_T0506,
  violino: ESCALA_T0506,
};

// De/para entre os nomes do theme() do protótipo e as variáveis, para
// quem converte o markup do desenho.
export const VAR_DO_THEME = {
  nameFont: "--sf-nome-fam",
  nameWeight: "--sf-nome-peso",
  nameTT: "--sf-nome-caixa",
  nameLS: "--sf-nome-ls",
  nameStyle: "--sf-nome-estilo",
  nameLH: "--sf-nome-lh",
  ampStyle: "--sf-amp-estilo",
  nameSize: "--sf-nome-tam",
  nameSizeSm: "--sf-nome-tam-sm",
  nameSizeMd: "--sf-nome-tam-md",
  nameSizeXs: "--sf-nome-tam-xs",
  initSize: "--sf-inic-tam",
  initSizeSm: "--sf-inic-tam-sm",
  initSizeHero: "--sf-inic-tam-hero",
  sealSize: "--sf-selo-tam",
  navMono: "--sf-nav-mono-tam",
  monoSize: "--sf-mono-tam",
  wordSize: "--sf-palavra-tam",
  vinylSize: "--sf-vinil-tam",
  crestSize: "--sf-brasao-tam",
  stampSize: "--sf-carimbo-tam",
  headFont: "--sf-tit-fam",
  headWeight: "--sf-tit-peso",
  headTT: "--sf-tit-caixa",
  headLS: "--sf-tit-ls",
  headLSsoft: "--sf-tit-ls-suave",
  headStyle: "--sf-tit-estilo",
  headSize: "--sf-tit-tam",
  headSizeSm: "--sf-tit-tam-sm",
  cardHead: "--sf-card-tit",
  textFont: "--sf-texto-fam",
  textSize: "--sf-texto-tam",
  textWeight: "--sf-texto-peso",
} as const;

// O vw do desenho passa por --sm-vw: 1vw no público, 1cqi na prévia
// (a prévia estreita no portal sai igual ao celular).
function vw(n: string): string {
  return `calc(${n} * var(--sm-vw, 1vw))`;
}

/** Os valores do par já com os ajustes do grupo do modelo. */
export function valoresDoPar(par: string | null | undefined, modelo: ModeloNovo): ValoresDoPar {
  const escala = ESCALA_POR_MODELO[modelo] ?? ESCALA_T01;
  const chave: ParDeFonte = ehParDeFonte(par) ? par : (PAR_PADRAO[modelo] ?? "caligrafia");
  const p = PARES_DE_FONTE[chave];
  const ajuste = escala.grupo === "t01" ? undefined : p.grupos[escala.grupo];
  return { ...p.base, ...ajuste };
}

/**
 * As variáveis --sf-* do par no modelo, para o style da raiz do site.
 * Par ausente ou desconhecido cai no padrão do modelo. Só strings: o
 * resultado atravessa servidor→cliente sem problema.
 */
export function varsDoPar(par: string | null | undefined, modelo: ModeloNovo): Record<string, string> {
  const escala = ESCALA_POR_MODELO[modelo] ?? ESCALA_T01;
  const f = valoresDoPar(par, modelo);
  const s = f.s;
  const hz = f.hz;
  const sm = escala.titSm;
  const caixaAlta = f.htt === "uppercase";

  const v: Record<string, string> = {
    "--sf-nome-fam": FAMILIAS[f.nf],
    "--sf-nome-peso": String(f.nw),
    "--sf-nome-caixa": f.ntt,
    "--sf-nome-ls": f.nls,
    "--sf-nome-estilo": f.ns,
    "--sf-nome-lh": String(f.nlh),
    // o "&" em itálico é só do T01; nos outros fica reto
    "--sf-amp-estilo": escala.grupo === "t01" ? f.amp : "normal",

    "--sf-tit-fam": FAMILIAS[f.hf],
    "--sf-tit-peso": String(f.hw),
    "--sf-tit-caixa": f.htt,
    "--sf-tit-ls": f.hls,
    "--sf-tit-ls-suave": caixaAlta ? escala.lsSuave : f.hls,
    "--sf-tit-estilo": f.hs,
    // o título não escala com s
    "--sf-tit-tam": `clamp(${hz[0]}px, ${vw(String(hz[1]))}, ${hz[2]}px)`,
    "--sf-tit-tam-sm": `clamp(${Math.round(hz[0] * sm[0])}px, ${vw((hz[1] * sm[1]).toFixed(2))}, ${Math.round(hz[2] * sm[2])}px)`,
    "--sf-card-tit": caixaAlta ? escala.cardTit[0] : escala.cardTit[1],

    "--sf-texto-fam": FAMILIAS[f.tf],
    "--sf-texto-tam": `${f.tz}px`,
    "--sf-texto-peso": String(f.tw),
  };

  for (const [nome, [a, b, m]] of Object.entries(escala.faixas)) {
    v[nome] = `clamp(${Math.round(a * s)}px, ${vw((b * s).toFixed(2))}, ${Math.round(m * s)}px)`;
  }
  for (const [nome, px] of Object.entries(escala.fixos)) {
    v[nome] = `${Math.round(px * s)}px`;
  }
  return v;
}
