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

/** O nome do cookie que carrega a origem do clique até a assinatura. */
export const COOKIE_ORIGEM = "eorg_origem";

function cookie(nome: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * A impressão digital do clique, no momento em que a conta nasce.
 *
 * Ela só existe no navegador e só agora: os cookies são do pixel e da tag,
 * e os parâmetros vêm da URL do anúncio. A assinatura vai acontecer
 * depois — no servidor, às vezes dias depois —, e sem isto guardado a
 * plataforma conta a venda mas não sabe de qual anúncio ela veio.
 *
 * Guarda num cookie próprio, de 90 dias, porque é o único carregador que
 * atravessa a sessão: entre criar a conta e assinar pode haver um logout,
 * um e-mail de confirmação e outro dia.
 *
 * Nada aqui identifica pessoa: identifica navegador e campanha.
 */
export function guardarOrigemDoClique(): void {
  if (typeof document === "undefined") return;
  try {
    const url = new URLSearchParams(window.location.search);
    const dados = {
      fbp: cookie("_fbp"),
      // o _fbc só existe se a pessoa veio de um anúncio; quando não existe,
      // dá para montá-lo a partir do fbclid da URL, no formato da Meta
      fbc:
        cookie("_fbc") ??
        (url.get("fbclid") ? `fb.1.${Date.now()}.${url.get("fbclid")}` : null),
      // o cookie _ga é "GA1.1.<client_id>" — o client_id é o par final
      gaClientId: cookie("_ga")?.split(".").slice(-2).join(".") ?? null,
      gclid: url.get("gclid"),
      utm_source: url.get("utm_source"),
      utm_medium: url.get("utm_medium"),
      utm_campaign: url.get("utm_campaign"),
    };
    if (!Object.values(dados).some(Boolean)) return;
    const noventaDias = 90 * 24 * 60 * 60;
    document.cookie =
      `${COOKIE_ORIGEM}=${encodeURIComponent(JSON.stringify(dados))};` +
      `path=/;max-age=${noventaDias};SameSite=Lax`;
  } catch {
    // sem cookie a conta continua sendo criada; só a atribuição se perde
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
