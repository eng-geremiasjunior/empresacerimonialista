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
  // 14/10/2026: voltou pelo portal da noiva (conta "caixeta…", nome "[MAP] Ana Teste")
  "189.15.120.187", // Algar, a mesma faixa do 189.15.121.94
  "90.96.179.130", // o da conta "indiar…" de 12/10 (fora do Brasil: VPN)
]);

/**
 * Os navegadores dele (12 e 14/10/2026): o cookie do pixel da Meta (_fbp)
 * e o id do Google Analytics (do _ga), os mesmos que o cadastro guarda em
 * origem_do_clique. Não mudam quando a operadora troca o IP; só somem se
 * ele limpar os cookies ou abrir janela anônima.
 */
export const NAVEGADORES_BLOQUEADOS: ReadonlySet<string> = new Set([
  "fb.2.1790394401143.839815548599568106",
  "fb.2.1791399788970.287078630822181963",
  "fb.2.1791319453552.660017126648083256",
  "fb.2.1791748466848.714113899513589500",
  "fb.2.1791805105937.30482974370629429",
  "1667814391.1790394400",
  "1223678173.1791399788",
  "943226356.1791319454",
  "1003834915.1791748466",
  "2035697192.1791805105",
  // 14/10/2026: o navegador do cadastro pelo portal da noiva
  "fb.2.1791943403919.383406473903415811",
  "1216858638.1791943403",
]);

/**
 * Impressões digitais de navegador barradas (o resumo que
 * components/ImpressaoDoNavegador grava no cookie eo_imp). Começa vazia:
 * a impressão só passou a ser guardada em 14/10/2026; quando ele voltar,
 * a impressão do cadastro dele entra aqui (e a de conta suspensa já é
 * barrada no cadastro, pelo banco).
 */
export const IMPRESSOES_BLOQUEADAS: ReadonlySet<string> = new Set<string>([]);

/** O cookie da impressão digital do navegador. */
export const COOKIE_IMPRESSAO = "eo_imp";

/**
 * O país de quem pede, como a Vercel informa (x-vercel-ip-country: ela
 * sobrescreve o cabeçalho, ninguém o forja). Fora da Vercel (servidor
 * local) não há país: null, e nada se barra.
 */
export function paisDoPedido(h: Headers): string | null {
  return h.get("x-vercel-ip-country")?.toUpperCase() || null;
}

/**
 * Os robôs que precisam ler as páginas PÚBLICAS de fora do Brasil: busca
 * (Google, Bing) e prévia de link (Meta: WhatsApp, Instagram, Facebook).
 * Só leitura (GET): cadastro e entrar são POST e continuam barrados.
 */
export function ehRoboDeBuscaOuPrevia(userAgent: string | null): boolean {
  return /(googlebot|google-inspectiontool|adsbot-google|storebot-google|bingbot|facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|twitterbot|linkedinbot|telegrambot|applebot|slackbot)/i.test(
    userAgent ?? ""
  );
}

/** A marca que o site deixa no navegador barrado: continua barrado com outro IP. */
export const COOKIE_BARRADO = "eo_bl";

/** O navegador de quem pede, pelos cookies: _fbp inteiro e o id do _ga (os dois últimos números). */
export function navegadorDoPedido(cookie: (nome: string) => string | undefined): { fbp: string | null; ga: string | null } {
  const fbp = cookie("_fbp") ?? null;
  const ga = (cookie("_ga") ?? "").split(".").slice(-2).join(".") || null;
  return { fbp, ga };
}

/** O IP de quem pede, como a Vercel entrega (o primeiro do x-forwarded-for). */
export function ipDoPedido(h: Headers): string | null {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
