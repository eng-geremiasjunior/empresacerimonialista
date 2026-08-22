// Núcleo da tela de Fornecedores. Puro: recebe as linhas já lidas do
// banco e devolve o que mostrar. Nada de Supabase, nada de fetch.
//
// A tela é consultada dezenas de vezes por dia para responder UMA
// pergunta — "preciso de um DJ em SP que eu já usei" — e permitir a ação
// seguinte sem trocar de tela. Por isso a busca é a peça principal e o
// filtro é secundário: quem sabe o nome digita, quem não sabe filtra.
//
// Tudo aqui roda no cliente, a cada tecla. Sem debounce, sem ida ao
// servidor: o servidor manda a lista inteira uma vez (teto de 2000) e
// daqui em diante quem filtra é a máquina de quem está olhando.

import { categoriaLabel, type FaixaPreco, type StatusFornecedor } from "@/lib/fornecedores-shared";

/** Uma linha da tela, com tudo que a tabela e o painel precisam. */
export type FornecedorLinha = {
  id: string;
  nome: string;
  categorias: string[];
  cidade: string | null;
  /** o número que a ação de WhatsApp usa: whatsapp, e na falta dele o telefone */
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  endereco: string | null;
  descricao: string | null;
  faixaPreco: FaixaPreco | null;
  status: StatusFornecedor;
  /** eventos aos quais está vinculado (roteiro_links) */
  eventos: number;
  /** data do evento mais recente, yyyy-MM-dd; null quando nunca foi usado */
  ultimoUso: string | null;
  /** média por evento em que houve lançamento; null quando não há dinheiro registrado */
  ticketMedio: number | null;
  /** total lançado no Financeiro com este fornecedor */
  totalGasto: number;
  /**
   * Está escalado em algum evento aberto sem contrato assinado.
   * Contrato é por empresa/evento/solicitação — não existe contrato "do
   * fornecedor" solto —, então isto é uma leitura OPERACIONAL: o que
   * ainda dá retrabalho no fechamento, não quem nunca assinou nada.
   */
  semContrato: boolean;
  /** os 3 eventos mais recentes, do mais novo para o mais velho */
  historico: ItemHistorico[];
};

/**
 * O estado de pagamento de um evento com este fornecedor. É a ÚNICA cor da
 * tela — a especificação reserva matiz para isto, e a palavra vai junto da
 * pílula para o estado nunca depender só de cor.
 */
export type EstadoPagamento =
  | "pago"
  | "aguardando"
  | "vence em breve"
  | "atrasado"
  | "sem valor";

export type ItemHistorico = {
  eventId: string;
  evento: string;
  /** yyyy-MM-dd */
  data: string;
  estado: EstadoPagamento;
};

/** Tom da pílula por estado. Nomes dos tokens que já existem no sistema. */
export const TOM_PAGAMENTO: Record<EstadoPagamento, { fg: string; bg: string }> = {
  pago: { fg: "var(--state-ok)", bg: "var(--state-ok-bg)" },
  atrasado: { fg: "var(--state-late)", bg: "var(--state-late-bg)" },
  "vence em breve": { fg: "var(--state-wait)", bg: "var(--state-wait-bg)" },
  aguardando: { fg: "var(--cinza-3)", bg: "var(--nevoa)" },
  "sem valor": { fg: "var(--cinza-2)", bg: "var(--nevoa)" },
};

export type Visao =
  | "todos"
  | "favoritos"
  | "ano"
  | "sem_contrato"
  | "nao_contratar";

export type Filtros = {
  q: string;
  visao: Visao;
  categoria: string | null;
};

export const FILTROS_VAZIOS: Filtros = { q: "", visao: "todos", categoria: null };

export const VISAO_LABELS: Record<Visao, string> = {
  todos: "Todos",
  favoritos: "Favoritos",
  ano: "Usei este ano",
  sem_contrato: "Sem contrato",
  // O banco guarda 'bloqueado'; o produto fala em ação, não em bloqueio —
  // o sistema sugere, nunca trava. Mesma escolha da 026.
  nao_contratar: "Não contratar",
};

export const ORDEM_VISOES: Visao[] = [
  "todos",
  "favoritos",
  "ano",
  "sem_contrato",
  "nao_contratar",
];

/* ---------------------------------------------------------------- busca */

/**
 * Caixa e acento não podem separar "São Paulo" de "sao paulo": quem digita
 * com pressa digita sem acento.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** O texto que a busca varre: nome, categorias, cidade e telefone. */
function alvoDaBusca(f: FornecedorLinha): string {
  const cats = f.categorias.flatMap((c) => [c, categoriaLabel(c)]);
  return normalizar(
    [f.nome, ...cats, f.cidade ?? "", f.telefone ?? ""].join(" ")
  );
}

/* ---------------------------------------------------------------- faixa */

const NIVEL: Record<FaixaPreco, number> = {
  economico: 1,
  intermediario: 2,
  premium: 3,
};

const ROTULO_NIVEL = ["não informada", "baixa", "média", "alta"];

/** 0 = não informada, 1..3 = baixa/média/alta. É o que o medidor desenha. */
export function nivelFaixa(faixa: FaixaPreco | null): number {
  return faixa ? NIVEL[faixa] : 0;
}

export function rotuloFaixa(faixa: FaixaPreco | null): string {
  return ROTULO_NIVEL[nivelFaixa(faixa)];
}

/* ----------------------------------------------------------------- data */

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** yyyy-MM-dd -> "mar/26". Cabe em 74px e continua legível. */
export function mesAno(iso: string | null): string {
  if (!iso) return "—";
  const [a, m] = iso.split("-");
  const mes = MESES[Number(m) - 1];
  if (!mes) return "—";
  return `${mes}/${a.slice(2)}`;
}

/* -------------------------------------------------------------- filtros */

function passaNaVisao(
  f: FornecedorLinha,
  visao: Visao,
  anoCorrente: number
): boolean {
  switch (visao) {
    case "favoritos":
      return f.status === "favorito";
    case "nao_contratar":
      return f.status === "bloqueado";
    case "sem_contrato":
      return f.semContrato;
    case "ano":
      return f.ultimoUso !== null && Number(f.ultimoUso.slice(0, 4)) === anoCorrente;
    default:
      return true;
  }
}

/**
 * Visão, categoria e busca combinam por E lógico. A ordem importa para o
 * custo: as duas primeiras são comparações baratas e derrubam a maior
 * parte antes da normalização de texto, que é a cara.
 */
export function filtrar(
  linhas: FornecedorLinha[],
  filtros: Filtros,
  anoCorrente: number
): FornecedorLinha[] {
  const q = normalizar(filtros.q.trim());
  return linhas.filter((f) => {
    if (!passaNaVisao(f, filtros.visao, anoCorrente)) return false;
    if (filtros.categoria && !f.categorias.includes(filtros.categoria)) return false;
    if (!q) return true;
    return alvoDaBusca(f).includes(q);
  });
}

/** Contagem ao vivo de cada visão — sobre a lista inteira, não a filtrada. */
export function contarVisoes(
  linhas: FornecedorLinha[],
  anoCorrente: number
): Record<Visao, number> {
  const r = {} as Record<Visao, number>;
  for (const v of ORDEM_VISOES) {
    r[v] = linhas.filter((f) => passaNaVisao(f, v, anoCorrente)).length;
  }
  return r;
}

/**
 * Categorias em uso, com contagem, já ordenadas: as mais usadas primeiro,
 * e o alfabeto desempata. Uma lista alfabética de trinta categorias faz
 * ela caçar; a mais usada no topo resolve na primeira olhada.
 */
export function contarCategorias(
  linhas: FornecedorLinha[]
): { slug: string; label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const f of linhas) {
    for (const c of f.categorias) m.set(c, (m.get(c) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([slug, count]) => ({ slug, label: categoriaLabel(slug), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
}

/* -------------------------------------------------------------- contexto */

export function temFiltro(f: Filtros): boolean {
  return f.visao !== "todos" || f.categoria !== null || f.q.trim() !== "";
}

/**
 * "14 fornecedores · buffet · favoritos · «vila»" — o resumo do que está
 * na tela. Sem ele, uma lista curta parece cadastro pequeno em vez de
 * filtro apertado.
 */
export function linhaDeContexto(n: number, f: Filtros): string {
  const partes: string[] = [];
  if (f.categoria) partes.push(categoriaLabel(f.categoria).toLowerCase());
  if (f.visao !== "todos") partes.push(VISAO_LABELS[f.visao].toLowerCase());
  const q = f.q.trim();
  if (q) partes.push(`“${q}”`);

  const cabeca = `${n} ${n === 1 ? "fornecedor" : "fornecedores"}`;
  return partes.length > 0 ? `${cabeca} · ${partes.join(" · ")}` : cabeca;
}

/**
 * O aviso acima da tabela. Volta null quando não há o que avisar OU
 * quando a visão já é a dos pendentes — repetir na tela o que a tela já
 * está mostrando é ruído.
 */
export function avisoDeContrato(
  linhas: FornecedorLinha[],
  visao: Visao
): string | null {
  if (visao === "sem_contrato") return null;
  const n = linhas.filter((f) => f.semContrato).length;
  if (n === 0) return null;
  return n === 1
    ? "1 fornecedor escalado sem contrato assinado. Resolver agora evita retrabalho no fechamento."
    : `${n} fornecedores escalados sem contrato assinado. Resolver agora evita retrabalho no fechamento.`;
}

/* ------------------------------------------------------------ exportação */

/** A linha do CSV. Ordem fixa: é contrato com quem abre a planilha. */
export const COLUNAS_CSV = [
  "Nome",
  "Categorias",
  "Cidade",
  "Telefone",
  "E-mail",
  "CPF/CNPJ",
  "Faixa de preço",
  "Situação",
  "Eventos",
  "Último uso",
  "Total gasto",
  "Ticket médio",
] as const;
