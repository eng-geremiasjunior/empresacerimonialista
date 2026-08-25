// Copy autoral do template "Maison Lumière" (design/template-5 Casamento),
// transcrita do handoff. Igual aos outros templates, é o texto do template
// — o que a empresa edita (pacotes, extras, fotos, depoimentos) vem do
// Catálogo de casamento e é compartilhado com o template V2.
// Ver [[proposta-templates]] e [[proposta-conteudo]].

export const NAV_MAISON = [
  { id: "apresentacao", label: "APRESENTAÇÃO" },
  { id: "quem-somos", label: "QUEM SOMOS" },
  { id: "incluso", label: "O QUE ESTÁ INCLUSO" },
  { id: "como-funciona", label: "COMO FUNCIONA" },
  { id: "no-dia", label: "NO DIA DO CASAMENTO" },
  { id: "investimento", label: "INVESTIMENTO" },
  { id: "eventos", label: "EVENTOS REALIZADOS" },
  { id: "depoimentos", label: "DEPOIMENTOS" },
  { id: "proximos", label: "PRÓXIMOS PASSOS" },
];

export const HERO_MAISON = {
  // Escassez fabricada: nada no sistema sabe quantas datas ela tem livres,
  // e o gatilho saía na proposta como se ela o tivesse escrito.
  badge: "PROPOSTA PERSONALIZADA",
  paragrafo:
    "Uma celebração pensada como alta-costura: cada detalhe sob medida, equipe exclusiva e curadoria de fornecedores nível maison. Orçamento único, sem pacotes genéricos.",
  cardReferencia: {
    rotulo: "REFERÊNCIA",
    titulo: "Seu casamento\nnesse padrão",
    descricao: "Villa, paisagismo suspenso e mesa orgânica curada.",
  },
};

export const QUEM_SOMOS_MAISON = {
  eyebrow: "QUEM SOMOS",
  titulo: "Ateliê de casamentos\nnível maison",
  paragrafo:
    "Não fazemos festas. Desenhamos memórias com obsessão por acabamento. Cada casamento é tratado como desfile: prova, ajuste, luz, tecido e cronometragem cirúrgica.",
  citacao: "“Detalhe é\nnão negociável.”",
  citacaoAutor: "DIRETORA CRIATIVA",
};

export const INCLUSO_MAISON = [
  {
    n: "01",
    titulo: "Direção criativa & projeto",
    descricao:
      "Moodboard, paleta, plantas, luz e curadoria de tecidos, apresentados presencialmente.",
  },
  {
    n: "02",
    titulo: "Equipe exclusiva no dia",
    descricao:
      "Equipe dedicada ao evento, comunicação por rádio, cronograma minuto a minuto e kit emergência completo.",
  },
  {
    n: "03",
    titulo: "Fornecedores curados",
    descricao:
      "Lista curada de parceiros que já conhecemos. Sem comissão oculta. Você aprova cada um.",
  },
  {
    n: "04",
    titulo: "Cerimonial e recepção",
    descricao:
      "Cerimonial e recepção conduzidos pela equipe, com controle de convidados e presentes.",
  },
  {
    n: "05",
    titulo: "Pós-produção",
    descricao:
      "Acompanhamento da edição de fotos e vídeo e da produção do álbum.",
  },
];

export const COMO_FUNCIONA_MAISON = {
  eyebrow: "COMO FUNCIONA",
  titulo: "Leveza para vocês,\nrigor para nós",
  passos: [
    {
      quando: "Semana 1",
      titulo: "Assinatura + imersão",
      descricao:
        "Contrato, pagamento da entrada, visita técnica e briefing no local.",
    },
    {
      quando: "Semana 2-6",
      titulo: "Projeto & compras",
      descricao:
        "Apresentações semanais, provas de mesa, vestido e luz. Tudo aprovado com vocês.",
    },
    {
      quando: "Semana 8",
      titulo: "Ensaio & checklist",
      descricao:
        "Ensaio de luz e som, cronograma final 15/15min, confirmação de convidados.",
    },
  ],
};

export const NO_DIA_MAISON = [
  {
    hora: "07:00",
    titulo: "Montagem cega",
    descricao:
      "Equipe entra sem contato com noivos. Checagem de luz, som, climatização e flores.",
  },
  {
    hora: "12:00",
    titulo: "Prévia fotográfica",
    descricao:
      "Making of com luz natural, vestido suspenso, buquê na água e flatlay joias.",
  },
  {
    hora: "16:30",
    titulo: "Cerimônia",
    descricao:
      "Entrada cronometrada, áudio lapela, controle de tempo e emoção com 2 cerimonialistas.",
  },
  {
    hora: "18:00",
    titulo: "Recepção",
    descricao:
      "Mesa posta impecável, serviço 1 garçom/12 convidados, troca de luz para jantar.",
  },
  {
    hora: "22:00",
    titulo: "Festa",
    descricao: "Pista com luz cênica, 2 DJs, coordenação de atrações e surpresas.",
  },
  {
    hora: "02:00",
    titulo: "Encerramento",
    descricao: "Desmontagem silenciosa, guarda de presentes e entrega de kit no hotel.",
  },
];

export const INVESTIMENTO_MAISON = {
  eyebrow: "INVESTIMENTO ÚNICO • PADRÃO MAISON",
  titulo: "Um orçamento.\nSem surpresas.",
  paragrafo:
    "Valor fechado, sem taxas de fornecedor e sem upsell no dia.",
  selo: "MAIS ESCOLHIDO",
  rodape: (pct: number) =>
    `Entrada de ${pct}% garante equipe exclusiva • Restante parcelado sem juros`,
  selos: ["✓ Contrato por escrito", "✓ Cronograma detalhado", "✓ Lista curada"],
};

// VAZIO DE PROPÓSITO. Depoimento inventado é depoimento falso: sai
// assinado por uma família que nunca existiu, numa proposta que a
// cerimonialista manda para uma cliente de verdade. Quando ela cadastrar
// os dela no Catálogo, eles aparecem; até lá a seção não existe — o mesmo
// que DEPOIMENTOS_CLASSICO já fazia.
export const DEPOIMENTOS_MAISON: {
  texto: string;
  autor: string;
  contexto: string | null;
}[] = [];

export const PROXIMOS_MAISON = {
  eyebrow: "PRÓXIMOS PASSOS",
  titulo: "Vamos travar\nsua data?",
  paragrafo: (pct: number) =>
    `Assine digitalmente e receba o contrato + cronograma + lista curada de fornecedores. Entrada de ${pct}% para garantir equipe exclusiva.`,
  cta: "ACEITAR PROPOSTA AGORA",
  stats: (pct: number) => [
    { valor: "Na hora", rotulo: "contrato +\ncronograma" },
    { valor: "18", rotulo: "fornecedores\ncurados" },
    { valor: `${pct}%`, rotulo: "entrada\ntrava equipe" },
  ],
  depoisTitulo: "O QUE ACONTECE DEPOIS",
  depois: [
    {
      titulo: "Assinatura digital",
      descricao: "Nome, CPF, e-mail + assinatura na tela. 2 minutos.",
    },
    {
      titulo: "Contrato + cronograma",
      descricao:
        "Contrato digital, cronograma detalhado e lista curada de fornecedores.",
    },
    {
      titulo: "Pagamento da entrada",
      descricao: "PIX ou parcelado sem juros. Trava equipe exclusiva e data.",
    },
    {
      titulo: "Grupo VIP",
      descricao: "WhatsApp direto com a cerimonialista + cronograma ao vivo.",
    },
  ],
};

export const MODAL_MAISON = {
  titulo: "ASSINATURA DIGITAL",
  subtitulo: "Confirme seus dados para travar a data",
  dicaAssinatura: "Desenhe acima com o dedo ou mouse",
  cta: "ASSINAR E TRAVAR DATA →",
  rodape: (pct: number) =>
    `Contrato digital na hora do aceite • Entrada ${pct}% • parcelado sem juros`,
};
