// O conteúdo do site navegável (27/09/2026): a apresentação da home e as
// páginas por tipo de evento (/para/…) e por funcionalidade
// (/funcionalidades/…). Um molde só (PaginaDoSite), e cada página é um
// bloco de dados aqui.
//
// As telas são REAIS: conta-vitrine (Ateliê Marina) e o portal de exemplo
// dos 15 anos, fotografados pelo estúdio (ferramentas/video/cenas/
// site-apresentacao.mjs, site-paginas.mjs, portal-debutante.mjs). O
// recorte é um pedaço da mesma tela. Nada aqui promete o que o sistema
// não faz: o texto conta o que a tela ao lado mostra.

export type PassoDaApresentacao = {
  id: string;
  rotulo: string;
  titulo: string;
  texto: string;
  /** /site/tela-*.webp, 720 de largura */
  tela: string;
  recorte: { src: string; largura: number; altura: number };
};

const r = (nome: string, largura: number, altura: number) => ({ src: `/site/recorte-${nome}.webp`, largura, altura });

/* ------------------------------------------------------------------ */
/* as etapas                                                           */
/* ------------------------------------------------------------------ */

const EVENTO: PassoDaApresentacao = {
  id: "evento",
  rotulo: "Um evento, uma tela",
  titulo: "Você abre o evento e sabe o que fazer agora.",
  texto: "Quanto falta, quem ainda não confirmou e qual parcela venceu, com o botão para resolver do lado.",
  tela: "/site/tela-evento.webp",
  recorte: r("evento", 760, 380),
};
const PLANEJAMENTO: PassoDaApresentacao = {
  id: "planejamento",
  rotulo: "O planejamento",
  titulo: "O que precisa ser decidido, na ordem certa.",
  texto: "Cada decisão chega com prazo, do jeito de cada tipo de evento. O que foi decidido vira tarefa.",
  tela: "/site/tela-planejamento.webp",
  recorte: r("planejamento", 760, 456),
};
const CADERNO: PassoDaApresentacao = {
  id: "caderno",
  rotulo: "O caderno",
  titulo: "As decisões e a verba, lado a lado.",
  texto: "Quanto está previsto, quanto está reservado e quanto ainda sobra da verba, junto de cada decisão.",
  tela: "/site/tela-caderno.webp",
  recorte: r("caderno", 760, 472),
};
const FORNECEDORES: PassoDaApresentacao = {
  id: "fornecedores",
  rotulo: "Os fornecedores",
  titulo: "Cada fornecedor recebe o roteiro dele, no celular.",
  texto: "Um link por fornecedor, só com os horários dele. Ele confirma ali mesmo, e o link acompanha quando o roteiro muda.",
  tela: "/site/tela-fornecedores.webp",
  recorte: r("fornecedores", 640, 736),
};
const ROTEIRO: PassoDaApresentacao = {
  id: "roteiro",
  rotulo: "O roteiro do dia",
  titulo: "Do caminhão da estrutura à saída dos noivos.",
  texto: "Cada item com a hora, a duração e o fornecedor responsável. Cada fornecedor vê só o que é dele.",
  tela: "/site/tela-roteiro.webp",
  recorte: r("roteiro", 760, 592),
};
const PORTAL: PassoDaApresentacao = {
  id: "portal",
  rotulo: "A família",
  titulo: "A família acompanha tudo num portal só dela.",
  texto: "Escolhas, convidados, a noite e o dinheiro da festa. E você para de responder a mesma pergunta.",
  tela: "/site/tela-portal.webp",
  recorte: r("portal", 760, 502),
};
const DIA: PassoDaApresentacao = {
  id: "dia",
  rotulo: "O dia do evento",
  titulo: "No dia, você vê tudo acontecendo.",
  texto: "O que está acontecendo agora, o que vem depois e quem avisou de um problema.",
  tela: "/site/tela-dia.webp",
  recorte: r("dia", 760, 578),
};
const FINANCEIRO: PassoDaApresentacao = {
  id: "financeiro",
  rotulo: "O financeiro",
  titulo: "O dinheiro de cada evento, sem planilha.",
  texto: "Parcela atrasada, pagamento sem comprovante e o que ainda falta contratar, num quadro só.",
  tela: "/site/tela-financeiro.webp",
  recorte: r("financeiro", 760, 426),
};
const ASSESSORIA: PassoDaApresentacao = {
  id: "assessoria",
  rotulo: "O seu dinheiro",
  titulo: "O contrato da sua assessoria, separado da verba da festa.",
  texto: "Quanto você já recebeu, o que falta e a próxima parcela, sem misturar com o dinheiro dos clientes.",
  tela: "/site/tela-assessoria.webp",
  recorte: r("assessoria", 760, 494),
};
const DEB_ESCOLHAS: PassoDaApresentacao = {
  id: "escolhas",
  rotulo: "As escolhas",
  titulo: "Você manda as opções. A família escolhe, ou propõe a dela.",
  texto: "Música da valsa, bar sem álcool, lembrancinhas: cada escolha com prazo, e a resposta chega para você.",
  tela: "/site/tela-deb-escolhas.webp",
  recorte: r("deb-escolhas", 760, 464),
};
const DEB_CORTE: PassoDaApresentacao = {
  id: "corte",
  rotulo: "A corte e as 15 velas",
  titulo: "Quem acende cada vela, na ordem da cerimônia.",
  texto: "A família monta a corte e ensaia a cerimônia das velas no celular, vela por vela.",
  tela: "/site/tela-deb-corte.webp",
  recorte: r("deb-corte", 640, 540),
};
const DEB_NOITE: PassoDaApresentacao = {
  id: "noite",
  rotulo: "A noite",
  titulo: "A noite, momento a momento.",
  texto: "A família vê o roteiro e sugere mudanças. Quem mexe no horário é você.",
  tela: "/site/tela-deb-noite.webp",
  recorte: r("deb-noite", 760, 532),
};
const DEB_TRILHA: PassoDaApresentacao = {
  id: "trilha",
  rotulo: "A trilha",
  titulo: "A música de cada momento.",
  texto: "Entrada, valsa com o pai, valsa com o príncipe, as 15 velas, o parabéns: a família ouve o trecho e escolhe.",
  tela: "/site/tela-deb-trilha.webp",
  recorte: r("deb-trilha", 760, 456),
};
const DEB_CONVIDADOS: PassoDaApresentacao = {
  id: "convidados",
  rotulo: "Os convidados",
  titulo: "Quantos vão para o buffet, sem planilha.",
  texto: "Confirmados, sem resposta e quem não vai, e o salão lugar por lugar.",
  tela: "/site/tela-deb-convidados.webp",
  recorte: r("deb-convidados", 760, 486),
};
const DEB_DINHEIRO: PassoDaApresentacao = {
  id: "dinheiro",
  rotulo: "O dinheiro da festa",
  titulo: "O que a família paga, às claras.",
  texto: "O próximo vencimento, o que já foi pago com comprovante, e um espaço só da família que você não vê.",
  tela: "/site/tela-deb-dinheiro.webp",
  recorte: r("deb-dinheiro", 760, 578),
};
const DEB_ROTEIRO: PassoDaApresentacao = {
  id: "roteiro-15",
  rotulo: "O seu roteiro",
  titulo: "Do making of à pista, com cada fornecedor.",
  texto: "O DJ, o buffet e o fotógrafo recebem cada um o seu roteiro, no celular. A entrada da debutante está lá, na hora certa.",
  tela: "/site/tela-deb-roteiro.webp",
  recorte: r("deb-roteiro", 760, 608),
};

export const PASSOS_DA_HOME: PassoDaApresentacao[] = [EVENTO, PLANEJAMENTO, FORNECEDORES, PORTAL, DIA, FINANCEIRO];

/* ------------------------------------------------------------------ */
/* as páginas                                                          */
/* ------------------------------------------------------------------ */

export type PaginaDoSite = {
  slug: string;
  meta: { titulo: string; descricao: string };
  sobre: string;
  /** {trecho} sai em itálico e na cor */
  titulo: string;
  sub: string;
  foto?: { src: string; alt: string; posicao?: string };
  apresentacao: { sobre: string; titulo: string; passos: PassoDaApresentacao[] };
  /** as seções que andam com a rolagem, depois da apresentação */
  extras?: ("palco" | "roteiro")[];
  lista?: { titulo: string; itens: string[]; notas: string[] };
  perguntas: [string, string][];
};

export const PAGINAS_POR_EVENTO: PaginaDoSite[] = [
  {
    slug: "casamento",
    meta: {
      titulo: "Sistema para cerimonialista de casamento — eorganizei",
      descricao: "Do planejamento com os noivos ao roteiro de cada fornecedor no dia do casamento, tudo num evento só.",
    },
    sobre: "Para cerimonialistas de casamento",
    titulo: "O casamento inteiro, {do sim ao fim da festa.}",
    sub: "Do planejamento com os noivos ao roteiro de cada fornecedor no dia, tudo num evento só.",
    foto: { src: "/site/foto-casamento.webp", alt: "Noivos no altar, diante do arco de flores", posicao: "50% 35%" },
    apresentacao: {
      sobre: "Um casamento por dentro",
      titulo: "O que você acompanha, etapa por etapa.",
      passos: [EVENTO, CADERNO, FORNECEDORES, ROTEIRO, DIA, ASSESSORIA],
    },
    extras: ["palco", "roteiro"],
    perguntas: [
      ["Os noivos precisam baixar algum aplicativo?", "Não. O portal da família abre no navegador do celular, com o acesso que você libera."],
      ["O fornecedor precisa ter conta?", "Não. Ele recebe um link com o roteiro dele e confirma por ali."],
      ["Posso usar o meu jeito de planejar?", "Pode. Você ajusta as decisões do casamento e salva como modelo para os próximos."],
      ["Quantos casamentos cabem?", "Os planos vão de 1 evento a eventos sem limite."],
    ],
  },
  {
    slug: "15-anos",
    meta: {
      titulo: "Sistema para cerimonialista de 15 anos — eorganizei",
      descricao: "A debutante e a família acompanham as escolhas, a corte, as 15 velas e a noite num portal só delas.",
    },
    sobre: "Para cerimonialistas de 15 anos",
    titulo: "A festa de 15 anos, {com a família junto.}",
    sub: "A debutante e a família acompanham tudo pelo portal: as escolhas, a corte, as 15 velas e a noite.",
    foto: { src: "/site/foto-15-anos.webp", alt: "Debutante de vestido azul segurando o buquê, à noite", posicao: "50% 25%" },
    apresentacao: {
      sobre: "Uma festa de 15 anos por dentro",
      titulo: "O que a família vê, e o que você conduz.",
      passos: [PORTAL, DEB_ESCOLHAS, DEB_CORTE, DEB_NOITE, DEB_TRILHA, DEB_ROTEIRO],
    },
    perguntas: [
      ["A família precisa instalar algum aplicativo?", "Não. O portal abre no navegador, no endereço debut.eorganizei.com.br."],
      ["A família paga alguma coisa?", "Não. O portal vem junto com o seu plano."],
      ["Serve para quem também faz casamento?", "Serve. O mesmo sistema cuida de casamento, 15 anos e dos outros tipos de evento."],
    ],
  },
  {
    slug: "outros-eventos",
    meta: {
      titulo: "Sistema para cerimonial de eventos corporativos, aniversários e formaturas — eorganizei",
      descricao: "O roteiro de cada fornecedor, o financeiro e o dia do evento, em qualquer tipo de evento.",
    },
    sobre: "Para todo tipo de evento",
    titulo: "Corporativo, aniversário, formatura, {e o que vier.}",
    sub: "O roteiro de cada fornecedor, o financeiro e o dia do evento funcionam em todos os tipos.",
    foto: { src: "/site/foto-outros.webp", alt: "Convidados à mesa num jantar de evento", posicao: "50% 40%" },
    lista: {
      titulo: "Um sistema, nove tipos de evento.",
      itens: ["Casamento", "15 anos", "Aniversário", "Corporativo", "Formatura", "Chá revelação", "Batizado", "Bodas", "Show e grande porte"],
      notas: [
        "Casamento, 15 anos e corporativo já começam com o planejamento pronto, na ordem certa.",
        "Nos outros tipos, você monta o seu planejamento uma vez e salva como modelo para os próximos.",
        "No corporativo, a lista é de participantes. No show de grande porte, você trabalha com o público esperado, sem lista nominal.",
      ],
    },
    apresentacao: {
      sobre: "As mesmas ferramentas",
      titulo: "O que funciona em qualquer evento.",
      passos: [EVENTO, FORNECEDORES, DIA, FINANCEIRO],
    },
    perguntas: [
      ["Serve para evento corporativo?", "Serve. O corporativo tem lista de participantes, mesas e um planejamento próprio."],
      ["E para show ou evento de grande porte?", "Serve para o roteiro, os fornecedores, a equipe e o financeiro. A lista nominal de convidados fica de fora nesse porte."],
      ["Posso usar o meu jeito de planejar?", "Pode. Você monta o planejamento uma vez e salva como modelo."],
    ],
  },
];

export const PAGINAS_POR_FUNCIONALIDADE: PaginaDoSite[] = [
  {
    slug: "roteiro-do-dia",
    meta: {
      titulo: "Roteiro do dia e fornecedores — eorganizei",
      descricao: "Um link por fornecedor, só com os horários dele, que acompanha quando o roteiro muda.",
    },
    sobre: "Roteiro do dia e fornecedores",
    titulo: "Cada fornecedor sabe a hora dele. {Você sabe de tudo.}",
    sub: "Um link por fornecedor, só com os horários dele, que acompanha quando o roteiro muda.",
    apresentacao: {
      sobre: "Do roteiro ao dia do evento",
      titulo: "O dia inteiro na ordem, com quem faz cada coisa.",
      passos: [ROTEIRO, FORNECEDORES, EVENTO, DIA],
    },
    extras: ["roteiro", "palco"],
    perguntas: [
      ["O fornecedor precisa ter conta?", "Não. Ele recebe um link com o roteiro dele e confirma por ali."],
      ["E se o roteiro mudar?", "O link continua o mesmo e mostra o roteiro novo."],
      ["Como sei quem ainda não confirmou?", "O evento mostra quem falta confirmar, com o botão para cobrar a confirmação."],
    ],
  },
  {
    slug: "portal-da-familia",
    meta: {
      titulo: "Portal da família para cerimonialistas — eorganizei",
      descricao: "Escolhas, convidados, a noite, a trilha e o dinheiro da festa, no celular da família.",
    },
    sobre: "Portal da família",
    titulo: "A família acompanha tudo {num portal só dela.}",
    sub: "Escolhas, convidados, a noite, a trilha e o dinheiro da festa, no celular da família.",
    apresentacao: {
      sobre: "O portal por dentro",
      titulo: "O que a família vê no celular.",
      passos: [PORTAL, DEB_ESCOLHAS, DEB_CONVIDADOS, DEB_DINHEIRO, DEB_CORTE, DEB_NOITE],
    },
    perguntas: [
      ["A família precisa instalar algum aplicativo?", "Não. O portal abre no navegador do celular."],
      ["O que a família não vê?", "O contrato e os valores da sua assessoria ficam só com você."],
      ["A família paga alguma coisa?", "Não. O portal vem junto com o seu plano."],
    ],
  },
  {
    slug: "planejamento",
    meta: {
      titulo: "Planejamento de eventos para cerimonialistas — eorganizei",
      descricao: "Cada decisão com prazo, a verba ao lado, e o que foi decidido vira tarefa.",
    },
    sobre: "Planejamento",
    titulo: "O que precisa ser decidido, {na ordem certa.}",
    sub: "Cada decisão com prazo, a verba ao lado, e o que foi decidido vira tarefa.",
    apresentacao: {
      sobre: "O planejamento por dentro",
      titulo: "Do primeiro contato à véspera da festa.",
      passos: [PLANEJAMENTO, CADERNO, EVENTO],
    },
    perguntas: [
      ["O planejamento já vem pronto?", "Para casamento, 15 anos e corporativo, sim. Nos outros tipos, você monta uma vez e salva como modelo."],
      ["Posso mudar?", "Pode: incluir decisões, tirar e marcar o que não se aplica ao evento."],
    ],
  },
  {
    slug: "financeiro",
    meta: {
      titulo: "Financeiro de eventos para cerimonialistas — eorganizei",
      descricao: "A verba do evento, o contrato da sua assessoria e a prestação de contas, cada um no seu lugar.",
    },
    sobre: "Financeiro",
    titulo: "O dinheiro de cada evento, {sem planilha.}",
    sub: "A verba do evento, o contrato da sua assessoria e a prestação de contas, cada um no seu lugar.",
    apresentacao: {
      sobre: "O financeiro por dentro",
      titulo: "O que precisa de ação, e o que é seu.",
      passos: [FINANCEIRO, ASSESSORIA, DEB_DINHEIRO],
    },
    perguntas: [
      ["O cliente vê o meu contrato?", "Não. O contrato e os valores da sua assessoria ficam só com você."],
      ["Dá para guardar o comprovante?", "Dá. O pagamento fica com o comprovante, pronto para a prestação de contas."],
    ],
  },
];
