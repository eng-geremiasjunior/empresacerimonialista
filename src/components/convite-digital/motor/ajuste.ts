// A troca de cores (paleta escolhida) e de fontes (Google Fonts do desenho →
// as nossas, locais) aplicada aos textos do convite: a marcação, o estilo
// global, os valores do renderVals() e o que a lógica passa por
// this.ajustar(). Troca só o que está no mapa; o resto passa intacto.
//
// Cores: o mapa é de hex de 6 dígitos (minúsculo) para hex. Casa #rgb,
// #rrggbb e #rrggbbaa (o alfa fica) e rgb()/rgba() com o mesmo RGB (o alfa
// fica). Branco e preto nunca entram no mapa: as máscaras SVG dependem deles.
//
// Fontes: troca o nome entre aspas ('Pinyon Script' ou "Pinyon Script")
// pela pilha local (FAMILIAS de lib/fontes-site), mantendo o resto da pilha.

export type MapaDeCores = Record<string, string>;
export type MapaDeFontes = Record<string, string>;

/** As 16 famílias dos convites (todas do Google Fonts no desenho) → chave de FAMILIAS. */
export const FAMILIAS_DO_DESENHO = {
  Jost: "jost",
  "Hanken Grotesk": "hanken",
  "Bodoni Moda": "bodoni",
  Figtree: "figtree",
  Italiana: "italiana",
  "EB Garamond": "garamond",
  "Pinyon Script": "pinyon",
  "Cormorant Garamond": "cormorant",
  "Monsieur La Doulaise": "monsieur",
  Marcellus: "marcellus",
  Sacramento: "sacramento",
  Lora: "lora",
  "Poiret One": "poiret",
  "Josefin Sans": "josefin",
  "Playfair Display": "playfair",
  "Libre Baskerville": "baskerville",
} as const;

function expandir(hex: string): string {
  const h = hex.toLowerCase();
  if (h.length === 3 || h.length === 4) return h.slice(0, 3).split("").map((c) => c + c).join("");
  return h.slice(0, 6);
}

function rgbDe(hex6: string): [number, number, number] {
  return [parseInt(hex6.slice(0, 2), 16), parseInt(hex6.slice(2, 4), 16), parseInt(hex6.slice(4, 6), 16)];
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function criarAjuste(cores: MapaDeCores | null, fontes: MapaDeFontes | null): (s: string) => string {
  const mapa = new Map<string, string>();
  for (const [de, para] of Object.entries(cores || {})) {
    const d = expandir(de.replace(/^#/, ""));
    const p = expandir(para.replace(/^#/, ""));
    if (d !== p) mapa.set(d, p);
  }
  const porRgb = new Map<string, string>();
  for (const [d, p] of mapa) porRgb.set(rgbDe(d).join(","), p);

  const nomes = Object.keys(fontes || {});
  const reFonte = nomes.length
    ? new RegExp(`(['"])(${nomes.sort((a, b) => b.length - a.length).map(escapar).join("|")})\\1`, "g")
    : null;

  if (!mapa.size && !reFonte) return (s) => s;

  return (s: string) => {
    let r = s;
    if (mapa.size) {
      r = r.replace(/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])/g, (todo, hex: string) => {
        const novo = mapa.get(expandir(hex));
        if (!novo) return todo;
        const alfa = hex.length === 8 ? hex.slice(6) : hex.length === 4 ? hex[3] + hex[3] : "";
        return `#${novo}${alfa}`;
      });
      r = r.replace(
        /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+%?)\s*)?\)/g,
        (todo, R: string, G: string, B: string, A?: string) => {
          const novo = porRgb.get(`${+R},${+G},${+B}`);
          if (!novo) return todo;
          const [nr, ng, nb] = rgbDe(novo);
          return A !== undefined ? `rgba(${nr},${ng},${nb},${A})` : `rgb(${nr},${ng},${nb})`;
        }
      );
    }
    if (reFonte) r = r.replace(reFonte, (_t, _q, nome: string) => fontes![nome]);
    return r;
  };
}

/** Aplica o ajuste a todos os textos de um valor (objetos e listas simples, em profundidade). */
export function ajustarValores<T>(v: T, ajuste: (s: string) => string): T {
  if (typeof v === "string") return ajuste(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => ajustarValores(x, ajuste)) as unknown as T;
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = ajustarValores(x, ajuste);
    return o as T;
  }
  return v;
}
