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
