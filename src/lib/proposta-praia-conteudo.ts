// Conteúdo-padrão do template "Praia" (casamento, paleta Maré Alta).
//
// Textos literais do handoff, com as exceções de sempre — nada aqui
// afirma histórico ou escassez que a empresa não sustenta. Saíram do
// padrão: "350 EVENTOS REALIZADOS" (vem dos stats do Catálogo e some
// quando vazio), o depoimento "Camila & Rafael" (vem de
// empresa_depoimentos) e o selo "SÓ 2 CASAMENTOS POR MÊS" (escassez
// inventada). O que descreve o SERVIÇO na praia — timeline, extras
// típicos, tradições, a carta — fica.

/** O dia, momento a momento (timeline de 6 chips). */
export const TIMELINE_PRAIA = [
  {
    tag: "CHEGADA",
    titulo: "Os convidados na areia",
    fase: "MONTAGEM CONCLUÍDA",
    desc: "A estrutura já está de pé desde a manhã. Os convidados chegam, deixam os sapatos e recebem água de coco e leque.",
    nota: "Vocês não veem nada disso. Estão se arrumando.",
    itens: [
      "Recepção e acomodação dos convidados",
      "Chuveiro de pés e apoio para sapatos",
      "Conferência de vento e ajuste da estrutura",
    ],
  },
  {
    tag: "CERIMÔNIA",
    titulo: "O pôr do sol exato",
    fase: "A LUZ CERTA",
    desc: "A hora é escolhida pelo horário do sol, não pelo relógio. A entrada acontece com o sol baixo atrás do altar.",
    nota: "Sete minutos de luz que não voltam. Ninguém atrasa.",
    itens: [
      "Horário calculado pela tábua do sol",
      "Coordenação de entrada e cortejo",
      "Som testado contra o vento do mar",
    ],
  },
  {
    tag: "COQUETEL",
    titulo: "Pé na areia, taça na mão",
    fase: "TRANSIÇÃO",
    desc: "Enquanto vocês fazem as fotos do casal, os convidados ficam no coquetel e a equipe vira a cerimônia em jantar.",
    nota: "A virada leva quarenta minutos e ninguém percebe.",
    itens: [
      "Direcionamento dos convidados ao lounge",
      "Desmontagem da cerimônia em paralelo",
      "Acompanhamento do ensaio do casal",
    ],
  },
  {
    tag: "JANTAR",
    titulo: "Mesas sob as luzes",
    fase: "SERVIÇO",
    desc: "Entrada dos noivos, primeiro brinde, discursos. O cronograma do buffet fica na mão da assessoria.",
    nota: "Cada prato sai na hora combinada com a cozinha.",
    itens: [
      "Controle do tempo de cada serviço",
      "Coordenação de discursos e brindes",
      "Gestão do mapa de mesas",
    ],
  },
  {
    tag: "FESTA",
    titulo: "A pista abre",
    fase: "CLÍMAX",
    desc: "Primeira dança, valsa e a pista liberada. A partir daqui o trabalho é manter a energia sem furos entre atrações.",
    nota: "A pista não pode esvaziar. É por isso que existe roteiro.",
    itens: [
      "Entrada do bolo e primeira dança",
      "Passagem entre banda e DJ sem silêncio",
      "Reforço na iluminação da pista",
    ],
  },
  {
    tag: "SAÍDA",
    titulo: "Bem-casados e despedida",
    fase: "ENCERRAMENTO",
    desc: "Distribuição das lembranças, saída dos noivos e conferência final com cada fornecedor.",
    nota: "Vocês vão embora. A equipe fica até a areia estar limpa.",
    itens: [
      "Entrega dos bem-casados",
      "Conferência e liberação de fornecedores",
      "Recolhimento de presentes e pertences",
    ],
  },
];

/** Passo 01: quanto falta para o dia. Pré-seleciona o pacote pela ordem. */
export const PRAZOS_PRAIA = [
  { id: "longo", rotulo: "8–12 meses", dica: "Dá tempo de tudo" },
  { id: "medio", rotulo: "3–6 meses", dica: "Ritmo acelerado" },
  { id: "curto", rotulo: "Até 1 mês", dica: "Só coordenação" },
] as const;

/** Estilos da pista — entram no briefing do DJ, não mudam o valor. */
export const ESTILOS_PRAIA = [
  "MPB", "SERTANEJO", "POP", "AXÉ", "ELETRÔNICA", "FLASHBACK",
];

/** As 9 tradições da cerimônia na areia. */
export const TRADICOES_PRAIA = [
  "Entrada descalços na areia",
  "Votos escritos pelos noivos",
  "Cerimônia da areia",
  "Brinde no pôr do sol",
  "Chuva de pétalas",
  "Primeira dança sob as luzes",
  "Cerimônia do vinho",
  "Valsa com os pais",
  "Bem-casados artesanais",
];

/** A corrente do "o que está incluso". */
export const INCLUSO_PRAIA = [
  { num: "01", titulo: "REUNIÕES", desc: "Encontros de alinhamento do briefing ao ensaio." },
  { num: "02", titulo: "FORNECEDORES", desc: "Indicação, negociação e acompanhamento de contratos." },
  { num: "03", titulo: "CRONOGRAMA", desc: "Linha do tempo do dia, minuto a minuto." },
  { num: "04", titulo: "ROTEIRO", desc: "Ordem da cerimônia e das tradições escolhidas." },
  { num: "05", titulo: "COORDENAÇÃO", desc: "Comando do dia inteiro, do monte ao desmonte." },
  { num: "06", titulo: "EQUIPE", desc: "Assistentes em campo dimensionados por convidado." },
];

/** Frases do mar — trocam a cada 9s enquanto as ondas tocam. */
export const FRASES_MAR = (primeiroNome: string) => [
  `Feche os olhos, ${primeiroNome}. É esse o som que vai tocar quando você entrar.`,
  "O mar não ensaia. Mas o resto do seu dia, sim — e é disso que esta proposta cuida.",
  "Cada escolha abaixo aproxima esse som do seu grande dia.",
  "O sol se põe no mesmo horário para todo mundo. Poucos casam na frente dele.",
];

/** A carta antes de decidir (assinada pelo nome da empresa). */
export const CARTA_PRAIA = (primeiroNome: string) =>
  `${primeiroNome}, este orçamento não é uma lista de preços — é o rascunho do dia de vocês. Cada escolha que você fez aqui em cima, eu li do outro lado. Quando estiver pronta, a areia espera.`;

export const TEXTOS_PRAIA = {
  topoBadge: "CASAMENTO NA PRAIA",
  heroBadge: "ORÇAMENTO INTERATIVO",
  heroDica: "TOQUE NO NOME PARA EDITAR",
  heroParagrafo:
    "O casamento de vocês na areia começa a ganhar forma aqui. Escolha o que faz parte do dia e o investimento se ajusta na hora.",
  ctaMontar: "COMEÇAR A MONTAR ↓",
  ouvirMar: "♪ OUVIR O MAR",
  pausarMar: "❙❙ PAUSAR O MAR",
  timelineEyebrow: "O DIA, MOMENTO A MOMENTO",
  timelineTitulo: "Antes de falar de preço,\nveja como vai ser.",
  timelineDica:
    "Toque em cada momento para ver o que acontece — e quem cuida disso enquanto vocês só aproveitam. Os horários, vocês definem juntas.",
  simuladorEyebrow: "SIMULADOR DO PÔR DO SOL",
  simuladorTitulo: "Escolha a data e veja a que horas o sol se põe para vocês.",
  montadorEyebrow: "MONTE O SEU CASAMENTO",
  montadorTitulo: "Seis escolhas e o orçamento está pronto.",
  passoPrazo: "QUANTO FALTA PARA O DIA",
  passoPacote: "A ASSESSORIA",
  passoConvidados: "QUANTA GENTE NA AREIA",
  passoPista: "A SUA PISTA",
  passoExtras: "EXTRAS DA PRAIA",
  extrasDica: "Itens que só fazem sentido no litoral. Entram no total na hora.",
  inclusoEyebrow: "O QUE ESTÁ INCLUSO",
  inclusoTitulo:
    "Vocês não contratam uma lista. Contratam quem carrega o casamento nas costas quando o vento vira e a maré sobe.",
  foraDoValor:
    "Fora deste valor: espaço, buffet, bar, decoração, foto e vídeo — negociamos e acompanhamos cada um, mas a contratação é direta com o fornecedor.",
  roteiroEyebrow: "O ROTEIRO DA CERIMÔNIA",
  roteiroDica: "9 TRADIÇÕES · ESCOLHA AS SUAS",
  roteiroVazio: "Nenhuma tradição escolhida ainda. Toque nas que fazem sentido para vocês.",
  aCotarAviso: "Há itens marcados como “a cotar” — enviamos o valor junto do contrato.",
  cartaEyebrow: "UMA CARTA ANTES DE VOCÊ DECIDIR",
  barraCta: "FECHAR MEU CASAMENTO",
  assinarCta: "ASSINAR E TRAVAR A DATA",
  rodapeSelo: "CASAMENTO NA PRAIA",
};

/** Mídia padrão, igual para todas as empresas (Supabase Storage). */
export const MIDIA_PRAIA = {
  video:
    "https://gesxhgjnackiddeobcvy.supabase.co/storage/v1/object/public/proposta-midia/praia/mar.mp4",
  ondas:
    "https://gesxhgjnackiddeobcvy.supabase.co/storage/v1/object/public/proposta-midia/praia/ondas.mp3",
};

/**
 * Pôr do sol (NOAA simplificado), matemática local — sem API. lat/lng vêm
 * do geocoding do OpenStreetMap quando a noiva busca a praia; o fuso é
 * fixo em -3 (litoral brasileiro, sem DST desde 2019).
 */
export function porDoSol(dataIso: string, lat: number, lng: number, tz = -3): number | null {
  const d = new Date(`${dataIso}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  const inicio = new Date(d.getFullYear(), 0, 0);
  const dia = Math.floor((d.getTime() - inicio.getTime()) / 86_400_000);
  const rad = Math.PI / 180;
  const decl = -23.44 * Math.cos(rad * (360 / 365) * (dia + 10));
  const cosHA = -Math.tan(lat * rad) * Math.tan(decl * rad);
  if (cosHA < -1 || cosHA > 1) return null;
  const ha = Math.acos(cosHA) / rad;
  const B = rad * (360 / 365) * (dia - 81);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  let h = 12 + ha / 15 - lng / 15 - eot / 60 + tz;
  h = ((h % 24) + 24) % 24;
  return h;
}

export const horaLegivel = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}h${String(mm).padStart(2, "0")}`;
};
