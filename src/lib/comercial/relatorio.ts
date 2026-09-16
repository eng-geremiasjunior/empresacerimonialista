// O relatório da Gestão comercial — as contas, sem banco e sem React.
//
// Tudo sai do que o sistema já grava: nenhuma etapa é digitada e nenhum
// cartão é arrastado. A proposta está "em conversa" porque o link foi
// aberto ou a cliente comentou; está "aceita" porque há assinatura; está
// "perdida" porque a cliente recusou ou a validade passou. Abertura de
// link não é leitura, e a tela não diz que é.
//
// Os dias são de Brasília (`yyyy-MM-dd`) e os períodos incluem as duas
// pontas. `agora` entra por parâmetro: este módulo não lê relógio.
//
// Onde o dado é antigo, a régua cai no que existe (e cada troca está
// escrita aqui): envio sem `enviado_em` (antes da 165) usa `data_criacao`;
// aceite sem linha em `orcamento_aceites` usa `respondido_em` e o valor da
// proposta; recusa sem `recusado_em` (antes da 162) usa `respondido_em`.

import { hojeBR, somarDias } from "@/lib/tempo";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { visitasEmPalavras, type OrcamentoStatus } from "@/lib/orcamentos";
import {
  ORIGEM_LABEL,
  haQuanto,
  origemEmPalavras,
  type CanalDoPedido,
  type OrigemDoAcesso,
  type PedidoStatus,
} from "@/lib/comercial/pedidos";

/* ------------------------------------------------------------------ */
/* O que chega do banco (só as colunas que a tela usa)                 */
/* ------------------------------------------------------------------ */

export type PropostaDoRelatorio = {
  id: string;
  contato_nome: string;
  tipo_evento: string;
  data_evento: string | null;
  valor_total: number;
  status: OrcamentoStatus;
  data_criacao: string;
  data_validade: string;
  enviado_em: string | null;
  respondido_em: string | null;
  recusado_em: string | null;
  motivo_recusa: string | null;
  visitas: number | null;
  ultima_visita_em: string | null;
  evento_gerado_id: string | null;
  pedido_id: string | null;
};

/** Do aceite, só o que a conta pede: nada de assinatura, IP ou nome. */
export type AceiteDoRelatorio = {
  orcamento_id: string;
  valor_total: number;
  created_at: string;
};

export type ComentarioDoRelatorio = {
  orcamento_id: string;
  created_at: string;
};

export type PedidoDoRelatorio = {
  id: string;
  nome: string;
  tipo_evento: string;
  data_evento: string | null;
  status: PedidoStatus;
  canal: CanalDoPedido;
  origem_acesso: OrigemDoAcesso;
  utm_campaign: string | null;
  orcamento_id: string | null;
  created_at: string;
  respondido_em: string | null;
  encerrado_em: string | null;
  motivo_encerramento: string | null;
};

export type MetricaDoRelatorio = {
  dia: string;
  origem_acesso: OrigemDoAcesso;
  campanha: string;
  page_view: number;
  whatsapp_click: number;
  instagram_click: number;
  pedido_enviado: number;
};

export type DadosDoRelatorio = {
  propostas: PropostaDoRelatorio[];
  aceites: AceiteDoRelatorio[];
  comentarios: ComentarioDoRelatorio[];
  pedidos: PedidoDoRelatorio[];
  metricas: MetricaDoRelatorio[];
};

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const doisDigitos = (n: number) => String(n).padStart(2, "0");
const isoDe = (a: number, m: number, d: number) => `${a}-${doisDigitos(m)}-${doisDigitos(d)}`;
const partes = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const diasNoMes = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();

/**
 * O dia de Brasília de um valor do banco. Coluna `date` já é o dia; um
 * instante (`timestamptz`) é convertido pelo fuso — fatiar a string
 * diria "amanhã" para o que aconteceu às 22h daqui.
 */
export function diaDe(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const t = new Date(valor);
  return Number.isNaN(t.getTime()) ? null : hojeBR(t);
}

/** Dias corridos de `de` até `ate` (negativo quando `ate` vem antes). */
export function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = partes(de);
  const [a2, m2, d2] = partes(ate);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

const dentro = (dia: string | null, inicio: string, fim: string) =>
  dia !== null && dia >= inicio && dia <= fim;

const diaDoMes = (d: number) => (d === 1 ? "1º" : String(d));

/**
 * "1 a 16 de setembro de 2026", "18 de agosto a 16 de setembro de 2026",
 * "20 de dezembro de 2025 a 17 de janeiro de 2026". Sem o ano quando
 * `semAno` (o trecho é do ano corrente e o contexto já diz qual é).
 */
export function trechoPorExtenso(inicio: string, fim: string, semAno = false): string {
  const [a1, m1, d1] = partes(inicio);
  const [a2, m2, d2] = partes(fim);
  const ano = (a: number) => (semAno ? "" : ` de ${a}`);
  if (a1 === a2 && m1 === m2) {
    return d1 === d2
      ? `${diaDoMes(d2)} de ${MESES[m2 - 1]}${ano(a2)}`
      : `${diaDoMes(d1)} a ${d2} de ${MESES[m2 - 1]}${ano(a2)}`;
  }
  if (a1 === a2) {
    return `${diaDoMes(d1)} de ${MESES[m1 - 1]} a ${d2} de ${MESES[m2 - 1]}${ano(a2)}`;
  }
  return `${diaDoMes(d1)} de ${MESES[m1 - 1]} de ${a1} a ${d2} de ${MESES[m2 - 1]} de ${a2}`;
}

/** "12/09" no ano corrente; "12/09/2025" fora dele. */
function dataCurta(iso: string, hoje: string): string {
  const [a, m, d] = partes(iso);
  const base = `${doisDigitos(d)}/${doisDigitos(m)}`;
  return a === partes(hoje)[0] ? base : `${base}/${a}`;
}

/** "hoje", "ontem", "há 5 dias" — para o que tem só o dia. */
function haDias(dia: string, hoje: string): string {
  const n = diasEntre(dia, hoje);
  if (n <= 0) return "hoje";
  if (n === 1) return "ontem";
  return `há ${n} dias`;
}

/* ------------------------------------------------------------------ */
/* Períodos                                                            */
/* ------------------------------------------------------------------ */

export type ChavePeriodo = "mes" | "30d" | "90d" | "ano";

export const PERIODOS: { chave: ChavePeriodo; rotulo: string }[] = [
  { chave: "mes", rotulo: "Este mês" },
  { chave: "30d", rotulo: "Últimos 30 dias" },
  { chave: "90d", rotulo: "Últimos 90 dias" },
  { chave: "ano", rotulo: "Este ano" },
];

export function lerChavePeriodo(valor: string | null | undefined): ChavePeriodo {
  return PERIODOS.some((p) => p.chave === valor) ? (valor as ChavePeriodo) : "mes";
}

export type Periodo = {
  chave: ChavePeriodo;
  inicio: string;
  fim: string;
  /** o trecho equivalente logo antes, para comparar */
  anteriorInicio: string;
  anteriorFim: string;
  /** "1 a 16 de setembro de 2026" */
  descricao: string;
  /** "1 a 16 de agosto", "30 dias anteriores", "mesmo período de 2025" */
  descricaoAnterior: string;
};

/**
 * O período até hoje, e o trecho de comparação.
 *
 * "Este mês" compara com o mesmo pedaço do mês anterior (do dia 1 ao
 * mesmo dia), não com o mês inteiro: no dia 5, comparar com um mês de 31
 * dias diria sempre que o mês vai mal.
 */
export function periodoDe(chave: ChavePeriodo, hoje: string): Periodo {
  const [a, m, d] = partes(hoje);

  if (chave === "30d" || chave === "90d") {
    const n = chave === "30d" ? 30 : 90;
    const inicio = somarDias(hoje, -(n - 1));
    return {
      chave,
      inicio,
      fim: hoje,
      anteriorInicio: somarDias(inicio, -n),
      anteriorFim: somarDias(inicio, -1),
      descricao: trechoPorExtenso(inicio, hoje),
      descricaoAnterior: `${n} dias anteriores`,
    };
  }

  if (chave === "ano") {
    const fimAnterior = isoDe(a - 1, m, Math.min(d, diasNoMes(a - 1, m)));
    return {
      chave,
      inicio: isoDe(a, 1, 1),
      fim: hoje,
      anteriorInicio: isoDe(a - 1, 1, 1),
      anteriorFim: fimAnterior,
      descricao: trechoPorExtenso(isoDe(a, 1, 1), hoje),
      descricaoAnterior: `mesmo período de ${a - 1}`,
    };
  }

  const am = m === 1 ? 12 : m - 1;
  const aa = m === 1 ? a - 1 : a;
  const anteriorInicio = isoDe(aa, am, 1);
  const anteriorFim = isoDe(aa, am, Math.min(d, diasNoMes(aa, am)));
  return {
    chave: "mes",
    inicio: isoDe(a, m, 1),
    fim: hoje,
    anteriorInicio,
    anteriorFim,
    descricao: trechoPorExtenso(isoDe(a, m, 1), hoje),
    descricaoAnterior: trechoPorExtenso(anteriorInicio, anteriorFim, aa === a),
  };
}

/** Quantos meses a tabela "por mês" mostra, contando o atual. */
export const MESES_NA_TABELA = 6;

/**
 * Desde quando o relatório precisa ler: o que vier antes entre a
 * comparação do período e o primeiro mês da tabela.
 */
export function janelaDoRelatorio(periodo: Periodo, hoje: string): string {
  const [a, m] = partes(hoje);
  const total = a * 12 + (m - 1) - (MESES_NA_TABELA - 1);
  const primeiroMes = isoDe(Math.floor(total / 12), (total % 12) + 1, 1);
  return periodo.anteriorInicio < primeiroMes ? periodo.anteriorInicio : primeiroMes;
}

/* ------------------------------------------------------------------ */
/* A etapa de cada proposta                                            */
/* ------------------------------------------------------------------ */

type Fatos = {
  p: PropostaDoRelatorio;
  /** o dia em que saiu para a cliente; nulo em rascunho */
  enviadaEm: string | null;
  aceite: { dia: string | null; instante: string | null; valor: number } | null;
  perda: {
    tipo: "recusada" | "vencida";
    dia: string | null;
    motivo: string | null;
  } | null;
  /** enviada e dentro da validade: a resposta está com a cliente */
  aberta: boolean;
  emConversa: boolean;
  ultimoComentario: string | null;
};

function fatosDasPropostas(dados: DadosDoRelatorio, hoje: string): Fatos[] {
  // o aceite e o comentário mais recentes de cada proposta
  const aceites = new Map<string, AceiteDoRelatorio>();
  for (const a of dados.aceites) {
    const atual = aceites.get(a.orcamento_id);
    if (!atual || a.created_at > atual.created_at) aceites.set(a.orcamento_id, a);
  }
  const comentarios = new Map<string, string>();
  for (const c of dados.comentarios) {
    const atual = comentarios.get(c.orcamento_id);
    if (!atual || c.created_at > atual) comentarios.set(c.orcamento_id, c.created_at);
  }

  return dados.propostas.map((p) => {
    const enviadaEm =
      p.status === "rascunho" ? null : diaDe(p.enviado_em) ?? diaDe(p.data_criacao);

    let aceite: Fatos["aceite"] = null;
    if (p.status === "aprovado") {
      const a = aceites.get(p.id);
      const instante = a?.created_at ?? p.respondido_em ?? null;
      aceite = {
        dia: diaDe(instante),
        instante,
        valor: Number(a ? a.valor_total : p.valor_total) || 0,
      };
    }

    // a mesma régua de Propostas: enviada com a validade passada já é
    // vencida, mesmo antes da rotina da noite trocar o status
    const vencida =
      p.status === "expirado" || (p.status === "enviado" && p.data_validade < hoje);

    let perda: Fatos["perda"] = null;
    if (p.status === "recusado") {
      perda = {
        tipo: "recusada",
        dia: diaDe(p.recusado_em ?? p.respondido_em),
        motivo: p.motivo_recusa?.trim() || null,
      };
    } else if (vencida) {
      perda = { tipo: "vencida", dia: p.data_validade, motivo: null };
    }

    const aberta = p.status === "enviado" && !vencida;
    const ultimoComentario = comentarios.get(p.id) ?? null;
    return {
      p,
      enviadaEm,
      aceite,
      perda,
      aberta,
      emConversa: aberta && ((p.visitas ?? 0) > 0 || ultimoComentario !== null),
      ultimoComentario,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Os quatro números                                                   */
/* ------------------------------------------------------------------ */

/** Abaixo disto, percentual e mediana enganam mais do que informam. */
export const MINIMO_DE_CASOS = 3;

export type Numeros = {
  enviadas: number;
  enviadasAntes: number;
  /** das enviadas no período, quantas já foram aceitas */
  aceitasDaTurma: number;
  /** das enviadas no período, quantas ainda estão com a cliente */
  abertasDaTurma: number;
  /** percentual da turma; nulo com menos de MINIMO_DE_CASOS envios */
  taxa: number | null;
  valorFechado: number;
  aceites: number;
  valorFechadoAntes: number;
  media: number | null;
  propostasAbertas: number;
  pedidosAbertos: number;
};

function calcularNumeros(fatos: Fatos[], pedidos: PedidoDoRelatorio[], per: Periodo): Numeros {
  const turma = fatos.filter((f) => dentro(f.enviadaEm, per.inicio, per.fim));
  const aceitasDaTurma = turma.filter((f) => f.aceite !== null).length;
  const noPeriodo = fatos.filter((f) => f.aceite && dentro(f.aceite.dia, per.inicio, per.fim));
  const antes = fatos.filter((f) => f.aceite && dentro(f.aceite.dia, per.anteriorInicio, per.anteriorFim));
  const soma = (lista: Fatos[]) => lista.reduce((s, f) => s + (f.aceite?.valor ?? 0), 0);
  const valorFechado = soma(noPeriodo);

  return {
    enviadas: turma.length,
    enviadasAntes: fatos.filter((f) => dentro(f.enviadaEm, per.anteriorInicio, per.anteriorFim)).length,
    aceitasDaTurma,
    abertasDaTurma: turma.filter((f) => f.aberta).length,
    taxa:
      turma.length >= MINIMO_DE_CASOS ? Math.round((aceitasDaTurma / turma.length) * 100) : null,
    valorFechado,
    aceites: noPeriodo.length,
    valorFechadoAntes: soma(antes),
    media: noPeriodo.length > 0 ? valorFechado / noPeriodo.length : null,
    propostasAbertas: fatos.filter((f) => f.aberta).length,
    pedidosAbertos: pedidos.filter((p) => p.status === "novo").length,
  };
}

/* ------------------------------------------------------------------ */
/* O quadro por etapa                                                  */
/* ------------------------------------------------------------------ */

export const CARTOES_POR_COLUNA = 5;

export type Cartao = {
  id: string;
  href: string;
  nome: string;
  /** "Casamento · 12/10/2027" */
  evento: string;
  valor: number | null;
  /** a linha de tempo: "vista 3× · última ontem · vence em 4 dias" */
  linha: string;
};

export type ChaveDaColuna = "pedidos" | "enviadas" | "conversa" | "aceitas" | "perdidas";

export type Coluna = {
  chave: ChaveDaColuna;
  titulo: string;
  /** "agora" ou "no período": as três primeiras são o retrato de hoje */
  recorte: "agora" | "no período";
  /** o que separa a coluna da vizinha, quando o título não basta */
  criterio: string | null;
  total: number;
  valor: number | null;
  cartoes: Cartao[];
  /** a lista inteira, quando existe uma tela que a mostra */
  verTodas: string | null;
  vazio: string;
};

function eventoEmPalavras(tipo: string, data: string | null): string {
  const rotulo = (EVENT_TYPE_LABELS as Record<string, string>)[tipo] ?? "Evento";
  if (!data) return `${rotulo} · data a definir`;
  const [a, m, d] = partes(data);
  return `${rotulo} · ${doisDigitos(d)}/${doisDigitos(m)}/${a}`;
}

function venceEm(dataValidade: string, hoje: string): string {
  const n = diasEntre(hoje, dataValidade);
  if (n <= 0) return "vence hoje";
  if (n === 1) return "vence amanhã";
  return `vence em ${n} dias`;
}

const ESPACO_FIXO = String.fromCharCode(160);

/** "R$ 37.175", sem deixar o símbolo numa linha e o número na outra. */
export function emReais(valor: number): string {
  return `R$${ESPACO_FIXO}${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

const encurtar = (texto: string, max = 90) =>
  texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto;

function cartaoDaProposta(f: Fatos, valor: number, linha: string): Cartao {
  return {
    id: f.p.id,
    href: `/orcamentos/${f.p.id}`,
    nome: f.p.contato_nome,
    evento: eventoEmPalavras(f.p.tipo_evento, f.p.data_evento),
    valor,
    linha,
  };
}

const somaDoValor = (lista: Fatos[]) => lista.reduce((s, f) => s + (Number(f.p.valor_total) || 0), 0);

function montarQuadro(
  fatos: Fatos[],
  pedidos: PedidoDoRelatorio[],
  per: Periodo,
  hoje: string,
  agora: Date
): Coluna[] {
  const corte = <T>(lista: T[]): T[] => lista.slice(0, CARTOES_POR_COLUNA);

  // Pedidos: quem espera há mais tempo aparece primeiro
  const abertos = pedidos
    .filter((p) => p.status === "novo")
    .sort((x, y) => x.created_at.localeCompare(y.created_at));

  // Enviadas: a mais antiga primeiro; em conversa: a que vence antes
  const enviadas = fatos
    .filter((f) => f.aberta && !f.emConversa)
    .sort((x, y) => (x.enviadaEm ?? "").localeCompare(y.enviadaEm ?? ""));
  const conversa = fatos
    .filter((f) => f.emConversa)
    .sort((x, y) => x.p.data_validade.localeCompare(y.p.data_validade));

  const aceitas = fatos
    .filter((f) => f.aceite && dentro(f.aceite.dia, per.inicio, per.fim))
    .sort((x, y) => (y.aceite?.instante ?? "").localeCompare(x.aceite?.instante ?? ""));

  // Perdidas: propostas e pedidos encerrados, a mais recente primeiro
  type Perdida = { dia: string; cartao: Cartao; valor: number };
  const perdidas: Perdida[] = [];
  for (const f of fatos) {
    if (!f.perda || !dentro(f.perda.dia, per.inicio, per.fim)) continue;
    const linha =
      f.perda.tipo === "vencida"
        ? `venceu em ${dataCurta(f.p.data_validade, hoje)}`
        : f.perda.motivo
          ? `recusada: ${encurtar(f.perda.motivo)}`
          : `recusada ${haDias(f.perda.dia as string, hoje)}`;
    const valor = Number(f.p.valor_total) || 0;
    perdidas.push({ dia: f.perda.dia as string, valor, cartao: cartaoDaProposta(f, valor, linha) });
  }
  for (const p of pedidos) {
    const dia = diaDe(p.encerrado_em);
    if (p.status !== "encerrado" || !dentro(dia, per.inicio, per.fim)) continue;
    const motivo = p.motivo_encerramento?.trim();
    perdidas.push({
      dia: dia as string,
      valor: 0,
      cartao: {
        id: p.id,
        href: `/orcamentos/pedidos?estado=encerrados#pedido-${p.id}`,
        nome: p.nome,
        evento: eventoEmPalavras(p.tipo_evento, p.data_evento),
        valor: null,
        linha: motivo
          ? `pedido encerrado: ${encurtar(motivo)}`
          : `pedido encerrado ${haDias(dia as string, hoje)}`,
      },
    });
  }
  perdidas.sort((x, y) => y.dia.localeCompare(x.dia));

  const linhaDaConversa = (f: Fatos): string => {
    const vista = visitasEmPalavras(f.p, hoje);
    const ultimaVisita = f.p.ultima_visita_em ? Date.parse(f.p.ultima_visita_em) : 0;
    // o que aconteceu por último é o que a linha conta
    const movimento =
      f.ultimoComentario && (!vista || Date.parse(f.ultimoComentario) > ultimaVisita)
        ? `comentou ${haQuanto(f.ultimoComentario, agora)}`
        : vista;
    return [movimento, venceEm(f.p.data_validade, hoje)].filter(Boolean).join(" · ");
  };

  return [
    {
      chave: "pedidos",
      titulo: "Pedidos",
      recorte: "agora",
      criterio: null,
      total: abertos.length,
      valor: null,
      cartoes: corte(abertos).map((p) => ({
        id: p.id,
        href: `/orcamentos/pedidos#pedido-${p.id}`,
        nome: p.nome,
        evento: eventoEmPalavras(p.tipo_evento, p.data_evento),
        valor: null,
        linha: `${origemEmPalavras(p)} · ${haQuanto(p.created_at, agora)}`,
      })),
      verTodas: abertos.length > CARTOES_POR_COLUNA ? "/orcamentos/pedidos" : null,
      vazio: "Nenhum pedido esperando resposta.",
    },
    {
      chave: "enviadas",
      titulo: "Enviadas",
      recorte: "agora",
      criterio: "link não aberto",
      total: enviadas.length,
      valor: somaDoValor(enviadas),
      cartoes: corte(enviadas).map((f) =>
        cartaoDaProposta(
          f,
          Number(f.p.valor_total) || 0,
          `enviada ${haDias(f.enviadaEm ?? hoje, hoje)} · ${venceEm(f.p.data_validade, hoje)}`
        )
      ),
      verTodas: enviadas.length > CARTOES_POR_COLUNA ? "/orcamentos?status=enviado" : null,
      vazio: "Nenhuma proposta esperando a primeira abertura.",
    },
    {
      chave: "conversa",
      titulo: "Em conversa",
      recorte: "agora",
      criterio: "link aberto ou comentário",
      total: conversa.length,
      valor: somaDoValor(conversa),
      cartoes: corte(conversa).map((f) =>
        cartaoDaProposta(f, Number(f.p.valor_total) || 0, linhaDaConversa(f))
      ),
      verTodas: conversa.length > CARTOES_POR_COLUNA ? "/orcamentos?status=enviado" : null,
      vazio: "Nenhuma proposta aberta pela cliente agora.",
    },
    {
      chave: "aceitas",
      titulo: "Aceitas",
      recorte: "no período",
      criterio: null,
      total: aceitas.length,
      valor: aceitas.reduce((s, f) => s + (f.aceite?.valor ?? 0), 0),
      cartoes: corte(aceitas).map((f) =>
        cartaoDaProposta(
          f,
          f.aceite?.valor ?? 0,
          `aceita ${haDias(f.aceite?.dia ?? hoje, hoje)}${f.p.evento_gerado_id ? "" : " · sem evento criado"}`
        )
      ),
      verTodas: aceitas.length > CARTOES_POR_COLUNA ? "/orcamentos?status=aprovado" : null,
      vazio: "Nenhum aceite no período.",
    },
    {
      chave: "perdidas",
      titulo: "Perdidas",
      recorte: "no período",
      criterio: null,
      total: perdidas.length,
      valor: perdidas.reduce((s, x) => s + x.valor, 0),
      cartoes: corte(perdidas).map((x) => x.cartao),
      // recusa, validade e pedido encerrado não moram numa lista só
      verTodas: null,
      vazio: "Nenhuma perda no período.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* As seções                                                           */
/* ------------------------------------------------------------------ */

export type LinhaDoMes = {
  mes: string;
  rotulo: string;
  /** o mês corrente, ainda em andamento */
  parcial: boolean;
  enviadas: number;
  aceitas: number;
  valor: number;
};

function porMes(fatos: Fatos[], hoje: string): LinhaDoMes[] {
  const [a, m] = partes(hoje);
  const linhas: LinhaDoMes[] = [];
  for (let i = MESES_NA_TABELA - 1; i >= 0; i--) {
    const total = a * 12 + (m - 1) - i;
    const ano = Math.floor(total / 12);
    const mes = (total % 12) + 1;
    const chave = `${ano}-${doisDigitos(mes)}`;
    const doMes = (dia: string | null) => dia !== null && dia.slice(0, 7) === chave;
    const aceitas = fatos.filter((f) => f.aceite && doMes(f.aceite.dia));
    linhas.push({
      mes: chave,
      rotulo: `${MESES_CURTOS[mes - 1]} ${ano}`,
      parcial: i === 0,
      enviadas: fatos.filter((f) => doMes(f.enviadaEm)).length,
      aceitas: aceitas.length,
      valor: aceitas.reduce((s, f) => s + (f.aceite?.valor ?? 0), 0),
    });
  }
  return linhas;
}

export type LinhaDeOrigem = {
  chave: string;
  rotulo: string;
  pedidos: number;
  comProposta: number;
  aceitos: number;
};

export type Origens = {
  linhas: LinhaDeOrigem[];
  /** propostas que ela abriu sem pedido, enviadas no período */
  diretas: { enviadas: number; aceitas: number };
};

const comMaiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function rotuloDeOrigem(origem: OrigemDoAcesso, campanha: string | null | undefined): string {
  const base = comMaiuscula(ORIGEM_LABEL[origem] ?? ORIGEM_LABEL.outro);
  const c = campanha?.trim();
  return c ? `${base} · ${c}` : base;
}

function origens(fatos: Fatos[], pedidos: PedidoDoRelatorio[], per: Periodo): Origens {
  const porId = new Map(fatos.map((f) => [f.p.id, f]));
  const grupos = new Map<string, LinhaDeOrigem>();
  for (const p of pedidos) {
    if (!dentro(diaDe(p.created_at), per.inicio, per.fim)) continue;
    const vitrine = p.canal === "pagina_publica";
    const chave = vitrine ? `${p.origem_acesso}|${p.utm_campaign?.trim() ?? ""}` : `canal:${p.canal}`;
    const linha =
      grupos.get(chave) ??
      {
        chave,
        rotulo: vitrine ? rotuloDeOrigem(p.origem_acesso, p.utm_campaign) : comMaiuscula(origemEmPalavras(p)),
        pedidos: 0,
        comProposta: 0,
        aceitos: 0,
      };
    linha.pedidos += 1;
    if (p.orcamento_id) {
      linha.comProposta += 1;
      if (porId.get(p.orcamento_id)?.aceite) linha.aceitos += 1;
    }
    grupos.set(chave, linha);
  }

  const diretas = fatos.filter((f) => !f.p.pedido_id && dentro(f.enviadaEm, per.inicio, per.fim));
  return {
    linhas: [...grupos.values()].sort((x, y) => y.pedidos - x.pedidos || x.rotulo.localeCompare(y.rotulo)),
    diretas: {
      enviadas: diretas.length,
      aceitas: diretas.filter((f) => f.aceite !== null).length,
    },
  };
}

export type Tempos = {
  /** do pedido à proposta */
  resposta: {
    /** pedidos que chegaram no período (sem os encerrados) */
    pedidos: number;
    casos: number;
    medianaHoras: number | null;
    /** respondidos com proposta em até 24 h */
    em24h: number;
    /** pedidos que já tiveram as 24 h para isso (os encerrados não entram) */
    elegiveis: number;
  };
  /** do envio à assinatura */
  aceite: { casos: number; medianaDias: number | null };
};

export function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const v = [...valores].sort((x, y) => x - y);
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

const HORA = 3_600_000;

function tempos(fatos: Fatos[], pedidos: PedidoDoRelatorio[], per: Periodo, agora: Date): Tempos {
  const doPeriodo = pedidos.filter(
    (p) => p.status !== "encerrado" && dentro(diaDe(p.created_at), per.inicio, per.fim)
  );
  const horas: number[] = [];
  let em24h = 0;
  let elegiveis = 0;
  for (const p of doPeriodo) {
    const chegou = new Date(p.created_at).getTime();
    if (p.respondido_em) {
      const h = (new Date(p.respondido_em).getTime() - chegou) / HORA;
      horas.push(Math.max(0, h));
      elegiveis += 1;
      if (h <= 24) em24h += 1;
    } else if ((agora.getTime() - chegou) / HORA >= 24) {
      elegiveis += 1;
    }
  }

  // só as propostas com a data de envio de verdade: a de criação diria
  // que a cliente demorou os dias em que a proposta ainda era rascunho
  const dias: number[] = [];
  for (const f of fatos) {
    if (!f.aceite?.instante || !f.p.enviado_em || !dentro(f.aceite.dia, per.inicio, per.fim)) continue;
    const d = (new Date(f.aceite.instante).getTime() - new Date(f.p.enviado_em).getTime()) / (24 * HORA);
    dias.push(Math.max(0, d));
  }

  return {
    resposta: {
      pedidos: doPeriodo.length,
      casos: horas.length,
      medianaHoras: horas.length >= MINIMO_DE_CASOS ? mediana(horas) : null,
      em24h,
      elegiveis,
    },
    aceite: {
      casos: dias.length,
      medianaDias: dias.length >= MINIMO_DE_CASOS ? mediana(dias) : null,
    },
  };
}

/** "menos de 1 hora", "5 horas", "2 dias". */
export function duracaoEmPalavras(horas: number): string {
  if (horas < 1) return "menos de 1 hora";
  if (horas < 24) {
    const h = Math.round(horas);
    return h === 1 ? "1 hora" : `${h} horas`;
  }
  const d = Math.round(horas / 24);
  return d === 1 ? "1 dia" : `${d} dias`;
}

export type Motivo = {
  texto: string;
  tipo: "recusada" | "pedido";
  nome: string;
  dia: string;
  /** "12/09" */
  quando: string;
};

export type Perdas = {
  recusadas: { total: number; valor: number };
  vencidas: { total: number; valor: number };
  pedidosEncerrados: number;
  /** os mais recentes, com o texto que a cliente ou a equipe escreveu */
  motivos: Motivo[];
};

export const MOTIVOS_NA_TELA = 6;

function perdas(fatos: Fatos[], pedidos: PedidoDoRelatorio[], per: Periodo, hoje: string): Perdas {
  const noPeriodo = fatos.filter((f) => f.perda && dentro(f.perda.dia, per.inicio, per.fim));
  const recusadas = noPeriodo.filter((f) => f.perda?.tipo === "recusada");
  const vencidas = noPeriodo.filter((f) => f.perda?.tipo === "vencida");
  const encerrados = pedidos.filter(
    (p) => p.status === "encerrado" && dentro(diaDe(p.encerrado_em), per.inicio, per.fim)
  );

  const motivos: Motivo[] = [];
  for (const f of recusadas) {
    if (!f.perda?.motivo || !f.perda.dia) continue;
    motivos.push({
      texto: f.perda.motivo,
      tipo: "recusada",
      nome: f.p.contato_nome,
      dia: f.perda.dia,
      quando: dataCurta(f.perda.dia, hoje),
    });
  }
  for (const p of encerrados) {
    const texto = p.motivo_encerramento?.trim();
    const dia = diaDe(p.encerrado_em);
    if (!texto || !dia) continue;
    motivos.push({ texto, tipo: "pedido", nome: p.nome, dia, quando: dataCurta(dia, hoje) });
  }
  motivos.sort((x, y) => y.dia.localeCompare(x.dia));

  return {
    recusadas: { total: recusadas.length, valor: somaDoValor(recusadas) },
    vencidas: { total: vencidas.length, valor: somaDoValor(vencidas) },
    pedidosEncerrados: encerrados.length,
    motivos: motivos.slice(0, MOTIVOS_NA_TELA),
  };
}

export type ContagemDaVitrine = {
  aberturas: number;
  whatsapp: number;
  instagram: number;
  pedidos: number;
};

export type Vitrine = {
  total: ContagemDaVitrine;
  porOrigem: (ContagemDaVitrine & { chave: string; rotulo: string })[];
};

function vitrine(metricas: MetricaDoRelatorio[], per: Periodo): Vitrine {
  const total: ContagemDaVitrine = { aberturas: 0, whatsapp: 0, instagram: 0, pedidos: 0 };
  const grupos = new Map<string, ContagemDaVitrine & { chave: string; rotulo: string }>();
  for (const x of metricas) {
    if (!dentro(x.dia, per.inicio, per.fim)) continue;
    const chave = `${x.origem_acesso}|${x.campanha ?? ""}`;
    const g =
      grupos.get(chave) ??
      { chave, rotulo: rotuloDeOrigem(x.origem_acesso, x.campanha), aberturas: 0, whatsapp: 0, instagram: 0, pedidos: 0 };
    const soma = (alvo: ContagemDaVitrine) => {
      alvo.aberturas += Number(x.page_view) || 0;
      alvo.whatsapp += Number(x.whatsapp_click) || 0;
      alvo.instagram += Number(x.instagram_click) || 0;
      alvo.pedidos += Number(x.pedido_enviado) || 0;
    };
    soma(g);
    soma(total);
    grupos.set(chave, g);
  }
  return {
    total,
    porOrigem: [...grupos.values()].sort(
      (x, y) => y.aberturas - x.aberturas || y.pedidos - x.pedidos || x.rotulo.localeCompare(y.rotulo)
    ),
  };
}

/* ------------------------------------------------------------------ */
/* O relatório inteiro                                                 */
/* ------------------------------------------------------------------ */

export type Relatorio = {
  periodo: Periodo;
  numeros: Numeros;
  quadro: Coluna[];
  meses: LinhaDoMes[];
  origens: Origens;
  tempos: Tempos;
  perdas: Perdas;
  vitrine: Vitrine;
};

export function montarRelatorio(dados: DadosDoRelatorio, chave: ChavePeriodo, agora: Date): Relatorio {
  const hoje = hojeBR(agora);
  const periodo = periodoDe(chave, hoje);
  const fatos = fatosDasPropostas(dados, hoje);
  return {
    periodo,
    numeros: calcularNumeros(fatos, dados.pedidos, periodo),
    quadro: montarQuadro(fatos, dados.pedidos, periodo, hoje, agora),
    meses: porMes(fatos, hoje),
    origens: origens(fatos, dados.pedidos, periodo),
    tempos: tempos(fatos, dados.pedidos, periodo, agora),
    perdas: perdas(fatos, dados.pedidos, periodo, hoje),
    vitrine: vitrine(dados.metricas, periodo),
  };
}
