// As visões de cada tela-mãe.
//
// Em 15/09/2026 o menu lateral tinha 16 itens planos. Calendário, Catálogo,
// Contratos, Agenda de Fornecedores e Assinatura saíram do menu SEM sair do
// sistema: cada um passou a viver dentro da tela que o explica, como uma
// visão ao lado da principal (Eventos: Lista · Calendário; Orçamentos:
// Propostas · Catálogo; Fornecedores: Cadastro · Contratos · Agenda de
// reuniões; Configurações: Plano e assinatura). As rotas não mudaram.
//
// Uma lista só, lida pela página-mãe e pelas páginas-filhas, para as abas
// serem as mesmas nos dois lugares. Os cargos repetem os do item que
// existia no menu (AppShell): quem não via o item não vê a visão.

export type Visao = { label: string; href: string; cargos?: string[] };

const CONDUZ = ["proprietaria", "coordenadora", "cerimonialista"];

export const VISOES_EVENTOS: Visao[] = [
  { label: "Lista", href: "/eventos" },
  { label: "Calendário", href: "/calendario" },
];

// Página pública (16/09/2026): o começo do caminho comercial — a página
// traz o pedido, o pedido vira proposta. Só a dona, como o Catálogo: é a
// cara da empresa lá fora.
export const VISOES_ORCAMENTOS: Visao[] = [
  { label: "Propostas", href: "/orcamentos" },
  // quem pediu orçamento pela página: responde quem conduz proposta
  { label: "Pedidos", href: "/orcamentos/pedidos", cargos: CONDUZ },
  { label: "Página pública", href: "/orcamentos/pagina", cargos: ["proprietaria"] },
  { label: "Catálogo", href: "/catalogo", cargos: ["proprietaria"] },
];

export const VISOES_FORNECEDORES: Visao[] = [
  { label: "Cadastro", href: "/fornecedores" },
  { label: "Contratos", href: "/contratos", cargos: CONDUZ },
  { label: "Agenda de reuniões", href: "/agenda" },
];
