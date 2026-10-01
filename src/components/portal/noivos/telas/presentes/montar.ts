// Presentes do portal dos noivos (desenho v4, README §14). Parte pura:
// os tipos que a tela recebe e a loja a partir do link da lista que o
// casal pôs no site (evento_site.presentes_link). Roda no servidor e no
// navegador.

export type LojaDaLista = {
  /** "Tok&Stok" */
  nome: string;
  /** "tokstok.com.br/lista/marina-e-teo" (o endereço, sem https://) */
  endereco: string;
  url: string;
};

export type PresentesDoCasal = {
  /** a chave Pix do site (quem presenteia paga direto nela) */
  pixChave: string | null;
  /** em nome de quem a chave está (o convidado confere antes de pagar) */
  pixTitular: string | null;
  /** as listas nas lojas; hoje o site guarda um link só */
  lojas: LojaDaLista[];
  /** o site publicado, que mostra a chave e a lista aos convidados */
  linkDoSite: string | null;
};

/** Os nomes que o endereço escreve mal ("tokstok" → "Tok&Stok"). */
const NOMES: Record<string, string> = {
  amazon: "Amazon",
  amzn: "Amazon",
  americanas: "Americanas",
  camicado: "Camicado",
  casar: "Casar.com",
  casasbahia: "Casas Bahia",
  etna: "Etna",
  fastshop: "Fast Shop",
  icasei: "iCasei",
  lejour: "Lejour",
  leroymerlin: "Leroy Merlin",
  magazineluiza: "Magazine Luiza",
  magalu: "Magalu",
  mercadolivre: "Mercado Livre",
  mobly: "Mobly",
  pontofrio: "Pontofrio",
  shopee: "Shopee",
  tokstok: "Tok&Stok",
  westwing: "Westwing",
  zankyou: "Zankyou",
};

/** O que fica no fim do endereço e não é o nome da loja. */
const FINAIS = new Set(["com", "net", "org", "gov", "edu", "app", "site", "store", "shop", "online", "info", "biz"]);

function nomeDaLoja(host: string): string {
  const rotulos = host.split(".").filter(Boolean);
  while (rotulos.length > 1) {
    const ultimo = rotulos[rotulos.length - 1];
    if (ultimo.length === 2 || FINAIS.has(ultimo)) rotulos.pop();
    else break;
  }
  const base = rotulos[rotulos.length - 1] ?? host;
  return (
    NOMES[base] ??
    base
      .split("-")
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ")
  );
}

/** A loja a partir do link salvo no site. Link que não é http(s) não vira loja. */
export function lojaDoLink(bruto: string | null | undefined): LojaDaLista | null {
  const texto = (bruto ?? "").trim();
  if (!/^https?:\/\//i.test(texto)) return null;
  let u: URL;
  try {
    u = new URL(texto);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (!host) return null;
  let caminho = u.pathname.replace(/\/+$/, "");
  try {
    caminho = decodeURIComponent(caminho);
  } catch {
    /* caminho com % solto: fica como veio */
  }
  return { nome: nomeDaLoja(host), endereco: host + caminho, url: u.toString() };
}
