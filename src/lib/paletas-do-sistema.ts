// As paletas do sistema (19/10/2026, pedido dele: "não é possível ter no
// meu painel de administração uma seleção de paletas onde eu mesmo troco
// quando eu achar pertinente?"). Ele escolhe em /admin/ajustes; a moldura
// do app aplica por cima dos tokens de moldura-css.ts. Cada paleta tem o
// destaque (botão, item ativo), o tom escuro (passar o mouse), o tom
// claro (fundo do ativo), o texto e os dois cinzas de apoio. O vermelho
// de atraso e as divisórias não mudam: atraso é atraso em qualquer cor.
//
// Isomórfico: sem banco, sem React.

export type ChaveDaPaleta = "petroleo" | "oliva" | "ardosia" | "chumbo" | "terracota" | "ameixa";

export type PaletaDoSistema = {
  chave: ChaveDaPaleta;
  nome: string;
  destaque: string;
  escuro: string;
  claro: string;
  tinta: string;
  cinza1: string;
  cinza2: string;
};

// cinzas frios (chumbo) para os destaques frios; quentes para os quentes
const FRIO = { tinta: "#292D2C", cinza1: "#4F5558", cinza2: "#6B7275" };
const QUENTE = { tinta: "#252525", cinza1: "#68645E", cinza2: "#736D65" };

export const PALETAS: PaletaDoSistema[] = [
  { chave: "petroleo", nome: "Azul petróleo", destaque: "#244C50", escuro: "#1A3A3D", claro: "#E3ECEC", ...FRIO },
  { chave: "oliva", nome: "Verde oliva", destaque: "#343D36", escuro: "#262D28", claro: "#E5E9E4", ...FRIO },
  { chave: "ardosia", nome: "Azul ardósia", destaque: "#35465A", escuro: "#283545", claro: "#E4E8EE", ...FRIO },
  { chave: "chumbo", nome: "Cinza chumbo", destaque: "#3E4447", escuro: "#2D3234", claro: "#E6E8E9", ...FRIO },
  { chave: "terracota", nome: "Terracota", destaque: "#A34F3E", escuro: "#86402F", claro: "#F6E8E3", ...QUENTE },
  { chave: "ameixa", nome: "Ameixa", destaque: "#6E3F5F", escuro: "#57314B", claro: "#F1E7EE", ...QUENTE },
];

export const PALETA_PADRAO: ChaveDaPaleta = "petroleo";

export function paletaDe(chave: string | null | undefined): PaletaDoSistema {
  return PALETAS.find((p) => p.chave === chave) ?? PALETAS.find((p) => p.chave === PALETA_PADRAO)!;
}

/** As variáveis que a moldura aplica por cima dos tokens (style da .mo-raiz). */
export function variaveisDaPaleta(p: PaletaDoSistema): Record<string, string> {
  return {
    "--mo-destaque": p.destaque,
    "--mo-destaque-escuro": p.escuro,
    "--mo-destaque-claro": p.claro,
    "--mo-tinta": p.tinta,
    "--mo-cinza-1": p.cinza1,
    "--mo-cinza-2": p.cinza2,
    "--ev-accent": p.destaque,
    "--ev-accent-hover": p.escuro,
    "--ev-accent-tint": p.claro,
    "--ev-text-strong": p.tinta,
    "--ev-text-muted": p.cinza1,
    "--ev-cta": p.tinta,
  };
}
