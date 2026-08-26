// Métricas do negócio — o núcleo PURO do painel do dono.
//
// TUDO que depende do mês sai do LOG DE EVENTOS (assinatura_eventos),
// nunca do estado atual da tabela. A revisão adversarial da primeira
// versão provou o porquê com cinco cenários reais: derivando do snapshot,
// reativar uma conta apagava o churn de julho retroativamente, o trial
// convertido caía no mês do trial (CAC errado nos dois meses), a conta
// que assinou e cancelou no MESMO mês produzia churn > 100%, pausada
// inflava a base do NRR, e mês passado mostrava o MRR de hoje.
//
// O modelo: cada evento muda o estado {pagante, valor} de uma conta.
//   inicio      → pagante, valor = valorDepois   (trial NÃO gera inicio;
//                                                 a conversão gera)
//   upgrade     → valor sobe    downgrade → valor desce
//   cancelamento→ deixa de ser pagante
//   reativacao  → volta a ser pagante
//   pausa       → deixa de ser pagante (sem churn — está suspensa)
//   retomada    → volta a ser pagante
// Reconstruir o estado em qualquer data = repassar os eventos até ela.
//
// Honestidade acima de tudo: métrica sem denominador devolve null e a
// tela mostra "—" com a explicação, nunca zero inventado.

export type AssinaturaAdmin = {
  empresaId: string;
  status: "trial" | "ativa" | "pausada" | "cancelada";
};

export type EventoAssinatura = {
  empresaId: string;
  tipo:
    | "inicio"
    | "upgrade"
    | "downgrade"
    | "cancelamento"
    | "reativacao"
    | "pausa"
    | "retomada";
  valorAntes: number | null;
  valorDepois: number | null;
  em: string; // yyyy-mm-dd
};

export type MetricasDoMes = {
  mes: string; // yyyy-mm
  mrr: number;             // no FIM do mês pedido (mês corrente = hoje)
  arr: number;
  assinantesAtivos: number;
  emTrial: number;         // sempre o snapshot de HOJE (trial não gera evento)
  churnContasPct: number | null;
  churnReceitaPct: number | null;
  nrrPct: number | null;
  cac: number | null;
  ltv: number | null;
  ltvSobreCac: number | null;
  novasNoMes: number;
  canceladasNoMes: number; // TODOS os cancelamentos do mês (base ou não)
  gastoMarketing: number | null;
};

type Estado = { pagante: boolean; valor: number };

/** Estado de cada conta repassando os eventos com em < corte (yyyy-mm-dd). */
function repassar(
  eventos: EventoAssinatura[],
  corteExclusivo: string
): Map<string, Estado> {
  const estados = new Map<string, Estado>();
  // ordem cronológica; empate de data resolve pela ordem de inserção,
  // que o chamador preserva (o log é append-only)
  const ordenados = [...eventos].sort((a, b) => a.em.localeCompare(b.em));
  for (const e of ordenados) {
    if (e.em >= corteExclusivo) continue;
    const atual = estados.get(e.empresaId) ?? { pagante: false, valor: 0 };
    switch (e.tipo) {
      case "inicio":
      case "reativacao":
      case "retomada":
        estados.set(e.empresaId, {
          pagante: true,
          valor: e.valorDepois ?? atual.valor,
        });
        break;
      case "upgrade":
      case "downgrade":
        estados.set(e.empresaId, {
          pagante: atual.pagante,
          valor: e.valorDepois ?? atual.valor,
        });
        break;
      case "cancelamento":
      case "pausa":
        estados.set(e.empresaId, { pagante: false, valor: atual.valor });
        break;
    }
  }
  return estados;
}

function somaPagantes(estados: Map<string, Estado>): number {
  let s = 0;
  for (const e of estados.values()) if (e.pagante) s += e.valor;
  return s;
}

export function calcularMetricas(
  assinaturas: AssinaturaAdmin[],
  eventos: EventoAssinatura[],
  gastoMarketing: number | null,
  mes: string // yyyy-mm
): MetricasDoMes {
  const inicioDoMes = `${mes}-01`;
  const inicioDoMesSeguinte = (() => {
    const [a, m] = mes.split("-").map(Number);
    const prox = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
    return `${prox}-01`;
  })();

  const abertura = repassar(eventos, inicioDoMes);
  const fechamento = repassar(eventos, inicioDoMesSeguinte);

  // ------- receita no fim do mês pedido -------
  const mrr = somaPagantes(fechamento);
  const assinantesAtivos = [...fechamento.values()].filter((e) => e.pagante).length;

  // ------- base de abertura: quem era pagante no dia 1 -------
  const base = new Map(
    [...abertura].filter(([, e]) => e.pagante)
  );
  const mrrInicio = somaPagantes(abertura);

  const doMes = eventos.filter((e) => e.em >= inicioDoMes && e.em < inicioDoMesSeguinte);

  // ------- churn: só cancelamento de quem estava na base -------
  // (assinou e cancelou dentro do mesmo mês = não é evasão da base; a
  // primeira versão somava e o churn passava de 100%)
  const cancelamentosDoMes = doMes.filter((e) => e.tipo === "cancelamento");
  const cancelamentosDaBase = cancelamentosDoMes.filter((e) => base.has(e.empresaId));
  const churnContasPct =
    base.size > 0 ? (cancelamentosDaBase.length / base.size) * 100 : null;

  // o valor perdido é o DA ÉPOCA (valorAntes do evento), não o atual
  const mrrPerdido = cancelamentosDaBase.reduce(
    (s, e) => s + (e.valorAntes ?? base.get(e.empresaId)?.valor ?? 0),
    0
  );
  const churnReceitaPct =
    mrrInicio > 0 ? (mrrPerdido / mrrInicio) * 100 : null;

  // ------- NRR: upgrades/downgrades/pausas de quem era da base -------
  const delta = (e: EventoAssinatura) =>
    (e.valorDepois ?? 0) - (e.valorAntes ?? 0);
  const upgrades = doMes
    .filter((e) => e.tipo === "upgrade" && base.has(e.empresaId))
    .reduce((s, e) => s + Math.max(0, delta(e)), 0);
  const downgrades = doMes
    .filter((e) => e.tipo === "downgrade" && base.has(e.empresaId))
    .reduce((s, e) => s + Math.max(0, -delta(e)), 0);
  const pausasDaBase = doMes
    .filter((e) => e.tipo === "pausa" && base.has(e.empresaId))
    .reduce((s, e) => s + (e.valorAntes ?? base.get(e.empresaId)?.valor ?? 0), 0);
  const nrrPct =
    mrrInicio > 0
      ? ((mrrInicio + upgrades - downgrades - mrrPerdido - pausasDaBase) /
          mrrInicio) *
        100
      : null;

  // ------- novas: eventos de início dentro do mês -------
  const novasNoMes = doMes.filter((e) => e.tipo === "inicio").length;

  // ------- CAC -------
  const cac =
    gastoMarketing !== null && novasNoMes > 0
      ? gastoMarketing / novasNoMes
      : null;

  // ------- LTV: ARPU / churn de receita -------
  // Sem cancelamento na base do mês, o LTV é "infinito" — não se mostra.
  const arpu = assinantesAtivos > 0 ? mrr / assinantesAtivos : null;
  const churnFrac =
    churnReceitaPct !== null && churnReceitaPct > 0
      ? churnReceitaPct / 100
      : null;
  const ltv = arpu !== null && churnFrac !== null ? arpu / churnFrac : null;
  const ltvSobreCac = ltv !== null && cac !== null && cac > 0 ? ltv / cac : null;

  return {
    mes,
    mrr,
    arr: mrr * 12,
    assinantesAtivos,
    emTrial: assinaturas.filter((a) => a.status === "trial").length,
    churnContasPct,
    churnReceitaPct,
    nrrPct,
    cac,
    ltv,
    ltvSobreCac,
    novasNoMes,
    canceladasNoMes: cancelamentosDoMes.length,
    gastoMarketing,
  };
}

/** "R$ 1.234" ou "—" — o painel nunca inventa zero. */
export function metrica(v: number | null, prefixo = "", sufixo = ""): string {
  if (v === null) return "—";
  const n = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${prefixo}${n.toLocaleString("pt-BR")}${sufixo}`;
}

/**
 * Número → máscara pt-BR. A máscara de digitação só entende vírgula como
 * decimal; String(150.5) tem PONTO e virava "1.505" (10× — a revisão
 * pegou). Esta é a única porta certa para pré-preencher campo de dinheiro.
 */
export function dinheiroParaMascara(v: number): string {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
