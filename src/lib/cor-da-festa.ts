// A cor da festa (176, desenho "Portal da Família v2", 25/09/2026).
//
// UMA cor, escolhida pela família, e dela sai todo destaque do portal:
// o ponto, o texto de destaque, o fundo suave, a linha e o profundo. A
// fórmula é a do desenho (oklch), para qualquer cor — as 10 paletas só
// preenchem L, C e H, e a Paleta e estilo (fase 6) vai deixar a família
// montar a dela sem mudar nada aqui.
//
// Parte pura: importável no servidor e no navegador.

export type CorDaFesta = { nome: string; l: number; c: number; h: number };

export type Fundo = "festa" | "seda" | "noite" | "jardim" | "papel";
export type Topo = "padrao" | "retrato";

export type EstiloDoPortal = {
  cor: CorDaFesta;
  fundo: Fundo;
  topo: Topo;
  retratoPath: string | null;
  /** URL assinada (1 h) do retrato, quando existe */
  retratoUrl: string | null;
  retratoNoConvite: boolean;
  /** "Júlia" — quem mudou por último, para "Júlia escolheu · ontem" */
  autor: string | null;
  atualizadoEm: string | null;
};

// [id, nome, matiz, croma, luminosidade] — as do desenho
export const PALETAS: { id: string; nome: string; h: number; c: number; l: number }[] = [
  { id: "lilas", nome: "Lilás", h: 305, c: 0.09, l: 0.66 },
  { id: "dourado", nome: "Dourado", h: 78, c: 0.085, l: 0.68 },
  { id: "agua", nome: "Verde-água", h: 190, c: 0.075, l: 0.66 },
  { id: "rose", nome: "Rosé antigo", h: 15, c: 0.07, l: 0.66 },
  { id: "sereno", nome: "Azul sereno", h: 245, c: 0.07, l: 0.64 },
  { id: "terracota", nome: "Terracota", h: 42, c: 0.1, l: 0.62 },
  { id: "salvia", nome: "Sálvia", h: 140, c: 0.06, l: 0.64 },
  { id: "vinho", nome: "Vinho", h: 358, c: 0.11, l: 0.5 },
  { id: "champanhe", nome: "Champanhe", h: 85, c: 0.045, l: 0.72 },
  { id: "noite", nome: "Azul-noite", h: 265, c: 0.09, l: 0.48 },
];

export const FUNDOS: { id: Fundo; rotulo: string }[] = [
  { id: "festa", rotulo: "Luz de festa" },
  { id: "seda", rotulo: "Seda" },
  { id: "noite", rotulo: "Céu da noite" },
  { id: "jardim", rotulo: "Pérgola" },
  { id: "papel", rotulo: "Papel e monograma" },
];

export const ESTILO_PADRAO: EstiloDoPortal = {
  cor: { nome: PALETAS[0].nome, l: PALETAS[0].l, c: PALETAS[0].c, h: PALETAS[0].h },
  fundo: "festa",
  topo: "padrao",
  retratoPath: null,
  retratoUrl: null,
  retratoNoConvite: false,
  autor: null,
  atualizadoEm: null,
};

const n = (x: number, casas = 3) => Number(x.toFixed(casas));

/** As cinco derivadas da cor, como custom properties do portal. */
export function tokensDaCor(cor: Pick<CorDaFesta, "l" | "c" | "h">): Record<string, string> {
  const { l, c, h } = cor;
  return {
    "--destaque": `oklch(${n(l)} ${n(c)} ${n(h, 1)})`,
    "--destaque-texto": `oklch(${n(Math.min(l - 0.2, 0.45))} ${n(c)} ${n(h, 1)})`,
    "--destaque-fundo": `oklch(0.955 ${n(Math.min(c * 0.3, 0.025))} ${n(h, 1)})`,
    "--destaque-linha": `oklch(0.86 ${n(c * 0.55)} ${n(h, 1)})`,
    "--destaque-profundo": `oklch(0.3 ${n(c * 0.6)} ${n(h, 1)})`,
  };
}

export function ehFundo(v: unknown): v is Fundo {
  return typeof v === "string" && FUNDOS.some((f) => f.id === v);
}

export function ehTopo(v: unknown): v is Topo {
  return v === "padrao" || v === "retrato";
}

/** A cor dentro dos limites do banco (176), ou null. */
export function corValida(v: unknown): CorDaFesta | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const l = Number(o.l), c = Number(o.c), h = Number(o.h);
  const nome = typeof o.nome === "string" ? o.nome.trim().slice(0, 30) : "";
  if (!nome || !(l >= 0.3 && l <= 0.85) || !(c >= 0 && c <= 0.2) || !(h >= 0 && h <= 360)) return null;
  return { nome, l, c, h };
}
