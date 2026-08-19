// Copy-padrão do template Clássico — Creme e Dourado (handoff hi-fi).
//
// ÚNICO lugar onde estes textos existem no código. O template público e
// o editor do Catálogo leem DAQUI: banco vazio → o casal vê isto; a
// proprietária abre o Catálogo, encontra isto pré-preenchido e muda o
// que quiser — a partir daí vale o banco. Decisão de projeto (101):
// nada de seed em SQL, para copy nunca divergir entre migração e código.
//
// Estes textos descrevem SERVIÇO, nunca histórico. A versão anterior
// vinha do handoff com números de outra empresa ("120+ fornecedores
// homologados", "18% de economia", "80 casamentos por ano") e três
// depoimentos com nomes inventados — que apareciam por padrão em toda
// conta nova, ou seja, viravam afirmação falsa na proposta de uma
// cerimonialista real. Número que a usuária pode comprovar tem lugar
// próprio: os stats do Catálogo (anos de experiência, eventos
// realizados) e os depoimentos que ela mesma cadastra.

export type BlocoProposta = {
  secao: "incluso" | "no_dia" | "proximos_passos";
  icone: string | null;
  titulo: string;
  texto_curto: string | null;
  texto_longo: string | null;
};

export const BLOCOS_INCLUSO_CLASSICO: BlocoProposta[] = [
  {
    secao: "incluso",
    icone: "relogio",
    titulo: "Planejamento Total",
    texto_curto:
      "Cronograma detalhado de 6 meses, com checkpoints semanais e gestão de fornecedores.",
    texto_longo:
      "Um plano mestre com todas as frentes do casamento, do buffet à última música. Vocês acompanham a evolução em tempo real, recebem lembretes do que está por vencer e temos reuniões de alinhamento ao longo de todo o caminho.",
  },
  {
    secao: "incluso",
    icone: "trofeu",
    titulo: "Curadoria Premium",
    texto_curto:
      "Seleção a dedo dos melhores fornecedores com negociação exclusiva.",
    texto_longo:
      "Indicamos apenas fornecedores que já conhecemos de perto, negociamos condições em nome de vocês e conferimos as cláusulas de proteção do contrato antes de qualquer assinatura.",
  },
  {
    secao: "incluso",
    icone: "brilho",
    titulo: "Design & Estilo",
    texto_curto:
      "Moodboard, paleta, papelaria e projeto de decoração autoral.",
    texto_longo:
      "Da paleta de cores que vocês amam ao desenho da mesa de doces. Entregamos moodboard, projeto de decoração, papelaria e apoio na escolha do vestido.",
  },
  {
    secao: "incluso",
    icone: "coracao",
    titulo: "No Dia - 12h",
    texto_curto:
      "Equipe completa cuidando de cada detalhe para vocês viverem.",
    texto_longo:
      "Chegamos antes de todo mundo, coordenamos os fornecedores, cuidamos do buquê, da gravata do noivo, da entrada da daminha. Vocês só precisam dizer SIM. Kit emergência e apoio do começo ao fim.",
  },
  {
    secao: "incluso",
    icone: "presente",
    titulo: "Pós-Casamento",
    texto_curto:
      "Devolução de itens, agradecimentos e entrega de fornecedores.",
    texto_longo:
      "Depois do grande dia, cuidamos da devolução de trajes e itens alugados, da entrega das fotos e da coordenação dos agradecimentos — com canal aberto para o que ainda surgir.",
  },
];

export const BLOCOS_NO_DIA_CLASSICO: BlocoProposta[] = [
  {
    secao: "no_dia",
    icone: "camera",
    titulo: "Coordenação total",
    texto_curto: "Fornecedores sincronizados do início ao fim",
    texto_longo: null,
  },
  {
    secao: "no_dia",
    icone: "flor",
    titulo: "Buquê & lapela",
    texto_curto: "Conservação e entrega pontual",
    texto_longo: null,
  },
  {
    secao: "no_dia",
    icone: "talheres",
    titulo: "Degustação final",
    texto_curto: "Check de buffet e bar antes de abrir",
    texto_longo: null,
  },
  {
    secao: "no_dia",
    icone: "musica",
    titulo: "Timeline musical",
    texto_curto: "Entrada, votos e festa no tempo exato",
    texto_longo: null,
  },
  {
    secao: "no_dia",
    icone: "pessoas",
    titulo: "Recepção VIP",
    texto_curto: "Recebemos padrinhos e família",
    texto_longo: null,
  },
  {
    secao: "no_dia",
    icone: "presente",
    titulo: "Kit noiva",
    texto_curto: "Costura, remédio, lencinho e super-bonder",
    texto_longo: null,
  },
];

export const BLOCOS_PROXIMOS_CLASSICO: BlocoProposta[] = [
  {
    secao: "proximos_passos",
    icone: null,
    titulo: "Aceite digital com assinatura de ambos",
    texto_curto: null,
    texto_longo: null,
  },
  {
    secao: "proximos_passos",
    icone: null,
    titulo: "Entrada para travar a data do casamento",
    texto_curto: null,
    texto_longo: null,
  },
  {
    secao: "proximos_passos",
    icone: null,
    titulo: "Reunião de boas-vindas para começar o planejamento",
    texto_curto: null,
    texto_longo: null,
  },
];

/** todos os blocos-padrão, na ordem de exibição */
export const BLOCOS_PADRAO_CLASSICO: BlocoProposta[] = [
  ...BLOCOS_INCLUSO_CLASSICO,
  ...BLOCOS_NO_DIA_CLASSICO,
  ...BLOCOS_PROXIMOS_CLASSICO,
];

// Etapas do processo. Na prática este fallback quase não aparece: toda
// empresa nasce com as 6 etapas semeadas no banco (057) e edita por lá.
export const ETAPAS_CLASSICO = [
  {
    titulo: "Diagnóstico dos Sonhos",
    descricao:
      "Imersão para entender estilo, prioridades e o que não abre mão.",
    texto_longo:
      "Encontro presencial ou online. Levantamos a história de vocês, referências, orçamento real e receios. Saímos com as palavras-chave que vão guiar todo o casamento.",
  },
  {
    titulo: "Curadoria & Contratações",
    descricao:
      "Apresentação de opções por categoria já com valores negociados.",
    texto_longo:
      "Montamos a lista de local, foto, vídeo, buffet, decoração e música. Visitamos juntos, negociamos contratos e centralizamos os pagamentos numa planilha transparente.",
  },
  {
    titulo: "Design do Grande Dia",
    descricao: "Criação do projeto visual e experiências para convidados.",
    texto_longo:
      "Moodboard completo, planta baixa do espaço, projeto de iluminação e roteiro de experiências (welcome drink, cerimônia, festa).",
  },
  {
    titulo: "Ensaios & Testes",
    descricao: "Prévia de maquiagem, prova de menu, ensaio e briefing final.",
    texto_longo:
      "Acompanhamos prova de vestido, teste de penteado e degustação. Antes do casamento fazemos o ensaio geral com o cronograma na mão.",
  },
  {
    titulo: "Semana de Blindagem",
    descricao: "Confirmação de todos fornecedores e plano B de chuva.",
    texto_longo:
      "Checklist final, confirmação individual de cada fornecedor, kit de emergência montado e cronograma impresso e digital para todos. Ficamos de plantão.",
  },
  {
    titulo: "O SIM Perfeito",
    descricao: "Execução impecável enquanto vocês vivem o melhor dia.",
    texto_longo:
      "Equipe posicionada desde a montagem, comunicação constante entre todos e timeline minuto a minuto. Se algo sair do previsto, vocês nem ficam sabendo.",
  },
];

// Sem depoimentos inventados: enquanto a empresa não cadastrar os seus
// no Catálogo, a seção simplesmente não aparece — melhor uma proposta
// sem depoimento do que com elogio de casal que nunca existiu.
export const DEPOIMENTOS_CLASSICO: {
  autor: string;
  texto: string;
  contexto: string | null;
}[] = [];

/** citação do hero (institucional.citacao_hero vazia → isto) */
export const CITACAO_CLASSICO =
  "Transformamos sonhos em experiências inesquecíveis — com tecnologia, afeto e método.";

/** sub do investimento */
export const SUB_INVESTIMENTO_CLASSICO =
  "Ajuste convidados, pacotes e adicionais. Veja entrada, parcelas e desconto à vista recalculando ao vivo — sem surpresas.";
