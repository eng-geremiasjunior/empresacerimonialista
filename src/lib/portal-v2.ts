// O portal v2 (desenho "Portal da Família v2", 25/09/2026): para quais
// tipos de evento ele liga, e de quem é a festa. Parte pura.

/** Hoje só a debutante; a noiva entra quando ele decidir. */
const TIPOS_V2 = new Set(["debutante"]);

export function usaPortalV2(tipo: string | null | undefined): boolean {
  return !!tipo && TIPOS_V2.has(tipo);
}

/**
 * "Júlia", a partir do nome do evento: "Debutante — Júlia Andrade",
 * "15 anos da Júlia", "Exemplo · 15 anos da Júlia". null quando o nome
 * não traz uma pessoa.
 */
export function pessoaDoEvento(nome: string | null | undefined): string | null {
  if (!nome) return null;
  const s = nome
    .trim()
    .replace(/^exemplo\s*·\s*/i, "")
    .replace(/^(debutante|debut|15 anos)\s*[—–-]\s*/i, "")
    .replace(/^(os\s+)?15\s*anos\s+(d[aoe]s?\s+)?/i, "")
    .trim();
  const primeira = s.split(/\s+/)[0] ?? "";
  return /^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(primeira) ? primeira : null;
}

/** "Os 15 anos da Júlia" — o título da festa no portal v2. */
export function tituloDaFesta(nome: string | null | undefined, reserva: string): string {
  const p = pessoaDoEvento(nome);
  return p ? `Os 15 anos da ${p}` : reserva;
}
