// Medição de anúncio: a tag do Google e o pixel da Meta.
//
// ONDE ELES PODEM ENTRAR — e esta é a regra mais importante do arquivo.
//
// Só nas telas de marketing: a porta de entrada (/login, onde a conta é
// criada), /planos, /termos e /privacidade. Em NENHUMA outra.
//
// O motivo não é preferência, é credencial: no portal da cliente, no
// convite do convidado, no link do fornecedor, no guia, no posto da
// recepção, na proposta e na entrada do QR, o HASH VIAJA NA URL e o hash
// É a credencial. Script de terceiro nessas páginas manda o endereço
// inteiro para o servidor dele (page_location no GA, o referrer no
// pixel) — e quem tivesse acesso àquele painel teria acesso ao evento de
// uma cliente. Além do problema de LGPD, com a cerimonialista como
// controladora e nós como operador, é uma porta que não se abre por
// conveniência de marketing.
//
// Por isso a lista abaixo é de PERMISSÃO, não de bloqueio: rota nova
// nasce sem medição, e só entra aqui quem for olhada uma a uma.
//
// DUAS TELAS, e nenhuma a mais (dono, 06/09/2026). Começou em /login
// apenas — "antes da cliente ter qualquer acesso" —, e /planos entrou
// quando ele decidiu transformá-la na página de destino do anúncio, com
// a oferta e a criação de conta no fim.
//
// As duas cabem pelo mesmo teste, que é o único que vale aqui: **o
// endereço delas não carrega credencial**. É por isso que /portal,
// /confirmar, /c, /guia, /fornecedor, /recepcao, /entrada e /orcamento
// nunca entram — não por serem menos importantes para a venda, mas
// porque o hash na URL É a chave de acesso.

/** As telas onde a medição pode rodar. Comparação exata, sem prefixo. */
const TELAS_DE_MARKETING = new Set(["/login", "/planos"]);

/**
 * A tela é a da oferta? Só ela dispara "viu o conteúdo" — o evento que
 * separa quem chegou de quem leu a proposta. Em /login isso não faz
 * sentido: quem está lá já decidiu entrar.
 */
export function telaDaOferta(pathname: string): boolean {
  return pathname === "/planos";
}

export function telaDeMarketing(pathname: string): boolean {
  return TELAS_DE_MARKETING.has(pathname);
}

/**
 * Os dois identificadores. São públicos por natureza (vão para o
 * navegador de qualquer visitante), então vivem em NEXT_PUBLIC_ — o que
 * não os torna menos configuráveis: sem eles, nada carrega, e a tela
 * funciona igual.
 */
export function idDoGoogle(): string | null {
  const v = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return v && /^G-[A-Z0-9]+$/i.test(v) ? v : null;
}

export function idDoPixelMeta(): string | null {
  const v = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  return v && /^\d{6,20}$/.test(v) ? v : null;
}

/* ------------------------------------------------------------------ */
/* Os eventos                                                          */
/* ------------------------------------------------------------------ */

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    fbq?: Fbq;
  }
}

/**
 * A conversão que importa: a conta foi criada.
 *
 * É este evento que o anúncio otimiza — sem ele, a Meta gasta o dia
 * inteiro procurando clique, não cliente. Dispara UMA vez, no sucesso do
 * cadastro, e nunca leva e-mail, nome ou qualquer dado de pessoa: só o
 * fato. O que a plataforma precisa saber é que aconteceu, não com quem.
 */
export function contaCriada(): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "sign_up", { method: "email" });
    window.fbq?.("track", "CompleteRegistration");
  } catch {
    // medição nunca derruba cadastro: se o bloqueador de anúncio comeu o
    // script, a conta continua sendo criada e ninguém fica sabendo disso
    // pela tela de erro
  }
}

/** Ela abriu o formulário de assinatura, com um plano escolhido. */
export function assinaturaIniciada(plano: string, valor: number): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "begin_checkout", {
      currency: "BRL",
      value: valor,
      items: [{ item_id: plano }],
    });
    window.fbq?.("track", "InitiateCheckout", { currency: "BRL", value: valor });
  } catch {
    /* idem */
  }
}

/** A assinatura foi aprovada pela operadora. */
export function assinaturaFeita(plano: string, valor: number): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "purchase", {
      currency: "BRL",
      value: valor,
      transaction_id: plano + ":" + Date.now(),
      items: [{ item_id: plano }],
    });
    window.fbq?.("track", "Subscribe", { currency: "BRL", value: valor });
  } catch {
    /* idem */
  }
}
