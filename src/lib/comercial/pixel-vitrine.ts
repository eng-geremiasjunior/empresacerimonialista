// O pixel da Meta DA CERIMONIALISTA, na vitrine dela.
//
// Não confundir com o pixel do eOrganizei (lib/marketing.ts), que só roda
// nas telas de marketing do próprio sistema. Este é o dela, com o número
// que ela cadastrou, e as regras são mais estreitas:
//
//   - só na vitrine PUBLICADA, para quem não é da casa (nunca na prévia,
//     no painel, na proposta, no portal ou em link com credencial);
//   - só depois de a pessoa permitir; sem isso, nem o script da Meta é
//     baixado. Recusar depois pausa o envio na hora (consent revoke);
//   - três eventos, disparados só para o pixel dela (trackSingle): a
//     visita, o toque no WhatsApp e o pedido enviado. Nenhum leva nome,
//     telefone, e-mail ou o texto do pedido;
//   - a configuração automática da Meta fica desligada, antes do init. É
//     ELA que, com a "correspondência avançada automática" ligada no
//     Gerenciador de Eventos, lê nome, telefone e e-mail dos campos da
//     página a cada clique em botão. Lido no próprio script da Meta
//     (fbevents.js e o config do pixel, 16/09/2026): o ouvinte de clique e
//     a extração dos campos só rodam com `disableAutoConfig` falso, e essa
//     trava só liga com `fbq("set", "autoConfig", false)` SEM o número do
//     pixel — com o número (a forma da documentação), o script apenas tira
//     aquele pixel da "AutomaticSetup". Chamamos as duas.
//
// Módulo sem React: o link medido e o formulário chamam `eventoDoPixel`,
// que não faz nada quando o pixel não está ligado.

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: unknown;
  loaded: boolean;
  version: string;
};

type JanelaComPixel = Window & {
  fbq?: Fbq;
  _fbq?: Fbq;
  /** o pixel que esta aba iniciou, e se a pessoa o pausou */
  __vtPixel?: { id: string; pausado: boolean };
};

export type DecisaoDoPixel = "sim" | "nao";
export type EventoDoPixel = "Contact" | "Lead";

const CHAVE = (slug: string) => `eorg-pixel:${slug}`;
/** o aviso para a faixa reabrir, vindo do link do rodapé */
export const EVENTO_PREFERENCIAS = "vt-pixel-preferencias";

export function lerDecisao(slug: string): DecisaoDoPixel | null {
  try {
    const v = localStorage.getItem(CHAVE(slug));
    return v === "sim" || v === "nao" ? v : null;
  } catch {
    // sem armazenamento: pergunta de novo a cada visita
    return null;
  }
}

export function gravarDecisao(slug: string, decisao: DecisaoDoPixel): void {
  try {
    localStorage.setItem(CHAVE(slug), decisao);
  } catch {
    /* segue sem guardar */
  }
}

const janela = () => window as JanelaComPixel;

/**
 * O código-base da Meta, reescrito legível e SEM o <noscript> (que
 * dispararia a visita sem permissão): a fila, e o script baixado em
 * seguida.
 */
function instalarBase(): Fbq {
  const w = janela();
  if (w.fbq) return w.fbq;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  return fbq;
}

/** Liga o pixel dela (a pessoa permitiu agora, ou numa visita anterior). */
export function ligarPixel(id: string): void {
  if (typeof window === "undefined") return;
  const w = janela();
  const fbq = instalarBase();
  if (w.__vtPixel?.id === id) {
    if (w.__vtPixel.pausado) {
      fbq("consent", "grant");
      w.__vtPixel.pausado = false;
    }
    return;
  }
  // a trava geral (sem o número) e a do pixel (com o número), antes do init
  fbq("set", "autoConfig", false);
  fbq("set", "autoConfig", false, id);
  fbq("init", id);
  w.__vtPixel = { id, pausado: false };
  fbq("trackSingle", id, "PageView");
}

/** A pessoa recusou depois de ter permitido: nada mais sai desta aba. */
export function pausarPixel(): void {
  if (typeof window === "undefined") return;
  const w = janela();
  if (!w.fbq || !w.__vtPixel || w.__vtPixel.pausado) return;
  w.fbq("consent", "revoke");
  w.__vtPixel.pausado = true;
}

/** Um evento para o pixel dela, se ele estiver ligado. Sem dado nenhum. */
export function eventoDoPixel(evento: EventoDoPixel): void {
  if (typeof window === "undefined") return;
  const w = janela();
  if (!w.fbq || !w.__vtPixel || w.__vtPixel.pausado) return;
  w.fbq("trackSingle", w.__vtPixel.id, evento);
}
