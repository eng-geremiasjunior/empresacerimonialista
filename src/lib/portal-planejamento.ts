// O planejamento da noiva que abriu a conta sozinha (04/10/2026). Puro:
// importável no servidor e no navegador.
//
// Pedido dele: "menos técnico, mais visual e mais fácil de lembrar". Os
// 17 assuntos do método viram 9 capítulos com nome curto e uma foto cada
// — por baixo, as MESMAS decisões do método (evento_objetivo /
// evento_decisao), que passam inteiras para a cerimonialista se a noiva
// convidar uma. O capítulo é só a forma de mostrar.
//
// O assunto entra no capítulo pelo CÓDIGO do método (metodo_objetivo.
// codigo), não pelo nome — o nome é texto, o código é a chave do seed.
// Assunto sem código conhecido (criado à mão) cai em "Outros".

export type Capitulo = {
  id: string;
  nome: string;
  /** o que tem dentro, na voz dela */
  sub: string;
  /** os códigos do método que entram aqui, na ordem */
  codigos: string[];
  /** Material Symbols — só os que a fonte do portal tem (o subconjunto de
   *  src/fontes/noivos: igreja, avião e prédio NÃO estão lá) */
  icone: string;
  /** o tom do cartão enquanto a foto não chega */
  tom: string;
};

export const CAPITULOS: Capitulo[] = [
  { id: "comeco", nome: "O começo", sub: "O formato, os convidados e o orçamento", codigos: ["estrutura"], icone: "event", tom: "#e9ae88" },
  { id: "lugar", nome: "O lugar", sub: "O espaço, a estrutura e o plano B", codigos: ["espaco", "infra"], icone: "map", tom: "#b9c6bc" },
  { id: "sim", nome: "O sim", sub: "A igreja, o celebrante e o cartório", codigos: ["cerimonia", "celebrante", "civil"], icone: "favorite", tom: "#f1d3c1" },
  { id: "festa", nome: "A festa", sub: "Buffet, bebidas, música, bolo e doces", codigos: ["buffet", "musica", "doces"], icone: "restaurant", tom: "#e8c9a6" },
  { id: "decoracao", nome: "A decoração", sub: "Flores e o clima do lugar", codigos: ["decoracao"], icone: "local_florist", tom: "#d9cbd6" },
  { id: "look", nome: "O look", sub: "Vestido, beleza, noivo e padrinhos", codigos: ["noiva", "noivo"], icone: "checkroom", tom: "#ecd2cc" },
  { id: "fotos", nome: "As fotos", sub: "Fotógrafo e vídeo", codigos: ["foto"], icone: "photo_camera", tom: "#cdd6d4" },
  { id: "convidados", nome: "Os convidados", sub: "A lista, os convites e a confirmação", codigos: ["convidados", "papelaria"], icone: "group", tom: "#dfe7dc" },
  { id: "antes-e-depois", nome: "Antes e depois", sub: "Noivado, chá, despedida e lua de mel", codigos: ["satelites", "lua_mel"], icone: "celebration", tom: "#d3e0e6" },
];

export const OUTROS: Capitulo = {
  id: "outros",
  nome: "Outros",
  sub: "O que vocês acrescentaram",
  codigos: [],
  icone: "add_circle",
  tom: "#e6e1d8",
};

/** O nome de cada assunto dentro do capítulo, sem o jeito de sistema. */
const NOME_DO_ASSUNTO: Record<string, string> = {
  estrutura: "O começo",
  espaco: "O espaço",
  infra: "Estrutura e logística",
  cerimonia: "A cerimônia",
  celebrante: "O celebrante",
  civil: "O cartório",
  buffet: "Buffet e bebidas",
  musica: "Música",
  doces: "Bolo, doces e lembrancinhas",
  decoracao: "Decoração e flores",
  noiva: "A noiva",
  noivo: "O noivo e os padrinhos",
  foto: "Foto e vídeo",
  convidados: "A lista e a confirmação",
  papelaria: "Os convites",
  satelites: "Noivado, chá e despedida",
  lua_mel: "A lua de mel",
};

export function nomeDoAssunto(codigo: string | null, nomeDoMetodo: string): string {
  return (codigo && NOME_DO_ASSUNTO[codigo]) || nomeDoMetodo;
}

/** O capítulo de um assunto, pelo código do método. */
export function capituloDoCodigo(codigo: string | null): Capitulo {
  return CAPITULOS.find((c) => codigo !== null && c.codigos.includes(codigo)) ?? OUTROS;
}

/** As fotos dos capítulos que já chegaram (public/planejamento/<id>.webp). */
export const FOTOS_DO_PLANEJAMENTO = new Set<string>([]);

export function fotoDoCapitulo(id: string): string | null {
  return FOTOS_DO_PLANEJAMENTO.has(id) ? `/planejamento/${id}.webp` : null;
}

// ------------------------------------------------------------ o tempo

function diaComoNumero(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d) / 86_400_000;
}

/**
 * O prazo na voz do portal: nunca tempo negativo nem cobrança (o método
 * comprime prazos e quem entra agora acharia metade "vencida" sem ter
 * feito nada de errado). O que já passou é "para agora".
 * `hoje` vem do servidor (hojeBR): o relógio do navegador não entra.
 */
export function prazoDaNoiva(prazo: string | null, hoje: string): string | null {
  if (!prazo) return null;
  const dias = diaComoNumero(prazo) - diaComoNumero(hoje);
  if (dias <= 0) return "para agora";
  if (dias === 1) return "para amanhã";
  if (dias < 14) return `em ${dias} dias`;
  if (dias < 60) return `em ${Math.round(dias / 7)} semanas`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? "em 1 mês" : `em ${meses} meses`;
}

/**
 * O prazo pede atenção agora? Até 31 dias — o fim da faixa "em 4
 * semanas", para duas decisões com o mesmo texto não ganharem cores
 * diferentes. O resto fica em cinza: a cor é só para o que está perto.
 */
export function prazoPerto(prazo: string | null, hoje: string): boolean {
  if (!prazo) return false;
  return diaComoNumero(prazo) - diaComoNumero(hoje) <= 31;
}

/** Ordem de urgência: com prazo primeiro (o mais perto antes), sem prazo no fim. */
export function porPrazo<T extends { prazoPrevisto: string | null; ordem: number }>(a: T, b: T): number {
  if (a.prazoPrevisto && b.prazoPrevisto) return a.prazoPrevisto.localeCompare(b.prazoPrevisto) || a.ordem - b.ordem;
  if (a.prazoPrevisto) return -1;
  if (b.prazoPrevisto) return 1;
  return a.ordem - b.ordem;
}
