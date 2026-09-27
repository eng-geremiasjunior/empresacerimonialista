// No casamento, a cliente é o casal (27/09/2026, pedido do dono: "é nome
// da noiva e nome do noivo, os outros sistemas são assim"). A tela pede os
// dois; o cadastro guarda o casal num nome só, "Marina e Pedro" — é dele que
// o evento, o portal e as listas tiram de quem é a festa.

/** "Marina", "Pedro" → "Marina e Pedro"; um só, só ele. */
export function juntarCasal(noiva: string, noivo: string): string {
  return [noiva.trim(), noivo.trim()].filter(Boolean).join(" e ");
}

/** "Marina e Pedro" (ou "Marina & Pedro") → ["Marina", "Pedro"]. */
export function separarCasal(nome: string): [string, string] {
  const partes = nome.split(/\s+(?:e|&)\s+/i);
  if (partes.length < 2) return [nome.trim(), ""];
  return [partes[0].trim(), partes.slice(1).join(" e ").trim()];
}
