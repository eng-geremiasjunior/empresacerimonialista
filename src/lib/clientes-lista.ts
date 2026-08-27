// Núcleo PURO da tela de Clientes — nada de banco aqui.
//
// A tela antiga era uma lista estreita de cartões: nome, telefone, uma
// data e um selo. Não respondia pergunta de trabalho nenhuma. As cinco
// perguntas que esta tela responde: quem tem evento chegando, quem
// esfriou, quem já rendeu mais de um evento, quem nunca fechou, e como
// falo com essa pessoa agora.
//
// Duas decisões que evitam campo manual:
//   · RELAÇÃO é derivada dos eventos, não digitada. Campo manual de
//     "status do cliente" envelhece: ninguém volta para atualizar.
//   · ÚLTIMO CONTATO vem de cliente_contato (124), não do último evento
//     criado. A tela antiga confundia os dois e chamava de cliente frio
//     quem ela tinha ligado ontem.

export type Relacao = "lead" | "ativo" | "recorrente" | "concluido";

export type EventoDoCliente = {
  id: string;
  nome: string | null;
  data: string | null; // yyyy-mm-dd
  status: string;
  arquivado: boolean;
};

export type ContatoRegistrado = {
  em: string; // yyyy-mm-dd
  canal: string;
  nota: string | null;
};

export type ClienteLinha = {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  anotacao: string | null;
  /** quando entrou no cadastro — o marco de quem nunca foi contatada */
  cadastradaEm: string;
  eventos: EventoDoCliente[];
  contatos: ContatoRegistrado[];
  /** honorários de assessoria já lançados nos eventos deste cliente */
  contratado: number;
  // derivados (calculados uma vez, em montarLinha)
  relacao: Relacao;
  futuros: number;
  realizados: number;
  ultimoContato: string | null;
  diasSemContato: number | null;
};

export const RELACAO_LABELS: Record<Relacao, string> = {
  lead: "lead",
  ativo: "ativo",
  recorrente: "recorrente",
  concluido: "concluído",
};

export const ORDEM_RELACOES: Relacao[] = [
  "lead",
  "ativo",
  "recorrente",
  "concluido",
];

const VIVO = new Set(["orcamento", "confirmado"]);

/**
 * Evento que não conta para nada: cancelado ou arquivado. A régua é a
 * mesma de queries.ts (eventoMorto) — a tela de Eventos já esconde esses,
 * e Clientes contá-los faria as duas telas discordarem sobre a mesma
 * cliente.
 */
export function eventoMorto(e: EventoDoCliente): boolean {
  return e.status === "cancelado" || e.arquivado;
}

/**
 * Futuro é status vivo E data à frente. Só o status não basta: 'orcamento'
 * é o padrão de todo evento novo e NADA o envelhece (o cron diário só
 * conclui 'confirmado'), então um orçamento de data vencida ficaria
 * "1 futuro" para sempre e a cliente presa em "ativo".
 */
function ehFuturo(e: EventoDoCliente, hoje: string): boolean {
  if (eventoMorto(e)) return false;
  if (!VIVO.has(e.status)) return false;
  return e.data === null || e.data >= hoje;
}

export const DIAS_FRIO = 30;

/**
 * A relação, derivada. A ordem das perguntas importa:
 *   recorrente vence ativo (quem já fez 2 e tem outro marcado continua
 *   sendo a cliente que volta — é essa a informação que muda o trato).
 */
export function derivarRelacao(eventos: EventoDoCliente[], hoje: string): Relacao {
  const vivos = eventos.filter((e) => !eventoMorto(e));
  const realizados = vivos.filter((e) => e.status === "concluido").length;
  const futuros = vivos.filter((e) => ehFuturo(e, hoje)).length;
  if (realizados >= 2) return "recorrente";
  if (futuros > 0) return "ativo";
  if (realizados > 0) return "concluido";
  return "lead";
}

/** Dias entre duas datas ISO, pelas PARTES — sem new Date(iso) e sem fuso. */
export function diasEntre(deIso: string, ateIso: string): number {
  const [a1, m1, d1] = deIso.slice(0, 10).split("-").map(Number);
  const [a2, m2, d2] = ateIso.slice(0, 10).split("-").map(Number);
  const t1 = Date.UTC(a1, m1 - 1, d1);
  const t2 = Date.UTC(a2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}

/** `dd/mm/aa`, `hoje`, `ontem` ou `nunca` — sempre pelas partes da string. */
export function dataCurta(iso: string | null, hoje: string): string {
  if (!iso) return "nunca";
  const dias = diasEntre(iso, hoje);
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

/** `29/04/2027` — data por extenso curta, também pelas partes. */
export function dataBr(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function montarLinha(
  base: Omit<
    ClienteLinha,
    "relacao" | "futuros" | "realizados" | "ultimoContato" | "diasSemContato"
  >,
  hoje: string
): ClienteLinha {
  // eventos vivos: cancelado e arquivado saem de TUDO (contagem, pílula,
  // métrica do painel e valor contratado)
  const vivos = base.eventos.filter((e) => !eventoMorto(e));
  const futuros = vivos.filter((e) => ehFuturo(e, hoje)).length;
  const realizados = vivos.filter((e) => e.status === "concluido").length;
  // contatos chegam ordenados por `em` desc da consulta; não confiar nisso
  const ultimoContato =
    base.contatos.length > 0
      ? base.contatos.reduce((a, c) => (c.em > a ? c.em : a), base.contatos[0].em)
      : null;
  // O relógio do silêncio começa no CADASTRO quando não há contato: quem
  // entrou hoje não pode nascer fria, e sem esse marco o dia em que ela
  // abre a tela pela primeira vez diria "todos esfriaram" — ruído, não
  // condução.
  const desde = ultimoContato ?? base.cadastradaEm.slice(0, 10);
  return {
    ...base,
    eventos: vivos,
    relacao: derivarRelacao(base.eventos, hoje),
    futuros,
    realizados,
    ultimoContato,
    diasSemContato: diasEntre(desde, hoje),
  };
}

export function estaFrio(c: ClienteLinha): boolean {
  // Nunca contatada conta, mas o relógio corre desde o CADASTRO (ver
  // montarLinha) — quem entrou esta semana não aparece aqui.
  return c.diasSemContato !== null && c.diasSemContato > DIAS_FRIO;
}

// ---------------- busca e filtros ----------------

export type Visao =
  | "todos"
  | "evento_futuro"
  | "sem_contato"
  | "recorrentes"
  | "sem_evento";

export type Filtros = {
  q: string;
  visao: Visao;
  relacao: Relacao | null;
};

export const FILTROS_VAZIOS: Filtros = { q: "", visao: "todos", relacao: null };

export const VISAO_LABELS: Record<Visao, string> = {
  todos: "Todos",
  evento_futuro: "Com evento futuro",
  sem_contato: `Sem contato +${DIAS_FRIO}d`,
  recorrentes: "Recorrentes",
  sem_evento: "Sem evento",
};

export const ORDEM_VISOES: Visao[] = [
  "todos",
  "evento_futuro",
  "sem_contato",
  "recorrentes",
  "sem_evento",
];

/** Sem acento e sem caixa: "joao" acha "João". */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Só dígitos — para "3399" achar "(33) 99999-0000". */
function digitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

function passaNaBusca(c: ClienteLinha, q: string): boolean {
  if (!q) return true;
  const alvo = normalizar(q);
  const campos = [c.nome, c.email, c.cidade, ...c.eventos.map((e) => e.nome)]
    .filter(Boolean)
    .map((t) => normalizar(String(t)));
  if (campos.some((t) => t.includes(alvo))) return true;

  // telefone digitado com ou sem máscara
  const numeros = digitos(q);
  if (numeros.length >= 3) {
    const fones = [c.telefone, c.whatsapp].filter(Boolean).map((t) => digitos(String(t)));
    if (fones.some((f) => f.includes(numeros))) return true;
  }
  return false;
}

function passaNaVisao(c: ClienteLinha, visao: Visao): boolean {
  switch (visao) {
    case "evento_futuro":
      return c.futuros > 0;
    case "sem_contato":
      return estaFrio(c);
    case "recorrentes":
      return c.realizados >= 2;
    case "sem_evento":
      return c.eventos.length === 0;
    default:
      return true;
  }
}

export function filtrar(linhas: ClienteLinha[], f: Filtros): ClienteLinha[] {
  return linhas.filter(
    (c) =>
      passaNaBusca(c, f.q) &&
      passaNaVisao(c, f.visao) &&
      (f.relacao === null || c.relacao === f.relacao)
  );
}

/** Contagem de cada visão respeitando busca e relação (E lógico). */
export function contarVisoes(
  linhas: ClienteLinha[],
  f: Filtros
): Record<Visao, number> {
  const base = linhas.filter(
    (c) => passaNaBusca(c, f.q) && (f.relacao === null || c.relacao === f.relacao)
  );
  const out = {} as Record<Visao, number>;
  for (const v of ORDEM_VISOES) out[v] = base.filter((c) => passaNaVisao(c, v)).length;
  return out;
}

/** Contagem de cada relação respeitando busca e visão. */
export function contarRelacoes(
  linhas: ClienteLinha[],
  f: Filtros
): Record<Relacao, number> {
  const base = linhas.filter((c) => passaNaBusca(c, f.q) && passaNaVisao(c, f.visao));
  const out = {} as Record<Relacao, number>;
  for (const r of ORDEM_RELACOES) out[r] = base.filter((c) => c.relacao === r).length;
  return out;
}

export function temFiltro(f: Filtros): boolean {
  return f.q.trim() !== "" || f.visao !== "todos" || f.relacao !== null;
}

export function linhaDeContexto(n: number, f: Filtros): string {
  const partes = [`${n} ${n === 1 ? "cliente" : "clientes"}`];
  if (f.visao !== "todos") partes.push(VISAO_LABELS[f.visao].toLowerCase());
  if (f.relacao) partes.push(RELACAO_LABELS[f.relacao]);
  if (f.q.trim()) partes.push(`"${f.q.trim()}"`);
  return partes.join(" · ");
}

/**
 * O aviso de frios. Some quando a visão já está ativa (ela já está lá) ou
 * quando não há ninguém frio — condução não pode virar ruído permanente.
 */
export function avisoDeFrios(
  linhas: ClienteLinha[],
  f: Filtros
): { texto: string; quantos: number } | null {
  if (f.visao === "sem_contato") return null;
  // MESMA base de contarVisoes: com "ana" na busca, o aviso dizia 6 e a
  // coluna dizia 1, e clicar em Revisar (que preserva a busca) mostrava 1.
  // Dois números para a mesma pergunta, a três centímetros um do outro.
  const frios = contarVisoes(linhas, f).sem_contato;
  if (frios === 0) return null;
  return {
    quantos: frios,
    texto:
      frios === 1
        ? `1 cliente sem contato há mais de ${DIAS_FRIO} dias. Retomar cedo evita perder a próxima data.`
        : `${frios} clientes sem contato há mais de ${DIAS_FRIO} dias. Retomar cedo evita perder a próxima data.`,
  };
}

/** A frase do Copiloto — MESMA fonte do aviso, para não divergirem. */
export function fraseCopiloto(linhas: ClienteLinha[]): string {
  const frios = linhas.filter(estaFrio).length;
  if (frios === 0) return "Nenhum cliente esfriou.";
  return frios === 1
    ? "1 cliente para retomar."
    : `${frios} clientes para retomar.`;
}

// ---------------- exportação ----------------

export const COLUNAS_CSV = [
  "Nome",
  "Telefone",
  "WhatsApp",
  "E-mail",
  "Cidade",
  "Relação",
  "Eventos futuros",
  "Eventos realizados",
  "Último contato",
  "Contratado (R$)",
] as const;

export function linhaCsv(c: ClienteLinha): string[] {
  return [
    c.nome,
    c.telefone ?? "",
    c.whatsapp ?? "",
    c.email ?? "",
    c.cidade ?? "",
    RELACAO_LABELS[c.relacao],
    String(c.futuros),
    String(c.realizados),
    c.ultimoContato ? dataBr(c.ultimoContato) : "nunca",
    c.contratado.toFixed(2).replace(".", ","),
  ];
}
