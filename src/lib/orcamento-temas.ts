// Temas visuais da landing da proposta.
//
// A troca é PURAMENTE estética: mesma estrutura de dados, mesmo
// comportamento. As cores saem por CSS variables; as poucas diferenças de
// ARRANJO (hero dividido, seções em cartão) ficam declaradas aqui como
// flags e são lidas via contexto, para nenhum componente precisar saber
// qual tema está ativo.
//
// O Template 2 segue a arte "Proposta Karina Dries": creme quente, oliva
// escuro e dourado — não o verde-acinzentado da primeira versão.

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
    corDetalhe: "#A6824F",
    corPlaceholder: "#EFDCD5",
    corBordaDestaque: "#E7CFC9",
    corNeutro: "#F1EDE9",
    corSidebar: "#FFFFFF",
    sombraAcento: "rgba(168,89,80,0.55)",
    gradienteHero:
      "linear-gradient(135deg, #EFDCD5 0%, #E7CDC4 45%, #D9B3A8 100%)",
    fonteCorpo: "var(--font-inter)",
    // --- arranjo ---
    ornamentoBotanico: false,
    heroDividido: false,
    secoesEmCartao: false,
    navAtivaSolida: false,
    tituloComTraco: false,
    numerosSolidos: false,
  },
  template_2: {
    nome: "Verde Oliva",
    descricao: "Creme, oliva e dourado",
    corFundo: "#FAF6EF",
    corCard: "#FFFFFF",
    corFundoDestaque: "#F5F0E6",
    corBorda: "#E8E1D2",
    corTextoPrincipal: "#2B2B26",
    corTextoSecundario: "#4A473C",
    corTextoTerciario: "#8A8467",
    corAcento: "#4B5632",
    corDetalhe: "#B08D57",
    corPlaceholder: "#EFE8D9",
    corBordaDestaque: "#E5DFCF",
    corNeutro: "#EFE8D9",
    corSidebar: "#F5F0E6",
    sombraAcento: "rgba(75,86,50,0.45)",
    gradienteHero:
      "linear-gradient(135deg, #EFE8D9 0%, #E5DFCF 45%, #C9C7A8 100%)",
    fonteCorpo: "var(--font-poppins)",
    // --- arranjo ---
    ornamentoBotanico: true,
    heroDividido: true,
    secoesEmCartao: true,
    navAtivaSolida: true,
    tituloComTraco: true,
    numerosSolidos: true,
  },
} as const;

export type TemaOrcamento = keyof typeof TEMAS;

export const TEMA_PADRAO: TemaOrcamento = "template_1";

export function resolverTema(valor: string | null | undefined): TemaOrcamento {
  return valor === "template_2" ? "template_2" : TEMA_PADRAO;
}

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
    "--cor-sidebar": t.corSidebar,
    "--sombra-acento": t.sombraAcento,
    "--gradiente-hero": t.gradienteHero,
    "--fonte-corpo": t.fonteCorpo,
  } as React.CSSProperties;
}
