// O id da conversão "conta da festa criada" (06/10/2026). O mesmo dos dois
// lados — servidor (API de Conversões, na confirmação) e navegador (pixel,
// em /portal/conta-criada) — para a Meta contar o fato uma vez só. Pelo
// login, e não por evento: abrir o link de novo não é conta nova.
export function idDaContaDaFesta(userId: string): string {
  return `festa:${userId}`;
}
