// Verba por fornecedor (063) — cálculos puros da aba Fornecedores.
//
// Separado da tela porque são as contas que a cerimonialista confere: se
// os cards mentirem, ela paga errado. Testado à parte.

export type ItemDetalhe = {
  id: string;
  descricao: string;
  valor_estimado_inicial: number | null;
  valor_negociado: number | null;
};

export type VerbaFornecedor = {
  id: string;
  supplier_id: string;
  fornecedor: string;
  valor_estimado_inicial: number | null;
  // null = ainda não contratado (5A): a linha pode nascer do Planejamento só
  // com o previsto; o comprometimento chega com o contrato.
  valor_alocado: number | null;
  observacao: string | null;
  itens: ItemDetalhe[];
};

export type ParcelaFornecedor = {
  id: string;
  supplier_id: string | null;
  description: string | null;
  value: number;
  due_date: string;
  paid: boolean;
  paid_at: string | null;
};

export type LinhaFornecedor = VerbaFornecedor & {
  pago: number;
  aPagar: number;
  /** Total do fornecedor (itens ou valor alocado). */
  total: number;
  /** Pago acima do alocado — não é bloqueio, é alerta. */
  estourou: boolean;
  /** Quanto passou do alocado (0 quando não estourou). */
  excesso: number;
  parcelas: ParcelaFornecedor[];
  /** true quando há detalhamento — a tela só mostra o indicador nesse caso. */
  temDetalhe: boolean;
};

const soma = (ns: number[]) => ns.reduce((s, n) => s + n, 0);

// Total do fornecedor: quando há itens, vale a soma deles; senão, o valor
// alocado digitado. Sem isso o cabeçalho poderia divergir do detalhe.
// valor_alocado null (previsto sem contrato) conta como 0 no total pago/a
// pagar — mas NUNCA entra na economia (ver resumoVerba).
export function totalDoFornecedor(v: VerbaFornecedor): number {
  if (v.itens.length > 0) {
    return soma(v.itens.map((i) => Number(i.valor_negociado ?? 0)));
  }
  return Number(v.valor_alocado ?? 0);
}

// Existe comprometimento real (contrato/negociação)? Alocação sozinha não é.
export function temComprometimento(v: VerbaFornecedor): boolean {
  return v.itens.length > 0 || v.valor_alocado !== null;
}

export function montarLinhas(
  verbas: VerbaFornecedor[],
  parcelas: ParcelaFornecedor[]
): LinhaFornecedor[] {
  return verbas
    .map((v) => {
      const minhas = parcelas.filter((p) => p.supplier_id === v.supplier_id);
      const pago = soma(minhas.filter((p) => p.paid).map((p) => Number(p.value)));
      const total = totalDoFornecedor(v);
      // valor_alocado não é teto rígido: o pagamento pode passar dele. Aqui
      // só marcamos para a tela sinalizar — nada é bloqueado.
      const excesso = Math.max(0, pago - total);
      return {
        ...v,
        parcelas: [...minhas].sort((a, b) => a.due_date.localeCompare(b.due_date)),
        pago,
        total,
        estourou: excesso > 0,
        excesso,
        // Nunca negativo: pagar mais que o alocado não vira "a pagar" com
        // sinal invertido, vira zero (o excesso denuncia o estouro).
        aPagar: Math.max(0, total - pago),
        temDetalhe: v.itens.length > 0,
      };
    })
    .sort((a, b) => a.fornecedor.localeCompare(b.fornecedor, "pt-BR"));
}

export type ResumoVerba = {
  alocado: number;
  pago: number;
  aPagar: number;
  economia: number;
  /** Quantos fornecedores têm estimativa inicial — a economia só fala deles. */
  comEstimativa: number;
};

export function resumoVerba(linhas: LinhaFornecedor[]): ResumoVerba {
  const alocado = soma(linhas.map(totalDoFornecedor));
  const pago = soma(linhas.map((l) => l.pago));

  // Economia só existe quando há os DOIS lados: estimativa inicial (o
  // "antes") E comprometimento real (o "depois"). Linha só com o previsto
  // do Planejamento (valor_alocado null) NÃO entra — comparar estimado com
  // zero inventaria economia (Alocação ≠ Comprometimento).
  const comEstimativa = linhas.filter(
    (l) =>
      l.valor_estimado_inicial !== null &&
      l.valor_estimado_inicial !== undefined &&
      temComprometimento(l)
  );
  const economia = soma(
    comEstimativa.map((l) => Number(l.valor_estimado_inicial) - totalDoFornecedor(l))
  );

  return {
    alocado,
    pago,
    aPagar: Math.max(0, alocado - pago),
    economia,
    comEstimativa: comEstimativa.length,
  };
}

// Agrupamento por mês — espelha a função SQL pagamentos_fornecedor_por_mes,
// usada aqui para conferir os totais sem ida ao banco.
export function pagoPorMes(
  parcelas: ParcelaFornecedor[]
): { mes: string; total: number }[] {
  const mapa = new Map<string, number>();
  for (const p of parcelas) {
    if (!p.paid) continue;
    const base = (p.paid_at ?? p.due_date).slice(0, 7);
    mapa.set(base, (mapa.get(base) ?? 0) + Number(p.value));
  }
  return [...mapa.entries()]
    .map(([mes, total]) => ({ mes, total }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}
