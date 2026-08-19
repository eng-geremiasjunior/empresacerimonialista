// Copy-padrão do template Clássico — Creme e Dourado (handoff hi-fi).
//
// ÚNICO lugar onde estes textos existem no código. O template público e
// o editor do Catálogo leem DAQUI: banco vazio → o casal vê isto; a
// proprietária abre o Catálogo, encontra isto pré-preenchido e muda o
// que quiser — a partir daí vale o banco. Decisão de projeto (101):
// nada de seed em SQL, para copy nunca divergir entre migração e código.
//
// Textos literais da SPEC do handoff, mantidos por decisão do dono
// ("deixe como padrão; se a cerimonialista quiser mudar, ela muda").

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
      "Criamos um plano mestre com mais de 180 itens verificados. Você terá acesso a um dashboard exclusivo com evolução em tempo real, lembretes automáticos e reuniões quinzenais de alinhamento estratégico.",
  },
  {
    secao: "incluso",
    icone: "trofeu",
    titulo: "Curadoria Premium",
    texto_curto:
      "Seleção a dedo dos melhores fornecedores com negociação exclusiva.",
    texto_longo:
      "Nossa rede conta com 120+ fornecedores homologados. Negociamos em média 18% de economia para nossos casais e garantimos cláusulas de proteção que só quem faz 80 casamentos por ano consegue.",
  },
  {
    secao: "incluso",
    icone: "brilho",
    titulo: "Design & Estilo",
    texto_curto:
      "Moodboard, paleta, papelaria e projeto de decoração autoral.",
    texto_longo:
      "Da paleta terrosa que amam ao desenho técnico da mesa de doces. Entregamos projeto 3D da decoração, papelaria artesanal e curadoria de vestido com consultoras parceiras.",
  },
  {
    secao: "incluso",
    icone: "coracao",
    titulo: "No Dia - 12h",
    texto_curto:
      "Equipe completa cuidando de cada detalhe para vocês viverem.",
    texto_longo:
      "Chegamos 4h antes, coordenamos 18 fornecedores, cuidamos do buquê, da gravata do noivo, da entrada da daminha. Vocês só precisam dizer SIM. Kit emergência, costureira e segurança emocional inclusos.",
  },
  {
    secao: "incluso",
    icone: "presente",
    titulo: "Pós-Casamento",
    texto_curto:
      "Devolução de itens, agradecimentos e entrega de fornecedores.",
    texto_longo:
      "Após o grande dia, cuidamos da devolução de trajes, entrega de fotos, coordenação de agradecimentos e curadoria do álbum. Suporte por 30 dias pós-evento.",
  },
];

export const BLOCOS_NO_DIA_CLASSICO: BlocoProposta[] = [
  {
    secao: "no_dia",
    icone: "camera",
    titulo: "Coordenação total",
    texto_curto: "18 fornecedores sincronizados via rádio",
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
    texto_curto: "Check de buffet e bar 2h antes",
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
    titulo: "Onboarding no atelier com espumante e planejamento",
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

// Etapas do processo (empresa_processo_etapas vazia → isto)
export const ETAPAS_CLASSICO = [
  {
    titulo: "Diagnóstico dos Sonhos",
    descricao:
      "Imersão de 2h para entender estilo, prioridades e non-negotiables.",
    texto_longo:
      "Encontro no nosso atelier ou online. Levantamos história de vocês, referências, orçamento real e medos. Entregamos mapa emocional do casal e definimos 3 palavras-chave que guiarão todo o casamento.",
  },
  {
    titulo: "Curadoria & Contratações",
    descricao:
      "Apresentação de 3 opções por categoria já com valores negociados.",
    texto_longo:
      "Em até 15 dias entregamos shortlist de local, foto, vídeo, buffet, decoração e música. Visitamos juntos, negociamos contratos e centralizamos pagamentos em planilha transparente.",
  },
  {
    titulo: "Design do Grande Dia",
    descricao: "Criação do projeto visual e experiências para convidados.",
    texto_longo:
      "Moodboard completo, planta baixa humanizada, projeto de iluminação cênica e roteiro de experiências (welcome drink, cerimônia, festa).",
  },
  {
    titulo: "Ensaios & Testes",
    descricao: "Prévia de maquiagem, prova de menu, ensaio e briefing final.",
    texto_longo:
      "Acompanhamos prova de vestido, teste de penteado, degustação com 5 pratos e ensaio fotográfico. 30 dias antes fazemos o ensaio geral com cronômetro.",
  },
  {
    titulo: "Semana de Blindagem",
    descricao: "Confirmação de todos fornecedores e plano B de chuva.",
    texto_longo:
      "Checklist de 87 itens, confirmação individual de cada convidado VIP, kit de emergência montado, cronograma impresso e digital para todos. Entramos em modo plantão 24h.",
  },
  {
    titulo: "O SIM Perfeito",
    descricao: "Execução impecável enquanto vocês vivem o melhor dia.",
    texto_longo:
      "Equipe posicionada às 6h, rádio-comunicadores, timeline minuto a minuto. Garantimos que a noiva entre 5 min atrasada por charme, não por caos.",
  },
];

// Depoimentos-padrão (empresa_depoimentos vazia → isto)
export const DEPOIMENTOS_CLASSICO = [
  {
    autor: "Juliana & Marcos",
    texto: "Profissionalismo absurdo. A planilha financeira nos salvou!",
    contexto: null as string | null,
  },
  {
    autor: "Lara & Felipe",
    texto: "No dia choveu e ela já tinha plano B montado. Gênia.",
    contexto: null,
  },
  {
    autor: "Bia & Thiago",
    texto: "Parecia que tínhamos uma melhor amiga organizando tudo.",
    contexto: null,
  },
];

/** citação do hero (institucional.citacao_hero vazia → isto) */
export const CITACAO_CLASSICO =
  "Transformamos sonhos em experiências inesquecíveis — com tecnologia, afeto e método.";

/** sub do investimento */
export const SUB_INVESTIMENTO_CLASSICO =
  "Ajuste convidados, pacotes e adicionais. Veja entrada, parcelas e desconto à vista recalculando ao vivo — sem surpresas.";
