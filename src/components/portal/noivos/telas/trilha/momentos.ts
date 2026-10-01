// A trilha do casamento (Portal dos Noivos v4, README §8). Parte pura.
//
// O desenho tem 7 momentos; o banco só guarda os que o CHECK da 180 aceita
// (evento_trilha.momento ∈ entrada, valsa, principe, velas, parabens,
// balada — a lista da debutante). Aqui ficam os três do casamento que têm
// o MESMO significado de um desses: a entrada (da noiva), a valsa (a
// primeira dança do casal) e a abertura da pista. Os outros quatro do
// desenho (entrada dos padrinhos, entrada do noivo, alianças, saída dos
// noivos) precisam de uma migração que alargue o CHECK — sem ela, escolher
// daria erro, e a casa não mostra botão que não grava.
//
// As sugestões são as do desenho para cada momento. A "cena" (a frase do
// "Viver o momento") só entra com fonte; o casamento ainda não tem.

export type MomentoDoCasamento = {
  /** o momento no banco (CHECK da 180) */
  id: "entrada" | "valsa" | "balada";
  nome: string;
  /** como achar o momento no roteiro da cerimonialista (para a hora) */
  noRoteiro: RegExp;
  /** a pergunta do método que a música também responde (a folha do DJ lê) */
  pergunta?: string;
  cena?: string;
  sugestoes: { titulo: string; artista: string }[];
};

export const MOMENTOS_DO_CASAMENTO: MomentoDoCasamento[] = [
  {
    id: "entrada",
    nome: "Entrada da noiva",
    noRoteiro: /entrada da noiva|noiva entra/i,
    sugestoes: [
      { titulo: "Can You Feel the Love Tonight", artista: "Elton John" },
      { titulo: "Ave Maria", artista: "Schubert" },
    ],
  },
  {
    id: "valsa",
    nome: "Primeira dança",
    noRoteiro: /primeira dan[çc]a|valsa/i,
    pergunta: "Qual será a música da primeira dança?",
    sugestoes: [{ titulo: "Thinking Out Loud", artista: "Ed Sheeran" }],
  },
  {
    id: "balada",
    nome: "Abertura da pista",
    noRoteiro: /abertura da pista|balada|\bpista\b/i,
    sugestoes: [
      { titulo: "September", artista: "Earth, Wind & Fire" },
      { titulo: "Uptown Funk", artista: "Mark Ronson ft. Bruno Mars" },
    ],
  },
];

/** O que no roteiro não é o momento (o ensaio, a montagem, a chegada). */
const FORA_DO_MOMENTO = /ensaio|montagem|making|prepara|passagem de som|chegada/i;

/** "16:15" pelo roteiro dela; null quando o roteiro não tem o momento. */
export function horaNoRoteiro(
  m: MomentoDoCasamento,
  programa: { titulo: string; hora: string | null }[]
): string | null {
  const achado = programa.find((p) => p.hora && !FORA_DO_MOMENTO.test(p.titulo) && m.noRoteiro.test(p.titulo));
  return achado?.hora?.slice(0, 5) ?? null;
}
