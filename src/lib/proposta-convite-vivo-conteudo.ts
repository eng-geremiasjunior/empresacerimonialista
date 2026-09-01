// Conteúdo-padrão do template "Convite Vivo" (debutante, modelo 03).
//
// Textos literais do handoff, com uma exceção deliberada: nada aqui
// afirma histórico da empresa. O modelo original trazia "300 FESTAS
// ENTREGUES" e "4.9 ★ NO GOOGLE" cravados no hero e nos cartões de
// prova — números de outra empresa, que apareceriam iguais na conta de
// qualquer cerimonialista. Esses vêm do Catálogo (stats do
// institucional) e a seção some quando não existem.
//
// O resto — momentos da noite, tradições do cerimonial, gêneros da
// pista, a corrente do "o que está incluso" — descreve o serviço, não o
// passado, então serve de padrão para todas.

/** Passo 01: onde a família está no planejamento. Pré-seleciona o pacote. */
export const MOMENTOS_CONVITE_VIVO = [
  {
    id: "zero",
    faixa: "8–12 meses",
    nome: "COMEÇANDO DO ZERO",
    desc: "Nada contratado ainda — a curadoria começa agora",
  },
  {
    id: "meio",
    faixa: "3–6 meses",
    nome: "PLANEJAMENTO ANDANDO",
    desc: "Alguns fornecedores fechados, falta amarrar o resto",
  },
  {
    id: "reta",
    faixa: "até 1 mês",
    nome: "RETA FINAL",
    desc: "Tudo contratado — falta alguém para reger o dia",
  },
] as const;

/** Passo 06: tradições do cerimonial que a debutante escolhe. */
export const TRADICOES_CONVITE_VIVO = [
  { id: "valsapai", nome: "VALSA COM O PAI", sub: "A primeira dança da noite" },
  { id: "valsaprincipe", nome: "VALSA COM O PRÍNCIPE", sub: "A segunda dança, com quem você escolher" },
  { id: "casais", nome: "15 CASAIS / DAMAS", sub: "O corredor de entrada, um por ano de vida" },
  { id: "joia", nome: "ENTREGA DA JOIA", sub: "O símbolo da passagem, entregue pelo pai" },
  { id: "sapato", nome: "TROCA DO SAPATO", sub: "Do sapato baixo para o salto alto" },
  { id: "velas", nome: "15 VELAS OU ROSAS", sub: "Uma homenagem para cada pessoa importante" },
  { id: "telao", nome: "RETROSPECTIVA NO TELÃO", sub: "A sua história projetada para todos" },
  { id: "vestido", nome: "TROCA DE VESTIDO", sub: "Do vestido de gala para o look da balada" },
  { id: "palavra", nome: "PALAVRA DA DEBUTANTE", sub: "O seu agradecimento no microfone" },
];

/** Passo 04: estilos da pista. Não altera preço — entra no briefing do DJ. */
export const GENEROS_CONVITE_VIVO = [
  { id: "funk", nome: "FUNK" },
  { id: "pop", nome: "POP HITS" },
  { id: "sertanejo", nome: "SERTANEJO" },
  { id: "eletronica", nome: "ELETRÔNICA" },
  { id: "pagode", nome: "PAGODE" },
  { id: "throwback", nome: "THROWBACK" },
  { id: "kpop", nome: "K-POP" },
  { id: "flashback", nome: "FLASHBACK DOS PAIS" },
];

/** A noite, hora por hora. */
export const HORAS_CONVITE_VIVO = [
  {
    hora: "20h", curto: "Recepção", tag: "PORTARIA",
    titulo: "Os convidados chegam",
    desc: "A recepção abre com tudo conferido: lista, painel, música ambiente. A cerimonialista já passou por cada fornecedor antes de você chegar ao camarim.",
    itens: [
      "Checklist de fornecedores conferido",
      "Recepção alinhada com o buffet",
      "Camarim reservado só para você",
    ],
    rodape: "CONFERÊNCIA GERAL FEITA 6H ANTES",
  },
  {
    hora: "21h", curto: "Entrada", tag: "MOMENTO ALTO",
    titulo: "A sua entrada e a valsa",
    desc: "Luz, trilha e posição da família: tudo combinado no ensaio e sinalizado ao vivo pela cerimonialista, para DJ, iluminação e fotógrafo agirem juntos.",
    itens: [
      "Trilha de entrada combinada no briefing",
      "Família posicionada e ensaiada",
      "Foto e vídeo avisados do momento exato",
    ],
    rodape: "O MOMENTO MAIS FOTOGRAFADO DA NOITE",
  },
  {
    hora: "22h", curto: "Pista abre", tag: "VIRADA",
    titulo: "A pista abre de vez",
    desc: "A cerimonialista dá o sinal e a noite muda de cerimônia para balada: DJ, luz e buffet viram a chave ao mesmo tempo, sem buraco na festa.",
    itens: [
      "Virada sinalizada para DJ e luz",
      "Primeira sequência da sua playlist",
      "Jantar coordenado em paralelo",
    ],
    rodape: "TRANSIÇÃO CRONOMETRADA PELO CERIMONIAL",
  },
  {
    hora: "23h", curto: "Parabéns", tag: "CLÍMAX",
    titulo: "O parabéns",
    desc: "Pista para e todo mundo grava. A cerimonialista rege o momento: alinha bolo, efeito e coro com cada fornecedor para os celulares pegarem a cena inteira.",
    itens: [
      "Entrada do bolo alinhada com o buffet",
      "Efeito combinado para a hora exata do coro",
      "Todos os fornecedores no mesmo cronograma",
    ],
    rodape: "DURA SETE MINUTOS. RENDE CEM STORIES",
  },
  {
    hora: "00h", curto: "Balada", tag: "PICO",
    titulo: "Vira balada",
    desc: "Volume alto e o repertório que os seus amigos pediram. A cerimonialista acompanha o salão e resolve qualquer imprevisto antes de chegar até você.",
    itens: [
      "Repertório do pico repassado ao DJ",
      "Bar e buffet avisados do horário de pico",
      "Imprevistos resolvidos sem te chamar",
    ],
    rodape: "A HORA DE MAIOR OCUPAÇÃO DA PISTA",
  },
  {
    hora: "01h", curto: "Efeitos", tag: "SURPRESA",
    titulo: "Os efeitos extras entram",
    desc: "As atrações contratadas com os fornecedores — espuma, CO2, robô ou plataforma — entram nesta faixa, agendadas pela cerimonialista no minuto certo.",
    itens: [
      "Atrações agendadas com cada fornecedor",
      "Segunda rodada de fotos combinada",
      "Cronograma ajustado ao vivo se precisar",
    ],
    rodape: "COMBINADO COM OS FORNECEDORES NO BRIEFING",
  },
  {
    hora: "02h", curto: "Final", tag: "ENCERRAMENTO",
    titulo: "Última música e encerramento",
    desc: "A música final que você escolheu fecha a noite. A cerimonialista organiza a saída dos convidados e acompanha a desmontagem de cada fornecedor.",
    itens: [
      "Música de encerramento combinada",
      "Saída dos convidados organizada",
      "Desmontagem acompanhada até o fim",
    ],
    rodape: "VOCÊ SÓ PRECISA POSTAR OS STORIES",
  },
];

/** A corrente do "o que está incluso": o trabalho da cerimonialista. */
export const INCLUSO_CONVITE_VIVO = [
  {
    n: 1, rotulo: "REUNIÕES DE PLANEJAMENTO",
    desc: "Encontros para decidir junto o que a festa vai ser, sem você pesquisando sozinha.",
  },
  {
    n: 2, rotulo: "ACOMPANHAMENTO DE FORNECEDORES",
    desc: "Indicação dos parceiros certos, conferência de contratos e cobrança de prazos.",
  },
  {
    n: 3, rotulo: "ORGANIZAÇÃO DO CRONOGRAMA",
    desc: "Cada decisão com data marcada, para nada virar correria no último mês.",
  },
  {
    n: 4, rotulo: "ROTEIRO DA FESTA",
    desc: "A noite escrita minuto a minuto e repassada a todos os fornecedores.",
  },
  {
    n: 5, rotulo: "COORDENAÇÃO NO DIA",
    desc: "Da montagem à última música, com os imprevistos resolvidos longe de você.",
  },
  {
    n: 6, rotulo: "EQUIPE DE CERIMONIAL",
    desc: "Assistentes posicionados no salão para o roteiro acontecer no horário.",
  },
];

export const TEXTOS_CONVITE_VIVO = {
  heroBadge: "ORÇAMENTO INTERATIVO",
  heroSub: "faz quinze",
  heroDica: "TOQUE NO NOME PARA EDITAR",
  heroParagrafo:
    "Sua festa começa a ganhar forma aqui. Escolha os momentos que quer viver e veja o investimento se ajustar na hora.",
  ctaMontar: "COMEÇAR A MONTAR ↓",
  timelineEyebrow: "A NOITE, HORA POR HORA",
  timelineTitulo: "Antes de falar de preço,\nveja como vai ser.",
  timelineDica: "Toque em cada horário para ver o que acontece.",
  montadorEyebrow: "MONTE A SUA FESTA",
  montadorTitulo: "Seis escolhas e o orçamento está pronto.",
  inclusoEyebrow: "O QUE ESTÁ INCLUSO",
  inclusoTitulo: "Você não contrata uma lista.",
  inclusoTituloItalico: "Contrata quem faz a festa acontecer.",
  inclusoParagrafo:
    "Estes seis itens são o trabalho da cerimonialista, e eles já estão no valor que você vê ao lado. Espaço, buffet, decoração e demais fornecedores são cotados à parte, direto com cada um, sem comissão nenhuma no meio.",
  foraDoValorRotulo: "Fora deste valor:",
  foraDoValor:
    "espaço · buffet · decoração · DJ · foto e vídeo · bolo e doces — cotados direto com cada fornecedor",
  roteiroEyebrow: "O ROTEIRO DO CERIMONIAL",
  roteiroDica: "ESCOLHA AS SUAS",
  pistaTitulo: "A SUA PISTA",
  pistaDica: "Os estilos entram no briefing do DJ — não mudam o valor.",
  fechamentoCta: "QUERO ESSA DATA",
  contratoEyebrow: "CONTRATO DIGITAL · ASSINATURA",
  barraCta: "FECHAR MINHA FESTA",
  rodapeSelo: "MODELO 03 · CONVITE VIVO",
};

/** Mídia padrão, igual para todas as empresas (Supabase Storage). */
export const MIDIA_CONVITE_VIVO = {
  video:
    "https://gesxhgjnackiddeobcvy.supabase.co/storage/v1/object/public/proposta-midia/convite-vivo/festa.mp4",
  trilha:
    "https://gesxhgjnackiddeobcvy.supabase.co/storage/v1/object/public/proposta-midia/convite-vivo/trilha.mp3",
};
