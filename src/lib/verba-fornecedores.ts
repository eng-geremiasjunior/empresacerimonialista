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
  valor_alocado: number;
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
  parcelas: ParcelaFornecedor[];
  /** true quando há detalhamento — a tela só mostra o indicador nesse caso. */
  temDetalhe: boolean;
};

const soma = (ns: number[]) => ns.reduce((s, n) => s + n, 0);

// Total do fornecedor: quando há itens, vale a soma deles; senão, o valor
// alocado digitado. Sem isso o cabeçalho poderia divergir do detalhe.
export function totalDoFornecedor(v: VerbaFornecedor): number {
  if (v.itens.length > 0) {
    return soma(v.itens.map((i) => Number(i.valor_negociado ?? 0)));
  }
  return Number(v.valor_alocado);
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
      return {
        ...v,
        parcelas: [...minhas].sort((a, b) => a.due_date.localeCompare(b.due_date)),
        pago,
        // Nunca negativo: pagar mais que o alocado não vira "a pagar" com
        // sinal invertido, vira zero (e o total pago denuncia o excesso).
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

  // Economia só conta quem tem estimativa inicial preenchida: sem ela não
  // existe "antes" para comparar, e somar zero inventaria economia.
  const comEstimativa = linhas.filter(
    (l) => l.valor_estimado_inicial !== null && l.valor_estimado_inicial !== undefined
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
