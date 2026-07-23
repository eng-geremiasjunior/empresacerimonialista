// Temas visuais da landing da proposta.
//
// A troca é PURAMENTE estética: mesma estrutura de dados, mesmo
// comportamento. Cor e fonte saem por CSS variables; as diferenças de
// ARRANJO ficam como flags aqui e são lidas por contexto, para nenhum
// componente precisar saber qual tema está ativo.
//
// A barra lateral tem tokens próprios porque no Template 3 ela é ESCURA:
// o texto do menu não pode herdar a cor de texto da página, que é vinho
// sobre creme.

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
    // barra lateral
    corSidebar: "#FFFFFF",
    corSidebarTexto: "#5B4A43",
    corSidebarAtivoBg: "#F6E9E6",
    corSidebarAtivoTexto: "#A85950",
    sombraAcento: "rgba(168,89,80,0.55)",
    gradienteHero:
      "linear-gradient(135deg, #EFDCD5 0%, #E7CDC4 45%, #D9B3A8 100%)",
    fonteCorpo: "var(--font-inter)",
    // --- arranjo ---
    heroDividido: false,
    secoesEmCartao: false,
    cartaoComSombra: false,
    tituloEstilo: "simples" as const,
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
    corSidebarTexto: "#4A473C",
    corSidebarAtivoBg: "#4B5632",
    corSidebarAtivoTexto: "#FFFFFF",
    sombraAcento: "rgba(75,86,50,0.45)",
    gradienteHero:
      "linear-gradient(135deg, #DDE1D0 0%, #C9CFB6 45%, #A9B18C 100%)",
    fonteCorpo: "var(--font-poppins)",
    heroDividido: true,
    secoesEmCartao: true,
    cartaoComSombra: false,
    tituloEstilo: "traco" as const,
    numerosSolidos: true,
  },
  template_3: {
    nome: "Vinho / Dourado",
    descricao: "Clássico e sofisticado",
    corFundo: "#FAF7F2",
    corCard: "#FFFFFF",
    corFundoDestaque: "#F6ECE1",
    corBorda: "#F0E6DA",
    corTextoPrincipal: "#3A0D19",
    corTextoSecundario: "#5C473D",
    corTextoTerciario: "#8A7A6F",
    corAcento: "#4A1220",
    corDetalhe: "#C9A15A",
    corPlaceholder: "#F5EDE6",
    corBordaDestaque: "#E2D3C3",
    corNeutro: "#F5EDE6",
    // sidebar escura em degradê — por isso os tokens próprios
    corSidebar: "linear-gradient(180deg, #4A1220, #3A0D19)",
    corSidebarTexto: "#F2E6DF",
    corSidebarAtivoBg: "#F5EDE6",
    corSidebarAtivoTexto: "#3A0D19",
    sombraAcento: "rgba(58,13,25,0.35)",
    gradienteHero:
      "linear-gradient(135deg, #F5EDE6 0%, #E2D3C3 45%, #D8C4A8 100%)",
    fonteCorpo: "var(--font-inter)",
    heroDividido: true,
    secoesEmCartao: false,
    cartaoComSombra: true,
    tituloEstilo: "centralizado-barra" as const,
    numerosSolidos: true,
  },
} as const;

export type TemaOrcamento = keyof typeof TEMAS;

export const TEMA_PADRAO: TemaOrcamento = "template_1";

export function resolverTema(valor: string | null | undefined): TemaOrcamento {
  if (valor === "template_2" || valor === "template_3") return valor;
  return TEMA_PADRAO;
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
    "--cor-sidebar-texto": t.corSidebarTexto,
    "--cor-sidebar-ativo-bg": t.corSidebarAtivoBg,
    "--cor-sidebar-ativo-texto": t.corSidebarAtivoTexto,
    "--sombra-acento": t.sombraAcento,
    "--gradiente-hero": t.gradienteHero,
    "--fonte-corpo": t.fonteCorpo,
  } as React.CSSProperties;
}
