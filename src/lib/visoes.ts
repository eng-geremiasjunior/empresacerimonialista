// As visões de cada tela-mãe.
//
// Em 15/09/2026 o menu lateral tinha 16 itens planos. Calendário, Catálogo,
// Contratos, Agenda de Fornecedores e Assinatura saíram do menu SEM sair do
// sistema: cada um passou a viver dentro da tela que o explica, como uma
// visão ao lado da principal (Eventos: Lista · Calendário; Gestão
// comercial, que se chamava Orçamentos: Propostas · Catálogo; Fornecedores: Cadastro · Contratos · Agenda de
// reuniões). As rotas não mudaram. A Assinatura, que tinha ido para dentro
// de Configurações, voltou ao menu lateral em 16/09/2026.
//
// Uma lista só, lida pela página-mãe e pelas páginas-filhas, para as abas
// serem as mesmas nos dois lugares. Os cargos repetem os do item que
// existia no menu (AppShell): quem não via o item não vê a visão.

// O ícone vai como nome (componente não atravessa do servidor para o
// cliente); o SubNav resolve o nome.
export type IconeDaVisao =
  | "lista"
  | "calendario"
  | "propostas"
  | "pedidos"
  | "relatorio"
  | "pagina"
  | "catalogo"
  | "cadastro"
  | "contratos"
  | "agenda";

export type Visao = { label: string; href: string; icone: IconeDaVisao; cargos?: string[] };

const CONDUZ = ["proprietaria", "coordenadora", "cerimonialista"];

export const VISOES_EVENTOS: Visao[] = [
  { label: "Lista", href: "/eventos", icone: "lista" },
  { label: "Calendário", href: "/calendario", icone: "calendario" },
];

// Vitrine profissional (16/09/2026): o começo do caminho comercial — a página
// traz o pedido, o pedido vira proposta. Só a dona, como o Catálogo: é a
// cara da empresa lá fora.
export const VISOES_ORCAMENTOS: Visao[] = [
  { label: "Propostas", href: "/orcamentos", icone: "propostas" },
  // quem pediu orçamento pela página: responde quem conduz proposta
  { label: "Pedidos", href: "/orcamentos/pedidos", icone: "pedidos", cargos: CONDUZ },
  // o resultado da empresa (valores fechados): dona e coordenadora, as
  // mesmas que já veem todas as propostas
  { label: "Relatório", href: "/orcamentos/relatorio", icone: "relatorio", cargos: ["proprietaria", "coordenadora"] },
  { label: "Vitrine profissional", href: "/orcamentos/pagina", icone: "pagina", cargos: ["proprietaria"] },
  { label: "Catálogo", href: "/catalogo", icone: "catalogo", cargos: ["proprietaria"] },
];

export const VISOES_FORNECEDORES: Visao[] = [
  { label: "Cadastro", href: "/fornecedores", icone: "cadastro" },
  { label: "Contratos", href: "/contratos", icone: "contratos", cargos: CONDUZ },
  { label: "Agenda de reuniões", href: "/agenda", icone: "agenda" },
];
