// As contas da casa — do dono e da vitrine de vídeo.
//
// Elas existem no mesmo banco que as clientes, e não podem entrar no que
// é medido nem receber o que é feito para cliente: conversão de anúncio,
// e-mail de teste grátis. Um lugar só decide quem é da casa.
//
// Sem process.env de cliente e sem banco: roda em qualquer servidor.

export function ehContaDaCasa(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  if (e.endsWith("@eorganizei.com.br")) return true;
  const donos = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return donos.includes(e);
}
