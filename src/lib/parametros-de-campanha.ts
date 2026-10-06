// O que pode seguir num redirecionamento até uma tela com pixel (06/10/2026).
//
// A raiz do casamento. leva a /portal e daí à porta de entrar; antes, cada
// etapa jogava fora o "?…" — o fbclid e as utm do anúncio (e a marca do
// teste de eventos da Meta) não chegavam à porta, onde o pixel lê. Mas o
// pixel manda o endereço INTEIRO à Meta, então não se repassa tudo: um link
// de acesso que caísse na raiz (?code=, ?token_hash=) iria junto. Só os
// parâmetros de campanha, por lista de permissão.

const EXATOS = new Set(["fbclid", "gclid", "gbraid", "wbraid", "ttclid", "msclkid"]);

export function ehParametroDeCampanha(nome: string): boolean {
  const n = nome.toLowerCase();
  return EXATOS.has(n) || n.startsWith("utm_") || n.startsWith("fb") || n.startsWith("_fb");
}

/** "?fbclid=…&utm_source=…" com só o que é de campanha; "" se nada sobrar. */
export function soCampanha(entrada: URLSearchParams | Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams();
  const pares: [string, unknown][] =
    entrada instanceof URLSearchParams ? Array.from(entrada.entries()) : Object.entries(entrada);
  for (const [k, v] of pares) {
    if (typeof v === "string" && ehParametroDeCampanha(k)) q.set(k, v.slice(0, 500));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
