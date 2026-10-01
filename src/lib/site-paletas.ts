// As cores dos 6 modelos, tiradas literalmente do theme() de cada protótipo.
//
// Todo modelo fala os mesmos papéis (--sm-bg, --sm-alt, --sm-paper,
// --sm-ink, --sm-muted, --sm-accent, --sm-line, --sm-line-strong,
// --sm-dark, --sm-dark-ink) mais os seus próprios (--sm-gold,
// --sm-stamp…). O CSS de cada modelo só lê essas variáveis.
//
// Pronto para a troca de cor futura: os 5 papéis da família (fundo,
// superficie, tinta, suave, acento) entram por cima de bg, alt/paper, ink,
// muted e accent, e linha, linha forte, escuro e tinta do escuro saem por
// color-mix desses (como o convite.css já faz) — por isso o desenho guarda
// os valores exatos, e a derivação só vale quando a família trocar a cor.
// Hoje a cor livre fica só no Convite.

import { MODELOS, type ModeloNovo } from "@/lib/site-modelos";
import type { PapelDeCor } from "@/lib/site-blocos";

export type PaletaDoModelo = {
  /** como a noiva lê no seletor */
  nome: string;
  bg: string;
  alt: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  line: string;
  lineStrong: string;
  dark: string;
  darkInk: string;
  /** as variáveis próprias do modelo, já com o prefixo --sm- */
  proprias?: Record<string, string>;
};

// T01: 5 paletas nomeadas; a barra fixa é o fundo a .82 (theme().nav).
// Hero fixo em todas: fundo #2a2622, texto #fff.
const HERO_T01 = { "--sm-hero-bg": "#2a2622", "--sm-hero-ink": "#fff" };

const CLASSICO: Record<string, PaletaDoModelo> = {
  marfim: {
    nome: "Marfim",
    bg: "#f7f2ea",
    alt: "#efe7db",
    paper: "#f7f2ea",
    ink: "#2b241d",
    muted: "#65594c",
    accent: "#7d5f40",
    line: "#e0d5c6",
    lineStrong: "#b9aa96",
    dark: "#2b241d",
    darkInk: "#f3ece1",
    proprias: { ...HERO_T01, "--sm-nav": "rgba(247,242,234,.82)" },
  },
  salvia: {
    nome: "Sálvia",
    bg: "#f1f2ec",
    alt: "#e4e8dd",
    paper: "#f1f2ec",
    ink: "#1f2a22",
    muted: "#566258",
    accent: "#536a4b",
    line: "#d3dacd",
    lineStrong: "#a6b2a2",
    dark: "#1f2a22",
    darkInk: "#eef1ea",
    proprias: { ...HERO_T01, "--sm-nav": "rgba(241,242,236,.82)" },
  },
  rose: {
    nome: "Rosé",
    bg: "#f8efec",
    alt: "#f0e1dc",
    paper: "#f8efec",
    ink: "#33232a",
    muted: "#6f5660",
    accent: "#94545d",
    line: "#e8d4cf",
    lineStrong: "#c4a9a7",
    dark: "#3a2830",
    darkInk: "#f8efec",
    proprias: { ...HERO_T01, "--sm-nav": "rgba(248,239,236,.82)" },
  },
  azul: {
    nome: "Azul",
    bg: "#f0f3f6",
    alt: "#e2e8ee",
    paper: "#f0f3f6",
    ink: "#1c2633",
    muted: "#566172",
    accent: "#466183",
    line: "#d2dae3",
    lineStrong: "#a3afbd",
    dark: "#1c2633",
    darkInk: "#eef2f6",
    proprias: { ...HERO_T01, "--sm-nav": "rgba(240,243,246,.82)" },
  },
  noite: {
    nome: "Noite",
    bg: "#16181e",
    alt: "#1e2129",
    paper: "#16181e",
    ink: "#efe7d6",
    muted: "#aaa293",
    accent: "#d4b97f",
    line: "#2f323b",
    lineStrong: "#4a4d57",
    dark: "#0e1014",
    darkInk: "#efe7d6",
    proprias: { ...HERO_T01, "--sm-nav": "rgba(22,24,30,.82)" },
  },
};

// T02: o ouro das alianças é o metal, não muda com a paleta.
const ALIANCAS: Record<string, PaletaDoModelo> = {
  ouro: {
    nome: "Ouro",
    bg: "#f8f1e7",
    alt: "#f1e6d6",
    paper: "#fffcf6",
    ink: "#3a2a20",
    muted: "#6e5a4a",
    accent: "#9a6b3c",
    line: "#e6d8c4",
    lineStrong: "#bfa88c",
    dark: "#2a1d16",
    darkInk: "#f5eadb",
    proprias: {
      "--sm-dark-line": "rgba(245,234,219,.3)",
      "--sm-gold": "#e3c178",
      "--sm-ouro-1": "#7a5620",
      "--sm-ouro-2": "#d6b062",
      "--sm-ouro-3": "#fff2c9",
      "--sm-ouro-4": "#e3c178",
      "--sm-ouro-5": "#9b7430",
      "--sm-ouro-6": "#6d4b1a",
      "--sm-ouro-borda": "linear-gradient(135deg,#8a6526,#f4dc9c,#b8904a,#f4dc9c,#8a6526)",
    },
  },
};

// T03 e T04: a mesma paleta. Não há "alt" nem "dark" no theme(): o papel
// alt é o soft, paper é o card, e o escuro é o fundo das fotos (#1a1f1b)
// com o texto sobre foto (#f7f1e8).
const PESSEGO: PaletaDoModelo = {
  nome: "Pêssego",
  bg: "#f1ece4",
  alt: "#f3eee6",
  paper: "#fbf9f5",
  ink: "#1d2a24",
  muted: "#5f6862",
  accent: "#e8a987",
  line: "#e7e0d5",
  lineStrong: "#c9bfb1",
  dark: "#1a1f1b",
  darkInk: "#f7f1e8",
  proprias: {
    "--sm-card": "#fbf9f5",
    "--sm-soft": "#f3eee6",
    "--sm-sage": "#e4ebe3",
    "--sm-accent-text": "#a95f3b",
    "--sm-marco-passado": "#f6dccb",
    "--sm-halo": "rgba(232,169,135,.28)",
    "--sm-vidro": "rgba(20,26,22,.55)",
    "--sm-vidro-borda": "rgba(247,241,232,.22)",
  },
};

// T05 e T06: o acento é o ouro. Cera, fita e moldura são decoração fixa.
const MARINHO: PaletaDoModelo = {
  nome: "Marinho",
  bg: "#f6f0e6",
  alt: "#efe6d6",
  paper: "#fcf8f1",
  ink: "#1f2a44",
  muted: "#586074",
  accent: "#b08d57",
  line: "#e4d9c7",
  lineStrong: "#c3b49c",
  dark: "#1b2438",
  darkInk: "#f3ece0",
  proprias: {
    "--sm-gold": "#b08d57",
    "--sm-gold-text": "#86652f",
    "--sm-gold-light": "#dcc393",
    "--sm-stamp": "#3d5a86",
    "--sm-nav": "rgba(251,247,240,.96)",
    "--sm-erro": "#a63b3f",
    "--sm-cera": "radial-gradient(circle at 36% 30%, #c0555a, #8e2a2e 55%, #5c181c)",
    "--sm-cera-ink": "#f1d8c2",
    "--sm-fita": "#74201f",
    "--sm-fita-claro": "#a63b3f",
    "--sm-moldura": "linear-gradient(135deg, #8a6a3a, #e8d3a2 28%, #a9844d 52%, #f1ddb0 74%, #8a6a3a)",
  },
};

export const PALETAS: Record<ModeloNovo, Record<string, PaletaDoModelo>> = {
  classico: CLASSICO,
  aliancas: ALIANCAS,
  cartoes: { pessego: PESSEGO },
  monograma: { pessego: PESSEGO },
  franca: { marinho: MARINHO },
  violino: { marinho: MARINHO },
};

/** A paleta que vale: a do tema, se o modelo tiver; senão a padrão. */
export function paletaDoModelo(modelo: ModeloNovo, tema: unknown): PaletaDoModelo {
  const pedida =
    tema && typeof tema === "object" ? (tema as Record<string, unknown>).paleta : undefined;
  const doModelo = PALETAS[modelo];
  if (typeof pedida === "string" && Object.prototype.hasOwnProperty.call(doModelo, pedida)) {
    return doModelo[pedida];
  }
  return doModelo[MODELOS[modelo].paletaPadrao];
}

/** As variáveis CSS do modelo, para o style da raiz .sm-<id>. */
export function varsDoModelo(modelo: ModeloNovo, tema: unknown): Record<string, string> {
  const p = paletaDoModelo(modelo, tema);
  return {
    "--sm-bg": p.bg,
    "--sm-alt": p.alt,
    "--sm-paper": p.paper,
    "--sm-ink": p.ink,
    "--sm-muted": p.muted,
    "--sm-accent": p.accent,
    "--sm-line": p.line,
    "--sm-line-strong": p.lineStrong,
    "--sm-dark": p.dark,
    "--sm-dark-ink": p.darkInk,
    ...(p.proprias ?? {}),
  };
}

/** De qual variável cada papel da família toma o lugar. */
export const PAPEL_PARA_VARIAVEL: Record<PapelDeCor, string> = {
  fundo: "--sm-bg",
  superficie: "--sm-paper",
  tinta: "--sm-ink",
  suave: "--sm-muted",
  acento: "--sm-accent",
};

/**
 * Para a troca de cor futura (ainda sem tela): os papéis escolhidos por
 * cima das variáveis do modelo, e o que depende deles sai por color-mix —
 * senão uma tinta nova ficaria com a linha da paleta antiga. As
 * proporções foram medidas no Marfim (linha ≈ 12% da tinta sobre o fundo;
 * linha forte ≈ 30%).
 */
export function varsComPapeis(
  base: Record<string, string>,
  cores: Partial<Record<PapelDeCor, string>> | null | undefined
): Record<string, string> {
  const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
  const vars = { ...base };
  let mudou = false;
  for (const papel of Object.keys(PAPEL_PARA_VARIAVEL) as PapelDeCor[]) {
    const v = hex(cores?.[papel]);
    if (v) {
      vars[PAPEL_PARA_VARIAVEL[papel]] = v;
      mudou = true;
    }
  }
  if (!mudou) return vars;
  if (hex(cores?.superficie)) vars["--sm-alt"] = "color-mix(in srgb, var(--sm-ink) 4%, var(--sm-paper))";
  vars["--sm-line"] = "color-mix(in srgb, var(--sm-ink) 12%, var(--sm-bg))";
  vars["--sm-line-strong"] = "color-mix(in srgb, var(--sm-ink) 30%, var(--sm-bg))";
  vars["--sm-dark"] = "color-mix(in srgb, var(--sm-ink) 92%, #000)";
  vars["--sm-dark-ink"] = "var(--sm-bg)";
  return vars;
}
