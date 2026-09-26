// A trilha da noite (portal v2, 180) — parte pura: os momentos que têm
// música, como achá-los no roteiro, e os links que a tela sabe tocar.

export type MomentoDaTrilha = {
  id: "entrada" | "valsa" | "principe" | "velas" | "parabens" | "balada";
  nome: string;
  /** como achar o momento no roteiro da cerimonialista */
  noRoteiro: RegExp;
  cena: string;
  /** a pergunta de Escolhas que a música também responde (175) */
  pergunta?: string;
  sugestoes: { titulo: string; artista: string }[];
};

export const MOMENTOS_DA_TRILHA: MomentoDaTrilha[] = [
  {
    id: "entrada",
    nome: "Entrada",
    noRoteiro: /entrada/i,
    cena: "As luzes baixam, a porta abre e ela entra.",
    sugestoes: [
      { titulo: "A Thousand Years", artista: "Christina Perri" },
      { titulo: "Enchanted", artista: "Taylor Swift" },
      { titulo: "Lovely", artista: "Billie Eilish" },
    ],
  },
  {
    id: "valsa",
    nome: "Valsa com o pai",
    noRoteiro: /valsa/i,
    cena: "A pista escurece e a valsa começa no centro.",
    pergunta: "Qual é a música da valsa?",
    sugestoes: [
      { titulo: "What a Wonderful World", artista: "Louis Armstrong" },
      { titulo: "My Girl", artista: "The Temptations" },
      { titulo: "Isn't She Lovely", artista: "Stevie Wonder" },
    ],
  },
  {
    id: "principe",
    nome: "Valsa com o príncipe",
    noRoteiro: /pr[ií]ncipe/i,
    cena: "O pai entrega a mão dela ao príncipe, no meio da pista.",
    sugestoes: [
      { titulo: "Perfect", artista: "Ed Sheeran" },
      { titulo: "Can't Help Falling in Love", artista: "Kina Grannis" },
      { titulo: "Photograph", artista: "Ed Sheeran" },
    ],
  },
  {
    id: "velas",
    nome: "As 15 velas",
    noRoteiro: /vela/i,
    cena: "Uma a uma, as quinze pessoas dela acendem as velas.",
    sugestoes: [
      { titulo: "Count on Me", artista: "Bruno Mars" },
      { titulo: "Photograph", artista: "Ed Sheeran" },
      { titulo: "Ainda Bem", artista: "Marisa Monte" },
    ],
  },
  {
    id: "parabens",
    nome: "Parabéns",
    noRoteiro: /parab[eé]ns|bolo/i,
    cena: "O bolo entra com as velas acesas e todos cantam juntos.",
    pergunta: "Qual música vai tocar no parabéns?",
    sugestoes: [
      { titulo: "Happy Birthday", artista: "Stevie Wonder" },
      { titulo: "Parabéns a Você", artista: "Xuxa" },
    ],
  },
  {
    id: "balada",
    nome: "Abertura da balada",
    noRoteiro: /balada|pista|dj/i,
    cena: "Luzes de pista, fumaça baixa: a festa vira balada.",
    sugestoes: [
      { titulo: "Levitating", artista: "Dua Lipa" },
      { titulo: "Envolver", artista: "Anitta" },
      { titulo: "Flowers", artista: "Miley Cyrus" },
    ],
  },
];

export type MusicaEscolhida = {
  titulo: string;
  artista: string | null;
  capa: string | null;
  preview: string | null;
  duracao: number | null;
  link: string | null;
};

/** O tocador embutido para um link colado (Spotify ou YouTube). */
export function embedDoLink(link: string | null): string | null {
  if (!link) return null;
  const sp = link.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/);
  if (sp) return `https://open.spotify.com/embed/${sp[1]}/${sp[2]}`;
  const yt =
    link.match(/^https:\/\/(?:www\.|m\.|music\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/) ??
    link.match(/^https:\/\/youtu\.be\/([\w-]{6,})/) ??
    link.match(/^https:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  return null;
}

/** Só os endereços que o banco aceita (a mesma régua do CHECK da 180). */
export function linkAceito(link: string): boolean {
  return /^https:\/\/(open\.spotify\.com|(www\.|m\.|music\.)?youtube\.com|youtu\.be|music\.apple\.com)\//.test(link);
}

export function mmss(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(Math.round(segundos % 60)).padStart(2, "0")}`;
}
