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

import { hojeBR } from "@/lib/tempo";

export type AssinaturaAdmin = {
  empresaId: string;
  status: "trial" | "ativa" | "pausada" | "cancelada";
  /** Último dia do teste grátis (154). Ausente = nunca testou. */
  testeTerminaEm?: string | null;
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
  // Ordem cronológica. Empate de data (converter e subir de plano no
  // MESMO dia) resolve pela ordem de inserção: o sort do JS é estável e
  // preserva a ordem em que o chamador entregou. Por isso a leitura em
  // admin-painel.ts pede ORDER BY em, created_at — sem ORDER BY o
  // Postgres não garante ordem, e o mesmo mês fechava com um valor num
  // F5 e outro no seguinte.
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
    // TESTE VIVO, não status. Depois da 154 o teste é uma fábrica de
    // contas por desenho: contar todo mundo que um dia teve status
    // 'trial' faria este número virar o acumulado histórico de quem
    // testou e não assinou — e é um dos quatro números que o dono olha
    // todo dia. Quem decide é a data, como no resto do sistema.
    emTrial: assinaturas.filter(
      (a) => a.status === "trial" && (a.testeTerminaEm ?? "") >= hojeBR()
    ).length,
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

// ------------------------------------------------------------------
// Calendário, série e comparação — funções PURAS somadas em 09/2026
// para o painel redesenhado.
//
// Nada aqui encosta em calcularMetricas: aquela lógica passou por
// revisão adversarial e continua exatamente como estava. O que vem
// abaixo só recorta o calendário, agrupa o que ela já devolveu e compara
// dois números — sem tocar em churn, NRR ou LTV.
//
// A mesma honestidade vale: comparação sem base de comparação devolve
// null, e a tela mostra "—". Crescer de zero não é "+100%", é "não dá
// para dizer".
// ------------------------------------------------------------------

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** O mês anterior a `yyyy-mm`, virando o ano quando precisa. */
export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/** Os `n` meses que TERMINAM em `mesFinal`, do mais antigo ao mais novo. */
export function mesesAte(mesFinal: string, n: number): string[] {
  const meses: string[] = [];
  let cursor = mesFinal;
  for (let i = 0; i < n; i++) {
    meses.unshift(cursor);
    cursor = mesAnterior(cursor);
  }
  return meses;
}

/** "2026-09" → "set" (rótulo de barra do gráfico). */
export function rotuloMesCurto(mes: string): string {
  return MESES_CURTOS[Number(mes.slice(5, 7)) - 1] ?? mes;
}

/** "2026-09" → "set/26" (legenda de faixa e de comparação). */
export function rotuloMesAno(mes: string): string {
  return `${rotuloMesCurto(mes)}/${mes.slice(2, 4)}`;
}

export type ContagemDeEventos = Record<EventoAssinatura["tipo"], number>;

/**
 * Quantos eventos de cada tipo caíram no mês — o MOVIMENTO DE CONTAS do
 * relatório. Sai do mesmo log que alimenta as métricas, então o
 * relatório e o MRR nunca discordam.
 *
 * Um tipo que não apareceu no mês vale 0 de verdade (o log é completo:
 * ausência de evento É ausência de movimento). Isso não fere a regra do
 * "—", que vale para métrica sem denominador, não para contagem.
 */
export function contarEventosDoMes(
  eventos: EventoAssinatura[],
  mes: string
): ContagemDeEventos {
  const c: ContagemDeEventos = {
    inicio: 0,
    upgrade: 0,
    downgrade: 0,
    cancelamento: 0,
    reativacao: 0,
    pausa: 0,
    retomada: 0,
  };
  for (const e of eventos) {
    if (e.em.slice(0, 7) !== mes) continue;
    if (e.tipo in c) c[e.tipo] += 1;
  }
  return c;
}

/**
 * Quantas datas caem no mês. Serve para `empresas.created_at`.
 *
 * O corte é em BRASÍLIA, não no fuso do timestamp. `created_at` é
 * timestamptz e chega em UTC: uma conta criada dia 30/09 às 21h30 vem
 * como "2026-10-01T00:30:00+00:00" e um `slice(0,7)` cru a jogaria em
 * outubro — enquanto o resto do relatório (mês pedido, `em` dos eventos)
 * está em Brasília. Setembro fechava com uma conta a menos do que teve.
 */
export function contarDatasNoMes(
  datas: (string | null)[],
  mes: string
): number {
  return datas.filter((d) => {
    if (!d) return false;
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return false;
    return hojeBR(t).slice(0, 7) === mes;
  }).length;
}

export type PeriodoAgregado = {
  chave: string;   // "2026-T3" ou "2026" — estável para key de React
  rotulo: string;  // "T3/26" ou "2026"
  meses: string[];
  receita: number;
  /** false quando faltam meses no grupo (trimestre em curso, por ex.). */
  completo: boolean;
};

/**
 * Receita de um grupo de meses = SOMA do MRR de cada mês.
 *
 * MRR é estoque (a foto do fim do mês), não fluxo — somar três fotos não
 * é rigor contábil. Mas é exatamente o que o dono recebe: três faturas
 * mensais. Enquanto não houver tabela de faturas, esta é a melhor
 * aproximação honesta, e o rótulo do cartão diz de onde ela vem.
 */
function agrupar(
  serie: MetricasDoMes[],
  chaveDe: (mes: string) => { chave: string; rotulo: string; tamanho: number }
): PeriodoAgregado[] {
  const grupos = new Map<string, PeriodoAgregado & { tamanho: number }>();
  for (const m of serie) {
    const { chave, rotulo, tamanho } = chaveDe(m.mes);
    const g = grupos.get(chave) ?? {
      chave,
      rotulo,
      meses: [],
      receita: 0,
      completo: false,
      tamanho,
    };
    g.meses.push(m.mes);
    g.receita += m.mrr;
    grupos.set(chave, g);
  }
  return [...grupos.values()]
    .map(({ tamanho, ...g }) => ({ ...g, completo: g.meses.length === tamanho }))
    .sort((a, b) => a.chave.localeCompare(b.chave));
}

/** A série mensal virada em trimestres, do mais antigo ao mais novo. */
export function agruparEmTrimestres(serie: MetricasDoMes[]): PeriodoAgregado[] {
  return agrupar(serie, (mes) => {
    const ano = mes.slice(0, 4);
    const t = Math.ceil(Number(mes.slice(5, 7)) / 3);
    return {
      chave: `${ano}-T${t}`,
      rotulo: `T${t}/${mes.slice(2, 4)}`,
      tamanho: 3,
    };
  });
}

/** A série mensal virada em anos. */
export function agruparEmAnos(serie: MetricasDoMes[]): PeriodoAgregado[] {
  return agrupar(serie, (mes) => ({
    chave: mes.slice(0, 4),
    rotulo: mes.slice(0, 4),
    tamanho: 12,
  }));
}

/**
 * Variação percentual entre dois valores. Sem base (null ou zero) NÃO há
 * variação: devolve null e a tela mostra "—". Sair de R$ 0 para R$ 97
 * não é crescimento de 100% nem de infinito — é o primeiro mês.
 */
export function variacaoPct(
  antes: number | null,
  depois: number | null
): number | null {
  if (antes === null || depois === null || antes === 0) return null;
  return ((depois - antes) / Math.abs(antes)) * 100;
}

/** Variação → "+10,5%", "−3,2%" ou "—". O sinal é o menos tipográfico. */
export function variacaoEmTexto(pct: number | null): string {
  if (pct === null) return "—";
  const n = Math.abs(pct) >= 100 ? Math.round(pct) : Math.round(pct * 10) / 10;
  const sinal = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sinal}${Math.abs(n).toLocaleString("pt-BR")}%`;
}

/** Diferença entre duas contagens → "+1", "−1" ou "0". */
export function deltaEmTexto(antes: number, depois: number): string {
  const d = depois - antes;
  if (d === 0) return "0";
  return d > 0 ? `+${d}` : `−${Math.abs(d)}`;
}

/** Média simples, ou null quando não há do que tirar média. */
export function media(numeros: number[]): number | null {
  if (numeros.length === 0) return null;
  return numeros.reduce((s, n) => s + n, 0) / numeros.length;
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
