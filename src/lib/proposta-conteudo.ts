// Conteúdo institucional fixo do template de casamento, transcrito do
// handoff (design_handoff_proposta_casamento/README.md, seção "Design
// Tokens — Content Reference").
//
// Fica fixo por decisão do produto: é a copy autoral deste template. O
// que a cerimonialista edita (etapas do processo, depoimentos, fotos,
// pacotes) vem do banco e tem prioridade — estes valores são o fallback
// de quem ainda não cadastrou nada.

export const INCLUSO_PADRAO = [
  {
    titulo: "Planejamento Total",
    curto: "Cronograma detalhado de 6 meses, com checkpoints semanais e gestão de fornecedores.",
    longo:
      "Criamos um plano mestre com mais de 180 itens verificados. Você terá acesso a um dashboard exclusivo com evolução em tempo real, lembretes automáticos e reuniões quinzenais de alinhamento estratégico.",
  },
  {
    titulo: "Curadoria Premium",
    curto: "Seleção a dedo dos melhores fornecedores com negociação exclusiva.",
    longo:
      "Nossa rede conta com 120+ fornecedores homologados. Negociamos em média 18% de economia para nossos casais e garantimos cláusulas de proteção que só quem faz 80 casamentos por ano consegue.",
  },
  {
    titulo: "Design & Estilo",
    curto: "Moodboard, paleta, papelaria e projeto de decoração autoral.",
    longo:
      "Da paleta terrosa que amam ao desenho técnico da mesa de doces. Entregamos projeto 3D da decoração, papelaria artesanal e curadoria de vestido com consultoras parceiras.",
  },
  {
    titulo: "No Dia — 12h",
    curto: "Coordenação completa do dia para que vocês só aproveitem.",
    longo:
      "Chegamos 4h antes, coordenamos 18 fornecedores, cuidamos do buquê, da gravata do noivo, da entrada da daminha. Vocês só precisam dizer SIM. Kit emergência, costureira e segurança emocional inclusos.",
  },
  {
    titulo: "Pós-Casamento",
    curto: "Relatório final com todos os detalhes e informações importantes.",
    longo:
      "Após o grande dia, cuidamos da devolução de trajes, entrega de fotos, coordenação de agradecimentos e curadoria do álbum. Suporte por 30 dias pós-evento.",
  },
];

export const ETAPAS_PADRAO = [
  {
    titulo: "Diagnóstico dos Sonhos",
    descricao: "Imersão de 2h para entender estilo, prioridades e non-negotiables.",
    texto_longo:
      "Encontro no nosso atelier ou online. Levantamos história de vocês, referências, orçamento real e medos. Entregamos mapa emocional do casal e definimos 3 palavras-chave que guiarão todo o casamento.",
  },
  {
    titulo: "Curadoria & Contratações",
    descricao: "Apresentação de 3 opções por categoria já com valores negociados.",
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

// Os 6 cards da arte, na ordem dela. `icone` casa com o mapa de ícones do
// PropostaV2 — cada card tem o seu, vazado em dourado, em vez do mesmo
// check repetido seis vezes.
export const NO_DIA_PADRAO = [
  {
    icone: "camera",
    titulo: "Coordenação total",
    descricao: "18 fornecedores sincronizados via rádio",
  },
  {
    icone: "flor",
    titulo: "Buquê & lapela",
    descricao: "Conservação e entrega pontual",
  },
  {
    icone: "talheres",
    titulo: "Degustação final",
    descricao: "Check de buffet e bar 2h antes",
  },
  {
    icone: "musica",
    titulo: "Timeline musical",
    descricao: "Entrada, votos e festa no tempo exato",
  },
  {
    icone: "pessoas",
    titulo: "Recepção VIP",
    descricao: "Recebemos padrinhos e família",
  },
  {
    icone: "presente",
    titulo: "Kit noiva",
    descricao: "Costura, remédio, lencinho e super-bonder",
  },
];

export const DEPOIMENTOS_PADRAO = [
  { autor: "Juliana & Marcos", texto: "Profissionalismo absurdo. A planilha financeira nos salvou!", contexto: null },
  { autor: "Lara & Felipe", texto: "No dia choveu e ela já tinha plano B montado. Gênia.", contexto: null },
  { autor: "Bia & Thiago", texto: "Parecia que tínhamos uma melhor amiga organizando tudo.", contexto: null },
];

export const PROXIMOS_PASSOS = [
  "Clique em Aceitar Proposta e assine digitalmente",
  "Pagamento da entrada para travar a data",
  "Onboarding no atelier com espumante e planejamento",
];
