// Os planos vendidos — lidos do banco, nunca escritos aqui.
//
// Até a 147 o único preço morava numa variável de ambiente e o plano era
// gravado como o texto fixo "mensal". Agora preço e tetos são DADO em
// `plano_catalogo`: o admin edita lá, e a tela de assinatura, a cobrança
// e o painel do dono leem daqui. Nenhum número de plano vive em TS.

import { createClient } from "@/lib/supabase/server";
import { somarDias } from "@/lib/tempo";

export type CodigoDoPlano = "essencial" | "profissional" | "master";

export type PlanoDoCatalogo = {
  codigo: CodigoDoPlano;
  nome: string;
  valorMensal: number;
  /** teto de eventos de pé; null = sem limite */
  eventosEmAndamento: number | null;
  /** teto de pessoas ativas com login; null = sem limite */
  logins: number | null;
  ordem: number;
};

const CODIGOS: CodigoDoPlano[] = ["essencial", "profissional", "master"];

export function ehCodigoDoPlano(v: unknown): v is CodigoDoPlano {
  return typeof v === "string" && (CODIGOS as string[]).includes(v);
}

type Linha = {
  codigo: string;
  nome: string;
  valor_mensal: number | string;
  eventos_em_andamento: number | null;
  logins: number | null;
  ordem: number;
};

function comoPlano(l: Linha): PlanoDoCatalogo {
  return {
    codigo: l.codigo as CodigoDoPlano,
    nome: l.nome,
    valorMensal: Number(l.valor_mensal),
    eventosEmAndamento: l.eventos_em_andamento,
    logins: l.logins,
    ordem: l.ordem,
  };
}

/** Os planos ativos, na ordem da vitrine (Essencial → Master). */
export async function getCatalogoDePlanos(): Promise<PlanoDoCatalogo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("plano_catalogo")
    .select("codigo, nome, valor_mensal, eventos_em_andamento, logins, ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  return ((data ?? []) as Linha[]).filter((l) => ehCodigoDoPlano(l.codigo)).map(comoPlano);
}

/** Um plano pelo código; null se não existe ou está inativo. */
export async function getPlano(codigo: string): Promise<PlanoDoCatalogo | null> {
  if (!ehCodigoDoPlano(codigo)) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("plano_catalogo")
    .select("codigo, nome, valor_mensal, eventos_em_andamento, logins, ordem")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .maybeSingle();
  return data ? comoPlano(data as Linha) : null;
}

/** "R$ 149,00" — o gateway pensa em centavos, a tela em reais. */
export function reais(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export function centavos(valorReais: number): number {
  return Math.round(valorReais * 100);
}

/** "sem limite" quando o teto é nulo — a palavra que a tela usa. */
export function tetoEmTexto(teto: number | null): string {
  return teto === null ? "sem limite" : String(teto);
}

/* ------------------------------------------------------------------ */
/* A promoção de lançamento (153)                                      */
/* ------------------------------------------------------------------ */

/**
 * A promoção de lançamento, e o plano em que ela vale.
 *
 * Os VALORES da escada não moram aqui — moram em `plano_promocao` (153),
 * como os do catálogo. O que mora aqui é só o casamento entre a promoção
 * e o plano, porque a tabela guarda degraus e não guarda plano.
 *
 * E é bom repetir o que a 153 escreveu: promoção é PREÇO, nunca plano. A
 * conta é 'essencial' desde o primeiro dia, com os tetos do Essencial —
 * `teto_do_plano` lê o plano, não o valor. Ninguém ganha um evento a mais
 * por pagar menos, nem perde acesso quando o preço sobe.
 */
export const PROMOCAO_LANCAMENTO = "lancamento";
export const PLANO_DA_PROMOCAO: CodigoDoPlano = "essencial";

export type DegrauDaPromocao = {
  ordem: number;
  valorMensal: number;
  /** duração DESTE degrau em meses, não o acumulado */
  meses: number;
};

export type EscadaDaPromocao = {
  codigo: string;
  degraus: DegrauDaPromocao[];
};

async function lerDegraus(codigo: string, soAtivos: boolean): Promise<EscadaDaPromocao | null> {
  const supabase = createClient();
  let q = supabase
    .from("plano_promocao")
    .select("ordem, valor_mensal, meses")
    .eq("codigo", codigo);
  if (soAtivos) q = q.eq("ativo", true);
  const { data } = await q.order("ordem", { ascending: true });
  const degraus = (
    (data ?? []) as { ordem: number; valor_mensal: number | string; meses: number }[]
  ).map((l) => ({ ordem: l.ordem, valorMensal: Number(l.valor_mensal), meses: l.meses }));
  return degraus.length > 0 ? { codigo, degraus } : null;
}

/**
 * A escada À VENDA: só os degraus ativos. É esta que a vitrine anuncia e
 * que a action usa para decidir por quanto a assinatura nasce.
 */
export async function getEscadaDaPromocao(codigo: string): Promise<EscadaDaPromocao | null> {
  return lerDegraus(codigo, true);
}

/**
 * A escada de quem JÁ ENTROU — sem filtro de `ativo`, de propósito.
 *
 * `ativo` governa a venda; a escada de quem já está nela é contrato. O dia
 * em que o dono tirar o lançamento de venda, a frase do degrau tem de
 * continuar aparecendo no painel dela e tem de continuar batendo com o que
 * o banco cobra — `valor_da_promocao` (153) ignora `ativo` pelo mesmo
 * motivo. Duas leituras diferentes porque são duas perguntas diferentes.
 *
 * A policy da 153 filtra `ativo` para anon e authenticated, então esta
 * leitura, feita com a sessão dela, pode devolver menos do que existe. É
 * aceitável: o pior caso é a frase sumir da tela; quem manda no dinheiro
 * é a função do banco, que roda como dona e enxerga a escada inteira.
 */
export async function getEscadaContratada(codigo: string): Promise<EscadaDaPromocao | null> {
  return lerDegraus(codigo, false);
}

/**
 * O teto de segurança: degrau nenhum pode custar mais do que o plano.
 *
 * Um degrau acima do catálogo só pode ser erro de digitação no preço — e
 * o lado em que esse erro pode cair é o dela, nunca o dela pagando mais.
 */
export function comTetoDoPlano(valorDoDegrau: number, valorCheio: number): number {
  return Math.min(valorDoDegrau, valorCheio);
}

/**
 * Esta conta ainda pode entrar na promoção de lançamento?
 *
 * Lançamento é para quem chega, não para quem volta: quem já pagou, quem
 * está pagando e quem já cancelou uma vez não entram de novo.
 *
 * O que NÃO conta como "já teve assinatura": cartão recusado. A tentativa
 * grava `gateway_subscription_id` mesmo quando a operadora recusa (é o que
 * permite trocar o cartão e cancelar depois), e usar essa coluna como
 * régua tiraria a promoção de quem só errou o CVV na primeira tentativa.
 * A régua é dinheiro que entrou, cancelamento registrado ou assinatura de
 * pé — nada disso acontece num cartão recusado.
 *
 * A mesma régua vale para a TELA, que lê as mesmas colunas: o preço que o
 * cartão da vitrine anuncia tem de ser o preço que a action cobra.
 */
export function podeEntrarNaPromocao(
  a: {
    status?: string | null;
    cancelada_em?: string | null;
    ultimo_pagamento_em?: string | null;
  } | null
): boolean {
  if (!a) return true;
  if (a.cancelada_em) return false;
  if (a.ultimo_pagamento_em) return false;
  return a.status !== "ativa" && a.status !== "inadimplente";
}

function partesISO(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * Quantos meses INTEIROS se passaram — a mesma conta do `age()` que a 153
 * faz no banco: de 6 de setembro a 5 de outubro ainda é mês 0.
 */
function mesesDecorridos(inicio: string, hoje: string): number | null {
  const a = partesISO(inicio);
  const b = partesISO(hoje);
  if (!a || !b) return null;
  let m = (b[0] - a[0]) * 12 + (b[1] - a[1]);
  if (b[2] < a[2]) m -= 1;
  return m;
}

/**
 * O dia em que o degrau número `meses` começa a valer.
 *
 * Somar meses no calendário quase basta, mas fevereiro estraga: quem
 * assinou dia 31 de janeiro tem `age()` marcando um mês só em 1º de
 * março, não em 28 de fevereiro. O laço acerta esses um ou dois dias em
 * vez de anunciar uma data que o banco não confirmaria.
 */
function diaDaVirada(inicio: string, meses: number): string {
  const a = partesISO(inicio);
  if (!a) return inicio;
  const d = new Date(Date.UTC(a[0], a[1] - 1 + meses, 1));
  const ultimoDoMes = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(a[2], ultimoDoMes));
  for (let i = 0; i < 5; i++) {
    const iso = d.toISOString().slice(0, 10);
    if ((mesesDecorridos(inicio, iso) ?? 0) >= meses) return iso;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

const MESES_POR_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataPorExtenso(iso: string): string {
  const p = partesISO(iso);
  return p ? `${p[2]} de ${MESES_POR_EXTENSO[p[1] - 1]}` : iso;
}

/**
 * A data que manda no degrau — e ela NÃO é hoje.
 *
 * Trocar o preço do item na operadora vale a partir da PRÓXIMA cobrança,
 * sem pró-rata. Então a pergunta certa nunca é "quanto ela deveria pagar
 * hoje?", e sim "quanto vai sair na próxima cobrança?". Perguntando por
 * hoje, cada degrau chegava um ciclo atrasado: no dia em que a escada
 * virava, a cobrança daquele dia já tinha saído pelo valor antigo, e o
 * degrau novo só alcançava a cobrança do mês seguinte — quatro cobranças
 * de R$ 27,90 contra as três prometidas no checkout, e a frase "a partir
 * de 6 de dezembro, R$ 57,00" desmentida no próprio dia 6.
 *
 * Perguntando pela data da próxima cobrança, a troca acontece em
 * qualquer dia do ciclo corrente — há um mês inteiro de janela, não um
 * dia exato, e a rotina que falhar por uma semana ainda acerta.
 *
 * Sem vencimento gravado (ou com um vencimento vencido, de conta
 * inadimplente) sobra o mínimo honesto: amanhã. Erra tarde, nunca cedo —
 * e errar tarde é ela seguir pagando o degrau anterior.
 */
export function dataQueMandaNoDegrau(
  proximoVencimento: string | null | undefined,
  hoje: string
): string {
  return proximoVencimento && proximoVencimento > hoje
    ? proximoVencimento
    : somarDias(hoje, 1);
}

/**
 * Em que degrau esta assinatura está, e em que dia ele muda.
 *
 * `referencia` é a data da PRÓXIMA COBRANÇA, não hoje — ver
 * `dataQueMandaNoDegrau`. É a mesma conta de `valor_da_promocao` (153),
 * aqui só para a TELA ter o que dizer, e com a mesma data que a rotina
 * usa: se a tela perguntasse por hoje e a rotina pela próxima cobrança,
 * o painel mostraria um valor e a frase logo abaixo, outro. Quem manda
 * no dinheiro continua sendo a função do banco. Devolve null quando a
 * escada já acabou — aí vale o preço do plano e não há mais o que avisar.
 */
export function degrauDeHoje(
  escada: EscadaDaPromocao,
  inicio: string,
  referencia: string
): { degrau: DegrauDaPromocao; mudaEm: string } | null {
  const m = mesesDecorridos(inicio, referencia);
  if (m === null) return null;
  let ate = 0;
  for (const d of escada.degraus) {
    ate += d.meses;
    if (m < ate) return { degrau: d, mudaEm: diaDaVirada(inicio, ate) };
  }
  return null;
}

/**
 * A escada com todas as letras: "R$ 27,90/mês nos 3 primeiros meses,
 * depois R$ 57,00 e a partir do 7º mês R$ 97,00".
 *
 * Esta frase é obrigação, não enfeite. O preço futuro precisa estar dito
 * no CHECKOUT, não só no anúncio: é o que o CDC pede sobre mudança de
 * preço e é, na prática, o que evita a contestação de cartão no quarto
 * mês — quando o valor sobe e ninguém lembra de ter combinado isso.
 *
 * Nenhum número escrito à mão: os degraus vêm da tabela e o preço final,
 * do catálogo.
 */
export function fraseDaEscada(escada: EscadaDaPromocao, valorCheio: number): string {
  const partes: string[] = [];
  let ate = 0;
  escada.degraus.forEach((d, i) => {
    const comeca = ate + 1;
    ate += d.meses;
    const valor = reais(comTetoDoPlano(d.valorMensal, valorCheio));
    if (i === 0) {
      partes.push(
        d.meses === 1 ? `${valor}/mês no primeiro mês` : `${valor}/mês nos ${d.meses} primeiros meses`
      );
    } else if (i === escada.degraus.length - 1) {
      partes.push(`depois ${valor}`);
    } else {
      partes.push(`${valor} do ${comeca}º ao ${ate}º mês`);
    }
  });
  partes.push(`a partir do ${ate + 1}º mês ${reais(valorCheio)}`);
  // "a, b e c": a última parte entra com "e", as outras com vírgula
  const ultima = partes.pop() as string;
  return partes.length > 0 ? `${partes.join(", ")} e ${ultima}` : ultima;
}

/**
 * O que dizer a quem JÁ está na escada: quanto sai na próxima cobrança e
 * em que dia isso muda. `referencia` é a data da próxima cobrança — a
 * mesma que a rotina usa (ver `dataQueMandaNoDegrau`), para o número no
 * painel e a frase logo abaixo dele não discordarem.
 *
 * null quando a escada acabou — aí ela paga o preço do plano, como todo
 * mundo, e não há aviso a dar.
 */
export function fraseDoDegrauAtual(
  escada: EscadaDaPromocao,
  inicio: string,
  valorCheio: number,
  referencia: string
): string | null {
  const atual = degrauDeHoje(escada, inicio, referencia);
  if (!atual) return null;
  const proximo = escada.degraus.find((d) => d.ordem > atual.degrau.ordem);
  const depois = comTetoDoPlano(proximo ? proximo.valorMensal : valorCheio, valorCheio);
  return `Você paga ${reais(comTetoDoPlano(atual.degrau.valorMensal, valorCheio))}/mês. A partir de ${dataPorExtenso(atual.mudaEm)}, ${reais(depois)}/mês.`;
}

/**
 * A escada em FAIXAS DE MÊS, que é como a página de vendas a mostra:
 * "Meses 1 a 3 · R$ 27,90", "Meses 4 a 6 · R$ 57,00", "Do 7º mês em
 * diante · R$ 97,00".
 *
 * A última faixa é o preço do catálogo — ela não vem de `plano_promocao`,
 * vem do plano, e é justamente a que a pessoa precisa ler ANTES de
 * assinar. Por isso ela entra aqui e não é opcional: a tabela da oferta,
 * a coluna do plano e a frase do rodapé saem todas desta mesma lista, e
 * nenhuma delas pode contar metade da escada.
 *
 * `fraseDaEscada` continua existindo para o painel de quem já assinou —
 * lá a frase é corrida ("nos 3 primeiros meses, depois…"); aqui ela é
 * por faixa, porque a vitrine mostra as faixas numa tabela.
 */
export type FaixaDaEscada = {
  /** "Meses 1 a 3", "Mês 1", "Do 7º mês em diante" */
  rotulo: string;
  valorMensal: number;
  /** primeiro mês da faixa, 1-based */
  de: number;
  /** último mês; null na faixa final, que não acaba */
  ate: number | null;
};

export function faixasDaEscada(
  escada: EscadaDaPromocao,
  valorCheio: number
): FaixaDaEscada[] {
  const faixas: FaixaDaEscada[] = [];
  let ate = 0;
  for (const d of escada.degraus) {
    const de = ate + 1;
    ate += d.meses;
    faixas.push({
      rotulo: de === ate ? `Mês ${de}` : `Meses ${de} a ${ate}`,
      valorMensal: comTetoDoPlano(d.valorMensal, valorCheio),
      de,
      ate,
    });
  }
  faixas.push({
    rotulo: `Do ${ate + 1}º mês em diante`,
    valorMensal: valorCheio,
    de: ate + 1,
    ate: null,
  });
  return faixas;
}

/** A mesma escada numa linha só: "R$ 27,90 nos meses 1 a 3, R$ 57,00…". */
export function fraseDasFaixas(faixas: FaixaDaEscada[]): string {
  return faixas
    .map((f) => {
      if (f.ate === null) return `${reais(f.valorMensal)} do ${f.de}º mês em diante`;
      if (f.de === f.ate) return `${reais(f.valorMensal)} no mês ${f.de}`;
      return `${reais(f.valorMensal)} nos meses ${f.de} a ${f.ate}`;
    })
    .join(", ");
}
