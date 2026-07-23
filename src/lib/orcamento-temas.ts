// Temas visuais da landing da proposta.
//
// A troca é PURAMENTE estética: mesma estrutura, mesmos dados, mesmo
// comportamento. Por isso os componentes não conhecem tema nenhum — eles
// leem CSS variables, e a página raiz define os valores.
//
// Além dos 8 tokens do brief, há 6 que os componentes já usavam com cor
// fixa (monograma dourado, fundo de imagem, borda do card de investimento,
// banner neutro, sombra do destaque e o gradiente-base do hero). Sem eles
// o Template 2 ficaria com resquícios rosa.

export const TEMAS = {
  template_1: {
    nome: "Rosa / Terracota",
    descricao: "Tom quente e romântico",
    corFundo: "#FAF6F2",
    corCard: "#FFFFFF",
    corFundoDestaque: "#F6E9E6",
    corBorda: "#ECE0DA",
    corTextoPrincipal: "#2E2621",
    corTextoSecundario: "#5B4A43",
    corTextoTerciario: "#8A7B73",
    corAcento: "#A85950",
    // --- complementares ---
    corDetalhe: "#A6824F",
    corPlaceholder: "#EFDCD5",
    corBordaDestaque: "#E7CFC9",
    corNeutro: "#F1EDE9",
    sombraAcento: "rgba(168,89,80,0.55)",
    gradienteHero:
      "linear-gradient(135deg, #EFDCD5 0%, #E7CDC4 45%, #D9B3A8 100%)",
  },
  template_2: {
    nome: "Verde Oliva",
    descricao: "Tom natural e sóbrio",
    corFundo: "#F5F5F0",
    corCard: "#FFFFFF",
    corFundoDestaque: "#E8EBE0",
    corBorda: "#D4D8C8",
    corTextoPrincipal: "#2C2E24",
    corTextoSecundario: "#565A46",
    corTextoTerciario: "#8B8F7A",
    corAcento: "#6B7548",
    // --- complementares ---
    corDetalhe: "#8A9160",
    corPlaceholder: "#DDE1D0",
    corBordaDestaque: "#C9CFB6",
    corNeutro: "#EDEEE7",
    sombraAcento: "rgba(107,117,72,0.45)",
    gradienteHero:
      "linear-gradient(135deg, #DDE1D0 0%, #C9CFB6 45%, #A9B18C 100%)",
  },
} as const;

export type TemaOrcamento = keyof typeof TEMAS;

export const TEMA_PADRAO: TemaOrcamento = "template_1";

export function resolverTema(valor: string | null | undefined): TemaOrcamento {
  return valor === "template_2" ? "template_2" : TEMA_PADRAO;
}

// Traduz o tema para as CSS variables consumidas pelos componentes.
export function variaveisDoTema(tema: TemaOrcamento): React.CSSProperties {
  const t = TEMAS[tema];
  return {
    "--cor-fundo": t.corFundo,
    "--cor-card": t.corCard,
    "--cor-fundo-destaque": t.corFundoDestaque,
    "--cor-borda": t.corBorda,
    "--cor-texto-principal": t.corTextoPrincipal,
    "--cor-texto-secundario": t.corTextoSecundario,
    "--cor-texto-terciario": t.corTextoTerciario,
    "--cor-acento": t.corAcento,
    "--cor-detalhe": t.corDetalhe,
    "--cor-placeholder": t.corPlaceholder,
    "--cor-borda-destaque": t.corBordaDestaque,
    "--cor-neutro": t.corNeutro,
    "--sombra-acento": t.sombraAcento,
    "--gradiente-hero": t.gradienteHero,
  } as React.CSSProperties;
}
