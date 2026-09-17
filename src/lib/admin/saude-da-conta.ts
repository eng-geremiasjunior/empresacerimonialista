// A saúde de cada conta, para o painel do dono. Módulo PURO: entra o
// resumo que o banco devolve (admin_resumo_contas, 123 seção 9), sai o que
// a tela mostra. Sem banco, sem relógio escondido: "agora" é sempre
// parâmetro, e os dias são contados no calendário de Brasília.
//
// A regra de ouro do painel vale aqui também: número sem base não vira
// zero, e cada motivo de atenção diz o fato e há quanto tempo, nunca só um
// rótulo.

import { hojeBR } from "@/lib/tempo";

// ------------------------------------------------------------------
// O que o banco devolve
// ------------------------------------------------------------------

export type AssinaturaDoResumo = {
  id: string;
  plano: string;
  valor_mensal: number | string;
  status: string;
  inicio: string | null;
  cancelada_em: string | null;
  motivo_cancelamento?: string | null;
  observacao?: string | null;
  teste_termina_em?: string | null;
  teste_ia_ate?: string | null;
  proximo_vencimento?: string | null;
  ultimo_pagamento_em?: string | null;
  falhas_seguidas?: number | null;
  cartao_final?: string | null;
  cartao_bandeira?: string | null;
  cartao_mes?: number | null;
  cartao_ano?: number | null;
  promocao_codigo?: string | null;
  tem_gateway: boolean;
  created_at?: string | null;
};

export type ResumoDaConta = {
  empresa_id: string;
  nome: string;
  criada_em: string;
  da_casa: boolean;
  dona: {
    user_id: string;
    nome: string | null;
    whatsapp: string | null;
    guia_dispensado_em: string | null;
    guia_concluido_em: string | null;
    email: string | null;
    ultimo_login: string | null;
    banida_ate: string | null;
    eventos_3_meses: string | null;
    instagram: string | null;
  };
  equipe: {
    pessoas: number;
    convidadas: number;
    primeiro_convite_em: string | null;
    ultimo_login: string | null;
    cargos: { cargo: string | null; dona: boolean; status: string; ultimo_login: string | null }[] | null;
  };
  assinatura: AssinaturaDoResumo | null;
  congelada: boolean;
  congela_em: string | null;
  historico: { convertida_em: string | null; ultimo_cancelamento_em: string | null; linhas: number };
  eventos: {
    total: number;
    em_andamento: number;
    concluidos: number;
    proximos_30: number;
    primeiro_em: string | null;
    contexto: boolean;
    convidados_previstos: number;
    cidades: string[] | null;
  };
  proximo_evento: { data: string; tipo: string | null; cidade: string | null } | null;
  decisoes: { tomadas: number; primeira_em: string | null };
  tarefas: { total: number; de_decisao: number; primeira_de_decisao_em: string | null; andamento: boolean };
  fornecedores: { total: number; primeiro_em: string | null; vinculos: number; responderam: number };
  clientes: number;
  convidados: number;
  propostas: { total: number; enviadas: number; aceitas: number; primeira_enviada_em: string | null };
  acoes: {
    ultima_em: string | null;
    ultima_tipo: string | null;
    dias_7: number;
    dias_30: number;
    por_tipo: Record<string, { n: number; primeira: string; ultima: string }>;
  };
  acesso: {
    ultimo_sinal: string | null;
    dias_7: number;
    dias_30: number;
    dias_total: number;
    minutos_7: number;
    minutos_30: number;
    ultimo_dia: string | null;
  };
  suporte: {
    mensagens_30d: number;
    nao_lidas: number;
    ultima_em: string | null;
    sem_resposta: number;
    esperando_desde: string | null;
  };
  origem: {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    gclid: boolean;
    user_agent: string | null;
  } | null;
};

// ------------------------------------------------------------------
// Calendário (Brasília)
// ------------------------------------------------------------------

const DIA_MS = 86_400_000;

function diaComoNumero(yyyyMmDd: string): number {
  const [a, m, d] = yyyyMmDd.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d) / DIA_MS;
}

/** O dia de Brasília de um instante (ou de uma data "yyyy-mm-dd"). */
export function diaBR(iso: string): string {
  return iso.length <= 10 ? iso : hojeBR(new Date(iso));
}

/** Quantos dias de calendário se passaram de `iso` até `agora`. */
export function diasDesde(iso: string | null, agora: Date): number | null {
  if (!iso) return null;
  return diaComoNumero(hojeBR(agora)) - diaComoNumero(diaBR(iso));
}

/** Quantos dias faltam até a data (0 = hoje; negativo = já passou). */
export function diasAte(yyyyMmDd: string | null | undefined, agora: Date): number | null {
  if (!yyyyMmDd) return null;
  return diaComoNumero(yyyyMmDd) - diaComoNumero(hojeBR(agora));
}

function maisRecente(...datas: (string | null | undefined)[]): string | null {
  let melhor: string | null = null;
  let t = -Infinity;
  for (const d of datas) {
    if (!d) continue;
    const v = new Date(d).getTime();
    if (Number.isFinite(v) && v > t) {
      t = v;
      melhor = d;
    }
  }
  return melhor;
}

// ------------------------------------------------------------------
// Os fatos derivados
// ------------------------------------------------------------------

/** Os prazos das regras, num lugar só. */
export const PRAZOS = {
  /** conta nova: ainda explorando */
  novaAteDias: 2,
  /** o teste está acabando */
  testeAcabandoDias: 2,
  /** teste vencido que ainda aparece na atenção */
  testeVencidoRecenteDias: 7,
  /** criou evento e não fez mais nada */
  parouDias: 3,
  /** sem abrir o sistema */
  sumiuTesteDias: 3,
  sumiuPaganteDias: 7,
  /** pagante com pouco uso e parando */
  poucoUsoDias: 7,
  parandoDias: 14,
} as const;

/** As faixas do filtro "sem uso há". */
export const FAIXAS_SEM_USO = [3, 7, 14, 30, 60] as const;

export function banida(c: ResumoDaConta, agora: Date): boolean {
  const ate = c.dona.banida_ate;
  return Boolean(ate && new Date(ate).getTime() > agora.getTime());
}

/** O acesso mais recente de alguém da conta: login ou sinal da tela. */
export function ultimoAcesso(c: ResumoDaConta): string | null {
  return maisRecente(c.dona.ultimo_login, c.equipe.ultimo_login, c.acesso.ultimo_sinal);
}

/** Dias sem ação útil; sem nenhuma ação, conta desde a criação da conta. */
export function diasSemAcao(c: ResumoDaConta, agora: Date): number {
  return diasDesde(c.acoes.ultima_em ?? c.criada_em, agora) ?? 0;
}

/** Dias sem abrir o sistema; sem registro nenhum, desde a criação. */
export function diasSemAcesso(c: ResumoDaConta, agora: Date): number {
  return diasDesde(ultimoAcesso(c) ?? c.criada_em, agora) ?? 0;
}

/** A conta chegou ao momento de valor: uma tarefa nasceu de uma decisão. */
export function ativada(c: ResumoDaConta): boolean {
  return (c.tarefas.de_decisao ?? 0) > 0;
}

export function pagante(c: ResumoDaConta): boolean {
  const s = c.assinatura?.status;
  return s === "ativa" || s === "inadimplente" || s === "pausada";
}

export function emTeste(c: ResumoDaConta): boolean {
  return c.assinatura?.status === "trial";
}

export function cobrancaPendente(c: ResumoDaConta): boolean {
  const a = c.assinatura;
  return Boolean(a && pagante(c) && (a.status === "inadimplente" || (a.falhas_seguidas ?? 0) > 0));
}

export function valorMensal(c: ResumoDaConta): number {
  return Number(c.assinatura?.valor_mensal) || 0;
}

// ------------------------------------------------------------------
// Situação: uma só por conta, em texto
// ------------------------------------------------------------------

export type GrupoDaSituacao = "teste" | "pagante" | "cancelada" | "suspensa" | "interna" | "sem_assinatura";

export type Situacao = {
  grupo: GrupoDaSituacao;
  chave: string;
  rotulo: string;
};

export function situacaoDaConta(c: ResumoDaConta, agora: Date): Situacao {
  if (c.da_casa) return { grupo: "interna", chave: "interna", rotulo: "Conta da casa" };
  if (banida(c, agora)) return { grupo: "suspensa", chave: "suspensa", rotulo: "Suspensa" };
  const a = c.assinatura;
  if (!a) return { grupo: "sem_assinatura", chave: "sem_assinatura", rotulo: "Sem assinatura" };

  if (a.status === "cancelada") {
    return c.congelada
      ? { grupo: "cancelada", chave: "congelada", rotulo: "Cancelada · congelada" }
      : { grupo: "cancelada", chave: "cancelada", rotulo: "Cancelada" };
  }

  if (pagante(c)) {
    if (cobrancaPendente(c)) return { grupo: "pagante", chave: "cobranca", rotulo: "Cobrança pendente" };
    if (a.status === "pausada") return { grupo: "pagante", chave: "pausada", rotulo: "Pausada" };
    const sem = diasSemAcao(c, agora);
    if (sem >= PRAZOS.parandoDias) return { grupo: "pagante", chave: "parando", rotulo: "Pagante parando" };
    if (sem >= PRAZOS.poucoUsoDias) return { grupo: "pagante", chave: "pouco_uso", rotulo: "Pagante com pouco uso" };
    return { grupo: "pagante", chave: "em_dia", rotulo: "Pagante em dia" };
  }

  // trial (ou qualquer status antigo que não seja pagante nem cancelada)
  const faltam = diasAte(a.teste_termina_em, agora);
  if (faltam === null) return { grupo: "teste", chave: "sem_prazo", rotulo: "Teste sem prazo" };
  if (faltam < 0) return { grupo: "teste", chave: "vencido", rotulo: "Teste vencido" };
  if (ativada(c)) return { grupo: "teste", chave: "ativado", rotulo: "Teste ativado" };
  if (c.eventos.total > 0) return { grupo: "teste", chave: "em_uso", rotulo: "Teste em uso" };
  if ((diasDesde(c.criada_em, agora) ?? 0) < PRAZOS.novaAteDias) {
    return { grupo: "teste", chave: "novo", rotulo: "Teste novo" };
  }
  return { grupo: "teste", chave: "sem_uso", rotulo: "Teste sem uso" };
}

// ------------------------------------------------------------------
// Tempo em palavras
// ------------------------------------------------------------------

export function diasEmPalavras(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  return `há ${dias} dias`;
}

export function prazoEmPalavras(dias: number): string {
  if (dias < 0) return dias === -1 ? "acabou ontem" : `acabou há ${-dias} dias`;
  if (dias === 0) return "acaba hoje";
  if (dias === 1) return "acaba amanhã";
  return `acaba em ${dias} dias`;
}

/** "3 h", "2 dias": há quanto tempo, a partir de um instante. */
export function esperaEmPalavras(iso: string, agora: Date): string {
  const min = Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return min <= 1 ? "1 min" : `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return h === 1 ? "1 h" : `${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 dia" : `${d} dias`;
}

// ------------------------------------------------------------------
// Precisa de atenção
// ------------------------------------------------------------------

export type ChaveDoMotivo =
  | "cobranca"
  | "teste_acabando"
  | "suporte"
  | "pagante_parando"
  | "teste_vencido"
  | "nada_criado"
  | "parou"
  | "cartao_vencendo"
  | "sumiu";

export type Motivo = {
  chave: ChaveDoMotivo;
  /** o fato, com o tempo */
  texto: string;
  /** menor = mais urgente */
  urgencia: number;
};

/** Os grupos da lista, na ordem da tela, com o título de cada um. */
export const GRUPOS_DE_ATENCAO: { chave: ChaveDoMotivo; titulo: string }[] = [
  { chave: "cobranca", titulo: "Cobrança pendente" },
  { chave: "teste_acabando", titulo: "Teste acabando sem ativar" },
  { chave: "suporte", titulo: "Suporte sem resposta" },
  { chave: "pagante_parando", titulo: "Pagantes parando" },
  { chave: "teste_vencido", titulo: "Teste vencido sem assinar" },
  { chave: "nada_criado", titulo: "Criaram a conta e não criaram nada" },
  { chave: "parou", titulo: "Criaram evento e pararam" },
  { chave: "cartao_vencendo", titulo: "Cartão perto de vencer" },
  { chave: "sumiu", titulo: "Sem abrir o sistema" },
];

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

export function motivosDeAtencao(c: ResumoDaConta, agora: Date): Motivo[] {
  if (c.da_casa || banida(c, agora)) return [];
  const a = c.assinatura;
  const motivos: Motivo[] = [];
  const idade = diasDesde(c.criada_em, agora) ?? 0;
  const semAcao = diasSemAcao(c, agora);
  const semAcesso = diasSemAcesso(c, agora);
  const paga = pagante(c);
  const testa = emTeste(c);
  const faltam = testa ? diasAte(a?.teste_termina_em, agora) : null;
  const ativa = ativada(c);

  if (cobrancaPendente(c)) {
    const falhas = a?.falhas_seguidas ?? 0;
    motivos.push({
      chave: "cobranca",
      texto: falhas > 0
        ? `a operadora recusou a cobrança (${plural(falhas, "tentativa", "tentativas")})`
        : "a cobrança está em atraso",
      urgencia: 0,
    });
  }

  if (testa && faltam !== null && faltam >= 0 && faltam <= PRAZOS.testeAcabandoDias && !ativa) {
    motivos.push({
      chave: "teste_acabando",
      texto: `o teste ${prazoEmPalavras(faltam)} e nenhuma tarefa nasceu de uma decisão`,
      urgencia: 1,
    });
  }

  if ((c.suporte.sem_resposta ?? 0) > 0 && c.suporte.esperando_desde) {
    motivos.push({
      chave: "suporte",
      texto: `mensagem no suporte esperando há ${esperaEmPalavras(c.suporte.esperando_desde, agora)}`,
      urgencia: 1,
    });
  }

  if (paga && a?.status !== "pausada" && semAcao >= PRAZOS.parandoDias) {
    motivos.push({
      chave: "pagante_parando",
      texto: `pagante sem nenhuma ação ${diasEmPalavras(semAcao)}`,
      urgencia: 2,
    });
  }

  if (testa && faltam !== null && faltam < 0 && -faltam <= PRAZOS.testeVencidoRecenteDias) {
    motivos.push({
      chave: "teste_vencido",
      texto: `o teste ${prazoEmPalavras(faltam)} e ela não assinou`,
      urgencia: 2,
    });
  }

  const vivo = testa ? faltam === null || faltam >= 0 : paga;
  if (vivo && c.eventos.total === 0 && idade >= PRAZOS.novaAteDias) {
    motivos.push({
      chave: "nada_criado",
      texto: `criou a conta ${diasEmPalavras(idade)} e ainda não criou evento`,
      urgencia: 3,
    });
  } else if (
    vivo &&
    c.eventos.total > 0 &&
    (c.decisoes.tomadas ?? 0) === 0 &&
    semAcao >= PRAZOS.parouDias
  ) {
    motivos.push({
      chave: "parou",
      texto: `criou evento, não decidiu nada, e a última ação foi ${diasEmPalavras(semAcao)}`,
      urgencia: 4,
    });
  }

  if (paga && a?.cartao_mes && a?.cartao_ano) {
    // o cartão vale até o último dia do mês impresso
    const fim = new Date(Date.UTC(a.cartao_ano, a.cartao_mes, 0));
    const dias = diasAte(fim.toISOString().slice(0, 10), agora);
    if (dias !== null && dias <= 31) {
      const mm = String(a.cartao_mes).padStart(2, "0");
      motivos.push({
        chave: "cartao_vencendo",
        texto: dias < 0 ? `o cartão venceu em ${mm}/${a.cartao_ano}` : `o cartão vence em ${mm}/${a.cartao_ano}`,
        urgencia: 3,
      });
    }
  }

  const prazoSumiu = paga ? PRAZOS.sumiuPaganteDias : PRAZOS.sumiuTesteDias;
  if (vivo && a?.status !== "pausada" && semAcesso >= prazoSumiu) {
    motivos.push({
      chave: "sumiu",
      texto: `sem abrir o sistema ${diasEmPalavras(semAcesso)}`,
      urgencia: 5,
    });
  }

  return motivos.sort((x, y) => x.urgencia - y.urgencia);
}

// ------------------------------------------------------------------
// Os passos do funil (o guia do primeiro acesso, e o que vem depois)
// ------------------------------------------------------------------

export type ChaveDoPasso =
  | "criou_evento"
  | "definiu_contexto"
  | "decidiu"
  | "tarefa_nasceu"
  | "deu_andamento"
  | "fornecedor"
  | "compartilhou"
  | "assinou";

export type Passo = {
  chave: ChaveDoPasso;
  rotulo: string;
  feito: boolean;
  /** a primeira vez; nulo quando o sistema não guarda a data */
  em: string | null;
};

export const PASSOS: { chave: ChaveDoPasso; rotulo: string }[] = [
  { chave: "criou_evento", rotulo: "Criou evento" },
  { chave: "definiu_contexto", rotulo: "Definiu o contexto" },
  { chave: "decidiu", rotulo: "Decidiu algo" },
  { chave: "tarefa_nasceu", rotulo: "Tarefa nasceu de uma decisão" },
  { chave: "deu_andamento", rotulo: "Deu andamento" },
  { chave: "fornecedor", rotulo: "Cadastrou fornecedor" },
  { chave: "compartilhou", rotulo: "Compartilhou" },
  { chave: "assinou", rotulo: "Assinou" },
];

function maisAntiga(...datas: (string | null | undefined)[]): string | null {
  let melhor: string | null = null;
  let t = Infinity;
  for (const d of datas) {
    if (!d) continue;
    const v = new Date(d).getTime();
    if (Number.isFinite(v) && v < t) {
      t = v;
      melhor = d;
    }
  }
  return melhor;
}

export function passosDaConta(c: ResumoDaConta): Passo[] {
  const portal = c.acoes.por_tipo?.portal?.primeira ?? null;
  const compartilhouEm = maisAntiga(
    c.propostas.primeira_enviada_em,
    portal,
    c.equipe.primeiro_convite_em
  );
  const feitos: Record<ChaveDoPasso, { feito: boolean; em: string | null }> = {
    criou_evento: { feito: c.eventos.total > 0, em: c.eventos.primeiro_em },
    definiu_contexto: { feito: Boolean(c.eventos.contexto), em: null },
    decidiu: { feito: (c.decisoes.tomadas ?? 0) > 0, em: c.decisoes.primeira_em },
    tarefa_nasceu: { feito: ativada(c), em: c.tarefas.primeira_de_decisao_em },
    deu_andamento: { feito: Boolean(c.tarefas.andamento), em: null },
    fornecedor: { feito: (c.fornecedores.total ?? 0) > 0, em: c.fornecedores.primeiro_em },
    compartilhou: {
      feito: compartilhouEm !== null || (c.fornecedores.responderam ?? 0) > 0,
      em: compartilhouEm,
    },
    assinou: { feito: Boolean(c.historico.convertida_em) || pagante(c), em: c.historico.convertida_em },
  };
  return PASSOS.map((p) => ({ ...p, ...feitos[p.chave] }));
}

// ------------------------------------------------------------------
// O que cada ação é, em palavras (linha do tempo)
// ------------------------------------------------------------------

const ACAO_EM_PALAVRAS: Record<string, [string, string]> = {
  evento: ["mudança em evento", "mudanças em eventos"],
  decisao: ["decisão tomada", "decisões tomadas"],
  tarefa: ["tarefa criada", "tarefas criadas"],
  fornecedor: ["fornecedor cadastrado ou vinculado", "fornecedores cadastrados ou vinculados"],
  cliente: ["cliente cadastrada à parte", "clientes cadastradas à parte"],
  proposta: ["proposta criada ou enviada", "propostas criadas ou enviadas"],
  pedido: ["pedido respondido", "pedidos respondidos"],
  vitrine: ["mudança na vitrine", "mudanças na vitrine"],
  financeiro: ["lançamento no financeiro", "lançamentos no financeiro"],
  roteiro: ["item no roteiro", "itens no roteiro"],
  nota: ["nota no evento", "notas nos eventos"],
  equipe: ["pessoa convidada para a equipe", "pessoas convidadas para a equipe"],
  convidado: ["convidado cadastrado", "convidados cadastrados"],
  portal: ["acesso ao portal liberado", "acessos ao portal liberados"],
  execucao: ["item do dia do evento (mesas, salão, cortejo)", "itens do dia do evento (mesas, salão, cortejo)"],
  estilo: ["item de estilo (inspiração, paleta)", "itens de estilo (inspiração, paleta)"],
};

export function acaoEmPalavras(tipo: string, n: number): string {
  const par = ACAO_EM_PALAVRAS[tipo];
  if (!par) return `${n} ${tipo}`;
  return `${n} ${n === 1 ? par[0] : par[1]}`;
}

/** "criou tarefa", para a coluna "última ação útil". */
export function ultimaAcaoEmPalavras(tipo: string | null): string {
  switch (tipo) {
    case "evento": return "mexeu em evento";
    case "decisao": return "tomou decisão";
    case "tarefa": return "criou tarefa";
    case "fornecedor": return "fornecedor";
    case "cliente": return "cadastrou cliente";
    case "proposta": return "proposta";
    case "pedido": return "respondeu pedido";
    case "vitrine": return "mexeu na vitrine";
    case "financeiro": return "financeiro";
    case "roteiro": return "roteiro";
    case "nota": return "nota no evento";
    case "equipe": return "convidou equipe";
    case "convidado": return "convidados";
    case "portal": return "liberou portal";
    case "execucao": return "dia do evento";
    case "estilo": return "estilo";
    default: return "";
  }
}

// ------------------------------------------------------------------
// Módulos (tela Ativação e uso)
// ------------------------------------------------------------------

export type Modulo =
  | "Eventos"
  | "Planejamento"
  | "Organização"
  | "Execução"
  | "Financeiro"
  | "Comercial"
  | "Clientes"
  | "Equipe"
  | "Convidados e portal"
  | "Suporte";

export const MODULOS: Modulo[] = [
  "Eventos",
  "Planejamento",
  "Organização",
  "Execução",
  "Financeiro",
  "Comercial",
  "Clientes",
  "Equipe",
  "Convidados e portal",
  "Suporte",
];

export function moduloDaAcao(tipo: string): Modulo | null {
  switch (tipo) {
    case "evento":
    case "nota":
      return "Eventos";
    case "decisao":
    case "estilo":
      return "Planejamento";
    case "tarefa":
    case "fornecedor":
      return "Organização";
    case "roteiro":
    case "execucao":
      return "Execução";
    case "financeiro":
      return "Financeiro";
    case "proposta":
    case "pedido":
    case "vitrine":
      return "Comercial";
    case "cliente":
      return "Clientes";
    case "equipe":
      return "Equipe";
    case "convidado":
    case "portal":
      return "Convidados e portal";
    default:
      return null;
  }
}

/** O módulo de uma área da presença ("Evento › Planejamento"). */
export function moduloDaArea(area: string): Modulo | "Outras" {
  const [a, b] = area.split(" › ");
  if (a === "Evento") {
    switch (b) {
      case "Planejamento":
        return "Planejamento";
      case "Organização":
      case "Tarefas":
      case "Fornecedores":
      case "Contratos":
        return "Organização";
      case "Roteiro do dia":
      case "Operação":
      case "Mesas":
      case "Cortejo":
      case "Comunicação":
        return "Execução";
      case "Financeiro":
        return "Financeiro";
      case "RSVP":
      case "Área do cliente":
        return "Convidados e portal";
      default:
        return "Eventos";
    }
  }
  switch (a) {
    case "Eventos":
    case "Novo evento":
    case "Dashboard":
    case "Início":
      return "Eventos";
    case "Gestão comercial":
    case "Catálogo":
      return "Comercial";
    case "Clientes":
      return "Clientes";
    case "Fornecedores":
    case "Tarefas":
    case "Contratos":
    case "Solicitações":
    case "Agenda":
    case "Calendário":
      return "Organização";
    case "Financeiro":
      return "Financeiro";
    case "Equipe":
    case "Cerimonialistas":
      return "Equipe";
    default:
      return "Outras";
  }
}

// ------------------------------------------------------------------
// Origem e aparelho (os mesmos nomes da tela Contas de antes)
// ------------------------------------------------------------------

/** utm_source/utm_medium → como o dono fala. */
export function canalDaOrigem(source: string | null, medium: string | null, gclid: boolean): string {
  const s = (source ?? "").toLowerCase();
  const m = (medium ?? "").toLowerCase();
  const pago = /paid|cpc|ads|anuncio/.test(m);
  if (gclid || s === "google") return pago || gclid ? "Anúncio no Google" : "Google";
  if (s === "ig" || s.includes("instagram")) return pago ? "Anúncio no Instagram" : "Instagram";
  if (s === "fb" || s.includes("facebook")) return pago ? "Anúncio no Facebook" : "Facebook";
  if (s === "an" || s.includes("audience")) return "Anúncio da Meta (rede de parceiros)";
  if (s) return pago ? `Anúncio (${s})` : s;
  return "Sem origem registrada";
}

/** Veio de anúncio pago? (para o CAC pago × orgânico) */
export function veioDeAnuncio(c: ResumoDaConta): boolean {
  const o = c.origem;
  if (!o) return false;
  return canalDaOrigem(o.utm_source, o.utm_medium, o.gclid).startsWith("Anúncio");
}

/** user_agent → o aparelho, sem versão nem modelo. */
export function aparelhoDoAgente(ua: string | null): string | null {
  if (!ua) return null;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "celular Android" : "tablet Android";
  if (/Windows/i.test(ua)) return "computador Windows";
  if (/Macintosh|Mac OS/i.test(ua)) return "Mac";
  return "outro aparelho";
}

/**
 * Cidades digitadas à mão: "Governador valadares" e "Governador Valadares"
 * são a mesma. A chave ignora maiúscula e acento; fica a primeira grafia.
 */
export function cidadesDaConta(c: ResumoDaConta): string[] {
  const vistas = new Map<string, string>();
  for (const cidade of c.eventos.cidades ?? []) {
    const limpa = cidade.trim().replace(/\s+/g, " ");
    if (!limpa) continue;
    const chave = limpa.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    if (!vistas.has(chave)) vistas.set(chave, limpa);
  }
  return [...vistas.values()].slice(0, 3);
}
