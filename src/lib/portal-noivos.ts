// O portal dos noivos (desenho v4, 30/09/2026): para quais tipos ele liga,
// o casal a partir do nome do evento, e os destinos do menu. Parte pura:
// roda no servidor e no navegador.

/** Hoje, o casamento. A debutante segue no portal v2. */
export function usaPortalNoivos(tipo: string | null | undefined): boolean {
  return tipo === "casamento";
}

export type Casal = {
  /** "Marina" */
  a: string;
  /** "Téo" (null quando o nome do evento traz uma pessoa só) */
  b: string | null;
};

/**
 * "Marina e Téo" a partir do nome do evento: "Casamento de Marina e Téo",
 * "Exemplo · Marina & Téo", "Marina e Téo". Sem dois nomes, o primeiro
 * nome que houver; sem nome nenhum, null.
 */
export function casalDoNome(nome: string | null | undefined): Casal | null {
  if (!nome) return null;
  const limpo = nome
    .trim()
    .replace(/^exemplo\s*·\s*/i, "")
    .replace(/^(o\s+)?casamento\s+(de|da|do|dos)\s+/i, "")
    .replace(/^casamento\s*[—–·-]\s*/i, "")
    .trim();
  const partes = limpo
    .split(/\s+(?:e|&)\s+|\s*&\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const primeiro = (s: string | undefined) => (s ?? "").split(/\s+/)[0] ?? "";
  const a = primeiro(partes[0]);
  if (!a) return null;
  const b = partes.length > 1 ? primeiro(partes[1]) : null;
  return { a, b: b || null };
}

/** "M&T" (com dois nomes) ou "M" (com um). */
export function iniciaisDoCasal(c: Casal | null): { a: string; b: string | null } {
  if (!c) return { a: "•", b: null };
  return { a: c.a.charAt(0).toUpperCase(), b: c.b ? c.b.charAt(0).toUpperCase() : null };
}

/** Como o papel do acesso aparece embaixo do nome na barra. */
export function papelLegivel(papel: string | null | undefined): string {
  switch (papel) {
    case "noiva":
      return "Noiva";
    case "noivo":
      return "Noivo";
    case "mae":
      return "Mãe";
    case "pai":
      return "Pai";
    case "padrinho":
      return "Padrinho";
    case "madrinha":
      return "Madrinha";
    default:
      return "Família";
  }
}

export type DestinoNoivos = {
  /** o que identifica a tela para permissão e menu ativo */
  chave: string;
  rotulo: string;
  icone: string;
  /** trecho depois de /portal/[id] ("" = Visão geral) */
  seg: string;
  /** só no "Mais" */
  sub?: string;
};

/** O menu de ícones, na ordem do desenho. */
export const MENU_NOIVOS: DestinoNoivos[] = [
  { chave: "visao", rotulo: "Visão geral", icone: "space_dashboard", seg: "" },
  { chave: "convidados", rotulo: "Convidados", icone: "group", seg: "convidados" },
  { chave: "fornecedores", rotulo: "Fornecedores", icone: "storefront", seg: "fornecedores" },
  { chave: "documentos", rotulo: "Documentos", icone: "description", seg: "documentos" },
  { chave: "linha", rotulo: "Linha do tempo", icone: "timeline", seg: "linha-do-tempo" },
  { chave: "musicas", rotulo: "Músicas", icone: "music_note", seg: "trilha" },
  { chave: "agenda", rotulo: "Agenda", icone: "calendar_month", seg: "agenda" },
  { chave: "inspiracoes", rotulo: "Inspirações", icone: "photo_library", seg: "inspiracoes" },
  { chave: "presentes", rotulo: "Presentes", icone: "redeem", seg: "presentes" },
  { chave: "roteiro", rotulo: "Roteiro do dia", icone: "schedule", seg: "cronograma" },
  { chave: "financeiro", rotulo: "Financeiro", icone: "savings", seg: "investimento" },
];

/** O "Mais", em duas colunas. */
export const MAIS_NOIVOS: DestinoNoivos[] = [
  { chave: "guia", rotulo: "Guia de estilo", icone: "palette", seg: "guia-estilo", sub: "Cores, flores e clima" },
  { chave: "escolhas", rotulo: "Escolhas do casal", icone: "favorite", seg: "escolhas", sub: "O que vocês já decidiram" },
  { chave: "convite", rotulo: "Convite", icone: "mail", seg: "site", sub: "Como o convite chega" },
  { chave: "cortejo", rotulo: "Cortejo", icone: "diversity_1", seg: "cortejo", sub: "Quem entra e em que ordem" },
  { chave: "familia", rotulo: "Família e acessos", icone: "family_restroom", seg: "familia", sub: "Quem entra no portal" },
  { chave: "lembretes", rotulo: "Lembretes", icone: "notifications_active", seg: "lembretes", sub: "E-mail e agenda" },
  { chave: "privacidade", rotulo: "Privacidade e dados", icone: "shield_lock", seg: "privacidade", sub: "LGPD e sem internet" },
  { chave: "depois", rotulo: "Depois do casamento", icone: "photo_camera", seg: "depois", sub: "Fotos e agradecimentos" },
];

/**
 * As telas que já existem no portal novo. Tela que ainda não foi feita
 * não aparece no menu (a casa não tem tela "em breve"). Cresce a cada
 * tela entregue.
 */
export const TELAS_PRONTAS = new Set<string>([
  "visao",
  "convidados",
  "fornecedores",
  "documentos",
  "linha",
  "musicas",
  "inspiracoes",
  "presentes",
  "roteiro",
  "financeiro",
  "guia",
  "escolhas",
  "convite",
  "cortejo",
]);

/** A chave da tela a partir do caminho (/portal/<id>/convidados → "convidados"). */
export function chaveDoCaminho(caminho: string, eventoId: string): string | null {
  const base = `/portal/${eventoId}`;
  if (caminho === base || caminho === `${base}/`) return "visao";
  const seg = caminho.slice(base.length + 1).split("/")[0] ?? "";
  if (seg === "hoje") return "hoje";
  const d = [...MENU_NOIVOS, ...MAIS_NOIVOS].find((x) => x.seg === seg);
  return d?.chave ?? null;
}
