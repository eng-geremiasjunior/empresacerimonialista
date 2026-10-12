// Os IPs barrados no site inteiro (12/10/2026): os de onde um usuário
// abriu contas em série, com e-mails inventados e um ofensivo ao dono.
// Achados em origem_do_clique (o IP que o cadastro grava, vindo do
// x-forwarded-for da Vercel). Só os EXATOS: os 181.77.x são da TIM
// (celular), mudam a cada conexão e são divididos por milhares de
// clientes — a faixa inteira barraria gente de verdade. Leve de propósito
// (sem node:, sem next/headers): o middleware roda na borda.

export const IPS_BLOQUEADOS: ReadonlySet<string> = new Set([
  "45.161.151.163", // Cabonnet
  "45.161.148.118", // Cabonnet
  "181.77.212.205", // TIM
  "181.77.212.8", // TIM
  "181.77.213.23", // TIM
  "152.255.115.251", // Vivo
  "189.15.121.94", // Algar
]);

/** O IP de quem pede, como a Vercel entrega (o primeiro do x-forwarded-for). */
export function ipDoPedido(h: Headers): string | null {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
