// A conversa com o Google para conectar a conta dela: a URL de
// autorização, a troca do código pela chave de renovação, a renovação do
// acesso e a revogação. Nada aqui toca o banco.
//
// Os escopos são EXATAMENTE os salvos no projeto do Google Cloud
// (22/09/2026, todos "não confidenciais"): pedir um que não está lá faz
// o Google recusar a tela inteira.
//   · calendar.app.created — criar a agenda "eOrganizei" e mexer SÓ nela;
//   · calendar.events.freebusy — ler os horários ocupados (sem título);
//   · openid + userinfo.email — dizer "conectada como fulana@gmail.com".
// O consentimento do Google é granular: ela pode desmarcar o de
// disponibilidade e conectar só a escrita. O retorno confere o que veio.

import "server-only";

import { appUrl } from "@/lib/app-url";

export const ESCOPO_AGENDA = "https://www.googleapis.com/auth/calendar.app.created";
export const ESCOPO_OCUPADO = "https://www.googleapis.com/auth/calendar.events.freebusy";
const ESCOPOS = ["openid", "https://www.googleapis.com/auth/userinfo.email", ESCOPO_AGENDA, ESCOPO_OCUPADO];

/** o nonce da tela do Google: vai no cookie ao sair e volta no `state` (CSRF) */
export const COOKIE_ESTADO = "eorg_google_estado";

export function googleConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function urlDeRetorno(): string {
  return `${appUrl()}/api/google/retorno`;
}

/** A tela do Google. `state` é o nonce que o cookie guarda (CSRF). */
export function urlDeAutorizacao(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: urlDeRetorno(),
    response_type: "code",
    scope: ESCOPOS.join(" "),
    // offline + consent: é o que faz o Google devolver a chave de
    // renovação — sem ela a conexão morre em uma hora
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

type RespostaToken = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

async function token(corpo: Record<string, string>): Promise<RespostaToken> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...corpo,
    }),
    cache: "no-store",
  });
  return (await r.json().catch(() => ({ error: `http_${r.status}` }))) as RespostaToken;
}

export type ChavesDoGoogle = {
  accessToken: string;
  refreshToken: string;
  escopos: string[];
  email: string | null;
};

/** O código que veio na URL de retorno vira as chaves. */
export async function trocarCodigo(code: string): Promise<{ ok: true; chaves: ChavesDoGoogle } | { ok: false; erro: string }> {
  const r = await token({ code, grant_type: "authorization_code", redirect_uri: urlDeRetorno() });
  if (r.error || !r.access_token) return { ok: false, erro: r.error ?? "sem access_token" };
  if (!r.refresh_token) return { ok: false, erro: "sem refresh_token" };
  return {
    ok: true,
    chaves: {
      accessToken: r.access_token,
      refreshToken: r.refresh_token,
      escopos: (r.scope ?? "").split(/\s+/).filter(Boolean),
      email: emailDoIdToken(r.id_token),
    },
  };
}

/**
 * Um acesso novo a partir da chave de renovação. `invalid_grant` é o
 * Google dizendo que a chave morreu (revogada por ela, ou vencida — no
 * modo de teste do app elas vencem em 7 dias): a conexão precisa ser
 * refeita, e nada de tentar de novo.
 */
export async function renovarAcesso(
  refreshToken: string
): Promise<{ ok: true; accessToken: string } | { ok: false; morta: boolean; erro: string }> {
  const r = await token({ refresh_token: refreshToken, grant_type: "refresh_token" });
  if (r.error || !r.access_token) {
    const erro = r.error ?? "sem access_token";
    return { ok: false, morta: erro === "invalid_grant" || erro === "invalid_client", erro };
  }
  return { ok: true, accessToken: r.access_token };
}

/** Desliga a chave do lado do Google. Falhar aqui não impede desconectar aqui. */
export async function revogar(refreshToken: string): Promise<boolean> {
  try {
    const r = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

// O id_token veio direto do endpoint de token do Google, por TLS: aqui
// ele só serve para mostrar o e-mail na tela, então basta ler o miolo.
function emailDoIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const miolo = idToken.split(".")[1] ?? "";
    const json = Buffer.from(miolo.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const email = (JSON.parse(json) as { email?: unknown }).email;
    return typeof email === "string" && email.includes("@") ? email.slice(0, 120) : null;
  } catch {
    return null;
  }
}
