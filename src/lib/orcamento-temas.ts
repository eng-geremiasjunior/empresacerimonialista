// Paleta da proposta pública.
//
// Antes havia 4 temas selecionáveis. A proposta foi refeita como peça
// única (calculadora + aceite), então restou UMA identidade: creme,
// marrom e dourado, extraída da arte de referência.
//
// As CSS variables continuam existindo porque os componentes de seção já
// leem var(--cor-*) — trocá-las por classes fixas seria reescrever tudo
// sem ganho. A coluna empresas.template_orcamento ficou sem uso e é
// ignorada; não a removi para não destruir dado à toa.
//
// A forma de TEMAS/resolverTema foi mantida para o gerador de PDF, que
// recebe a paleta por parâmetro (react-pdf não tem CSS variables).

export const TEMAS = {
  proposta: {
    nome: "Proposta",
    descricao: "Creme, marrom e dourado",
    corFundo: "#F9F5F0",
    corCard: "#FDFCFB",
    corFundoDestaque: "#FFF9F0",
    corBorda: "#E8DDD2",
    corTextoPrincipal: "#3C2415",
    corTextoSecundario: "#6B5A4B",
    corTextoTerciario: "#8B7355",
    corAcento: "#B8935A",
    corDetalhe: "#B8935A",
    corEscuro: "#3C2415",
    corPlaceholder: "#E8DDD2",
    corBordaDestaque: "#E8DDD2",
    corNeutro: "#F9F5F0",
    corSidebar: "#FDFCFB",
    corSidebarTexto: "#6B5A4B",
    corSidebarAtivoBg: "#3C2415",
    corSidebarAtivoTexto: "#FFFFFF",
    corSidebarAtivoBorda: "transparent",
    sombraAcento: "rgba(60,36,21,0.28)",
    gradienteHero:
      "linear-gradient(135deg, #E8DDD2 0%, #D9C7B4 45%, #B8935A 100%)",
    fonteCorpo: "var(--font-inter)",
    // --- arranjo, lido pelos componentes de seção ---
    heroDividido: true,
    secoesEmCartao: false,
    cartaoComSombra: true,
    tituloEstilo: "centralizado-barra" as
      | "simples"
      | "traco"
      | "centralizado"
      | "centralizado-barra",
    numerosSolidos: true,
  },
} as const;

export type TemaOrcamento = keyof typeof TEMAS;

export const TEMA_PADRAO: TemaOrcamento = "proposta";

// Assinatura mantida: qualquer valor legado vira o tema único.
export function resolverTema(_valor?: string | null): TemaOrcamento {
  return TEMA_PADRAO;
}

export function variaveisDoTema(
  tema: TemaOrcamento = TEMA_PADRAO
): React.CSSProperties {
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
    "--cor-escuro": t.corEscuro,
    "--cor-placeholder": t.corPlaceholder,
    "--cor-borda-destaque": t.corBordaDestaque,
    "--cor-neutro": t.corNeutro,
    "--cor-sidebar": t.corSidebar,
    "--cor-sidebar-texto": t.corSidebarTexto,
    "--cor-sidebar-ativo-bg": t.corSidebarAtivoBg,
    "--cor-sidebar-ativo-texto": t.corSidebarAtivoTexto,
    "--cor-sidebar-ativo-borda": t.corSidebarAtivoBorda,
    "--sombra-acento": t.sombraAcento,
    "--gradiente-hero": t.gradienteHero,
    "--fonte-corpo": t.fonteCorpo,
  } as React.CSSProperties;
}
