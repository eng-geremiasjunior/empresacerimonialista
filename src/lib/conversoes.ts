import "server-only";

// As conversões que só o SERVIDOR pode contar.
//
// A criação de conta acontece no navegador e o pixel dá conta dela. A
// ASSINATURA não: ela existe quando a Pagar.me aprova, dentro de uma
// action, numa tela do app onde pixel nenhum entra — e pode acontecer
// dias depois do clique no anúncio. Medir isso do navegador é impossível;
// por isso as duas plataformas têm porta de servidor, e é por ela que
// este arquivo fala:
//
//   Meta   → API de Conversões  (graph.facebook.com/<pixel>/events)
//   Google → Measurement Protocol (google-analytics.com/mp/collect)
//
// O QUE SAI DAQUI, e nada além disto:
//   · o nome do evento, o valor e a moeda;
//   · o e-mail em SHA-256 — a plataforma nunca recebe o texto;
//   · os identificadores do CLIQUE que o navegador guardou na criação da
//     conta (fbp/fbc do Meta, client_id do GA4), que são identificadores
//     de sessão de anúncio, não de pessoa;
//   · IP e navegador, que a Meta exige para casar o evento.
//
// O QUE NUNCA SAI: nome, CPF ou CNPJ, telefone, endereço, e absolutamente
// nada de cliente, convidado, fornecedor ou evento. A régua do dono é a
// mesma da tela: dado de terceiro não atravessa a fronteira.
//
// Falha de medição NUNCA derruba a operação: toda função aqui engole o
// próprio erro e registra no log. Assinatura aprovada com pixel fora do ar
// continua sendo assinatura aprovada.

import { createHash } from "node:crypto";

const META_API = "https://graph.facebook.com/v21.0";
const GA_API = "https://www.google-analytics.com/mp/collect";

/** O SHA-256 que as duas plataformas esperam: minúsculas, sem espaço. */
function embaralhar(valor: string | null | undefined): string | null {
  const limpo = valor?.trim().toLowerCase();
  if (!limpo) return null;
  return createHash("sha256").update(limpo).digest("hex");
}

/**
 * A impressão digital do clique, guardada quando a conta foi criada.
 * Sem ela o evento ainda conta, mas a plataforma não sabe de qual anúncio
 * veio — e atribuição sem origem não paga anúncio nenhum.
 */
export type OrigemDoClique = {
  /** cookie _fbp do pixel */
  fbp?: string | null;
  /** cookie _fbc, derivado do fbclid do anúncio */
  fbc?: string | null;
  /** client_id do GA4 (o "1234.5678" do cookie _ga) */
  gaClientId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type Conversao = {
  /** 'conta_criada' | 'assinatura' — o nome de cada lado é traduzido abaixo */
  tipo: "conta_criada" | "assinatura";
  /** e-mail de quem converteu; vira SHA-256 antes de sair */
  email?: string | null;
  valor?: number;
  /** para a plataforma não contar duas vezes o mesmo fato */
  idDoEvento: string;
  origem?: OrigemDoClique;
};

const NOME_META = { conta_criada: "CompleteRegistration", assinatura: "Subscribe" } as const;
const NOME_GA = { conta_criada: "sign_up", assinatura: "purchase" } as const;

/* ------------------------------------------------------------------ */
/* Meta — API de Conversões                                            */
/* ------------------------------------------------------------------ */

async function paraMeta(c: Conversao): Promise<void> {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_TOKEN?.trim();
  if (!pixel || !token) return;

  const o = c.origem ?? {};
  // user_data só com o que é identificador de anúncio ou hash. Campo vazio
  // não vai: a Meta recusa nulo dentro do objeto.
  const usuario: Record<string, unknown> = {};
  const emailHash = embaralhar(c.email);
  if (emailHash) usuario.em = [emailHash];
  if (o.fbp) usuario.fbp = o.fbp;
  if (o.fbc) usuario.fbc = o.fbc;
  if (o.ip) usuario.client_ip_address = o.ip;
  if (o.userAgent) usuario.client_user_agent = o.userAgent;
  if (Object.keys(usuario).length === 0) return; // sem nada para casar, não adianta enviar

  const evento: Record<string, unknown> = {
    event_name: NOME_META[c.tipo],
    event_time: Math.floor(Date.now() / 1000),
    // o mesmo id que o pixel usa no navegador: é assim que a Meta sabe
    // que o evento do servidor e o do navegador são O MESMO fato
    event_id: c.idDoEvento,
    action_source: "website",
    user_data: usuario,
  };
  if (typeof c.valor === "number") {
    evento.custom_data = { currency: "BRL", value: c.valor };
  }

  const r = await fetch(`${META_API}/${pixel}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ data: [evento], access_token: token }),
  });
  if (!r.ok) {
    const corpo = await r.text().catch(() => "");
    console.error("[vela:conversao] meta", r.status, corpo.slice(0, 300));
  }
}

/* ------------------------------------------------------------------ */
/* Google — Measurement Protocol do GA4                                */
/* ------------------------------------------------------------------ */

async function paraGoogle(c: Conversao): Promise<void> {
  const medicao = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const segredo = process.env.GA_API_SECRET?.trim();
  const clientId = c.origem?.gaClientId?.trim();
  // sem client_id o GA4 não sabe a qual sessão (e a qual anúncio) o evento
  // pertence, e a conversão entra como visita nova e órfã
  if (!medicao || !segredo || !clientId) return;

  const evento: Record<string, unknown> = { name: NOME_GA[c.tipo], params: {} as Record<string, unknown> };
  const params = evento.params as Record<string, unknown>;
  params.engagement_time_msec = 1;
  if (typeof c.valor === "number") {
    params.currency = "BRL";
    params.value = c.valor;
    params.transaction_id = c.idDoEvento;
  }

  const r = await fetch(
    `${GA_API}?measurement_id=${encodeURIComponent(medicao)}&api_secret=${encodeURIComponent(segredo)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ client_id: clientId, events: [evento] }),
    }
  );
  // o Measurement Protocol responde 204 sem corpo mesmo quando ignora o
  // evento; erro de rede é o que dá para ver daqui
  if (!r.ok) {
    console.error("[vela:conversao] ga4", r.status);
  }
}

/* ------------------------------------------------------------------ */

/**
 * Manda a conversão para as duas plataformas. Dispara-e-esquece: espera
 * as duas, mas nunca lança. Quem chama não trata erro porque não há erro
 * que mude o que ela deve fazer — a assinatura já foi aprovada.
 */
export async function registrarConversao(c: Conversao): Promise<void> {
  try {
    await Promise.allSettled([paraMeta(c), paraGoogle(c)]);
  } catch (e) {
    console.error("[vela:conversao]", String(e).slice(0, 200));
  }
}
