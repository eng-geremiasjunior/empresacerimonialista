// Proposta interativa: tipos compartilhados e o CÁLCULO do valor.
//
// O cálculo vive aqui (módulo puro, sem I/O) porque roda em dois lugares:
// na calculadora que o cliente mexe ao vivo, e no PDF/recibo. Duplicar a
// fórmula seria garantir que uma hora as duas divergem.
//
// ATENÇÃO: este cálculo é para EXIBIÇÃO. O valor que vale é o que a RPC
// registrar_aceite_proposta recalcula no banco, lendo os preços de lá —
// nunca o que o navegador enviar.

export type PacotePublico = {
  id: string;
  nome: string;
  subtitulo: string | null;
  preco: number;
  inclui: string[];
  nao_inclui: string[];
  recomendado: boolean;
};

export type ExtraPublico = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
};

export type RegraConvidados = {
  inclusos: number;
  valorPorExtra: number;
  min: number;
  max: number;
};

export type CondicoesPagamento = {
  entradaPercentual: number;
  parcelasMaximo: number;
  descontoAVista: number;
  prazoParcelasTexto: string;
};

export type SelecaoProposta = {
  pacote: PacotePublico | null;
  convidados: number;
  extrasIds: string[];
  formaPagamento: "vista" | "parcelado";
  parcelas: number;
};

export type ResumoValores = {
  precoPacote: number;
  valorConvidadosExtra: number;
  convidadosExcedentes: number;
  valorExtras: number;
  subtotal: number;
  desconto: number;
  descontoPercentual: number;
  total: number;
  entrada: number;
  parcela: number | null;
  saldo: number;
};

export function calcularProposta(
  selecao: SelecaoProposta,
  extras: ExtraPublico[],
  regra: RegraConvidados,
  condicoes: CondicoesPagamento
): ResumoValores {
  const precoPacote = selecao.pacote?.preco ?? 0;

  const excedentes = Math.max(0, selecao.convidados - regra.inclusos);
  const valorConvidadosExtra = excedentes * regra.valorPorExtra;

  const valorExtras = extras
    .filter((x) => selecao.extrasIds.includes(x.id))
    .reduce((soma, x) => soma + Number(x.preco), 0);

  const subtotal = precoPacote + valorConvidadosExtra + valorExtras;

  const aVista = selecao.formaPagamento === "vista";
  const descontoPercentual = aVista ? condicoes.descontoAVista : 0;
  const desconto = (subtotal * descontoPercentual) / 100;

  const total = subtotal - desconto;
  const entrada = (total * condicoes.entradaPercentual) / 100;
  const saldo = total - entrada;
  const parcela = aVista || selecao.parcelas < 1 ? null : saldo / selecao.parcelas;

  return {
    precoPacote,
    valorConvidadosExtra,
    convidadosExcedentes: excedentes,
    valorExtras,
    subtotal,
    desconto,
    descontoPercentual,
    total,
    entrada,
    parcela,
    saldo,
  };
}

// Opções de parcelamento a partir do máximo configurado (3, 5, 7…).
// Sempre inclui o máximo, mesmo que não caia na sequência.
export function opcoesParcelamento(maximo: number): number[] {
  const base = [3, 5, 7, 10, 12].filter((n) => n <= maximo);
  if (maximo > 0 && !base.includes(maximo)) base.push(maximo);
  return base.length > 0 ? base.sort((a, b) => a - b) : [1];
}

// ------------------------------------------------------------------
// DEFAULTS únicos da proposta pública.
//
// Antes, cada template inventava os seus quando o banco vinha vazio
// (6x aqui, 12x ali, entrada 0% num, 30% noutro) — a MESMA empresa
// oferecia condições diferentes conforme o template. A fonte da
// verdade é o default do banco (045): entrada 30, até 7x, 5% à vista,
// 150 convidados inclusos.
// ------------------------------------------------------------------

export const REGRA_PADRAO: RegraConvidados = {
  inclusos: 150,
  valorPorExtra: 12,
  min: 50,
  max: 300,
};

export const CONDICOES_PADRAO: CondicoesPagamento = {
  entradaPercentual: 30,
  parcelasMaximo: 7,
  descontoAVista: 5,
  prazoParcelasTexto: "sem juros no cartão",
};

export function regraDoBanco(i: {
  convidados_inclusos?: number | null;
  valor_por_convidado_extra?: number | null;
  convidados_minimo?: number | null;
  convidados_maximo?: number | null;
} | null): RegraConvidados {
  return {
    inclusos: i?.convidados_inclusos ?? REGRA_PADRAO.inclusos,
    valorPorExtra: i?.valor_por_convidado_extra ?? REGRA_PADRAO.valorPorExtra,
    min: i?.convidados_minimo ?? REGRA_PADRAO.min,
    max: i?.convidados_maximo ?? REGRA_PADRAO.max,
  };
}

export function condicoesDoBanco(i: {
  condicao_entrada_percentual?: number | null;
  condicao_parcelas?: number | null;
  condicao_desconto_avista?: number | null;
  condicao_prazo_texto?: string | null;
} | null): CondicoesPagamento {
  return {
    entradaPercentual:
      i?.condicao_entrada_percentual ?? CONDICOES_PADRAO.entradaPercentual,
    parcelasMaximo: i?.condicao_parcelas ?? CONDICOES_PADRAO.parcelasMaximo,
    descontoAVista:
      i?.condicao_desconto_avista ?? CONDICOES_PADRAO.descontoAVista,
    prazoParcelasTexto:
      i?.condicao_prazo_texto ?? CONDICOES_PADRAO.prazoParcelasTexto,
  };
}

// ------------------------------------------------------------------
// Formatação BRL única. Existiam QUATRO versões entre os templates
// (com centavos, sem centavos, sem "R$", Intl.currency).
// ------------------------------------------------------------------

/** "R$ 2.500,00" — valores de resumo/total */
export const brl = (n: number): string =>
  "R$ " +
  Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** "R$ 2.500" — preço de cartão de pacote (sem centavos, como no handoff) */
export const brlInteiro = (n: number): string =>
  "R$ " + Math.round(Number(n)).toLocaleString("pt-BR");

// ------------------------------------------------------------------
// Validade: uma base só.
//
// O banco decide a expiração em America/Sao_Paulo (RPCs da 101). O
// navegador conta até o fim do dia da validade NESSE fuso — offset
// fixo -03:00, o Brasil não tem horário de verão desde 2019. Antes,
// um template contava a partir de Date.now() e os outros da meia-noite
// LOCAL do navegador: dois clientes em fusos diferentes viam prazos
// diferentes.
// ------------------------------------------------------------------

export function prazoFinalValidade(dataValidade: string): number {
  return new Date(`${dataValidade.slice(0, 10)}T23:59:59-03:00`).getTime();
}

export type TempoRestante = {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
  acabou: boolean;
};

export function tempoRestante(
  dataValidade: string,
  agora = Date.now()
): TempoRestante {
  const resta = prazoFinalValidade(dataValidade) - agora;
  if (resta <= 0) return { dias: 0, horas: 0, minutos: 0, segundos: 0, acabou: true };
  return {
    dias: Math.floor(resta / 86_400_000),
    horas: Math.floor(resta / 3_600_000) % 24,
    minutos: Math.floor(resta / 60_000) % 60,
    segundos: Math.floor(resta / 1_000) % 60,
    acabou: false,
  };
}

/**
 * O preço de um pacote na proposta pública.
 *
 * Pacote com preço zero é pacote que a cerimonialista ainda não precificou
 * — a conta nasce com três nomes de exemplo para a calculadora existir.
 * Mostrar "R$ 0" faria a noiva ler um preço que ninguém definiu; "A
 * combinar" diz a verdade e ainda empurra a conversa para onde ela
 * pertence.
 */
export const precoDePacote = (n: number): string =>
  Number(n) > 0 ? brlInteiro(Number(n)) : "A combinar";
