import "server-only";

// O que barra um cadastro novo (12/10/2026). Um usuário abriu contas em
// série — o mesmo navegador em seis delas, e-mails inventados, até um
// ofensivo ao dono — e cada suspensão liberava o navegador para a próxima.
//
// Barram:
//   · os navegadores dele (o cookie do pixel e o id do Google Analytics
//     que o cadastro guarda em origem_do_clique) — o sinal mais forte;
//   · os IPs exatos de onde ele cadastrou. Só os exatos: os da TIM são de
//     celular, mudam a cada conexão e são divididos por milhares de
//     clientes — bloquear a faixa barraria cerimonialistas de verdade;
//   · e-mail descartável (caixas de 10 minutos) ou de domínio que não
//     recebe e-mail (sem MX), conferido na hora do cadastro.
// A resposta é impessoal e não diz o motivo.

import { promises as dns } from "node:dns";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { COOKIE_ORIGEM } from "@/lib/marketing";
import { COOKIE_IMPRESSAO, IMPRESSOES_BLOQUEADAS, IPS_BLOQUEADOS, NAVEGADORES_BLOQUEADOS } from "@/lib/ips-bloqueados";
import { registrarTentativaBarrada, type MotivoBarrado, type PortaBarrada } from "@/lib/tentativas-barradas";

// a lista mora em ips-bloqueados.ts: o middleware (borda) também a lê
const NAVEGADORES = NAVEGADORES_BLOQUEADOS;


/** caixas descartáveis conhecidas (as dele e as mais comuns) */
const DOMINIOS_DESCARTAVEIS = new Set([
  "18lover.com",
  "uorak.com",
  "tuamaeaquelaursa.com",
  "mailinator.com",
  "yopmail.com",
  "yopmail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "10minutemail.net",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "temp-mail.io",
  "tmpmail.org",
  "tmpmail.net",
  "trashmail.com",
  "trashmail.net",
  "dispostable.com",
  "getnada.com",
  "nada.email",
  "maildrop.cc",
  "mailnesia.com",
  "mintemail.com",
  "throwawaymail.com",
  "fakeinbox.com",
  "emailondeck.com",
  "mohmal.com",
  "moakt.com",
  "mail.tm",
  "inboxkitten.com",
  "spamgourmet.com",
  "burnermail.io",
  "dropmail.me",
  "emailfake.com",
  "fakemail.net",
  "byom.de",
  "mailpoof.com",
  "linshiyouxiang.net",
  "cock.li",
]);

export const MOTIVO_IMPESSOAL = "Não foi possível criar a conta. Se você acredita que isto é um engano, fale com o suporte.";

function dominio(email: string): string {
  return (email.split("@")[1] ?? "").trim().toLowerCase();
}

/** O domínio recebe e-mail? (tem MX). Erro de rede ou demora não recusa. */
async function dominioRecebe(d: string): Promise<boolean> {
  if (!d) return false;
  try {
    const mx = await Promise.race([
      dns.resolveMx(d),
      new Promise<null>((ok) => setTimeout(() => ok(null), 3000)),
    ]);
    if (mx === null) return true;
    return mx.length > 0;
  } catch (e) {
    const codigo = (e as { code?: string }).code;
    // o domínio não existe ou não tem MX; o resto (rede) não recusa
    return !(codigo === "ENOTFOUND" || codigo === "ENODATA");
  }
}

/**
 * O navegador (o cookie do pixel ou o id do Google Analytics) já abriu uma
 * conta que está SUSPENSA? (14/10/2026: ele voltou pelo portal da noiva
 * com um navegador limpo de cookies, mas o próximo cadastro do mesmo
 * navegador fica barrado sem precisar entrar na lista acima.) Falha da
 * leitura nunca recusa.
 */
/** A impressão digital do navegador (ImpressaoDoNavegador), do cookie; só o formato de um sha-256. */
export function impressaoDoCookie(): string | null {
  try {
    const v = cookies().get(COOKIE_IMPRESSAO)?.value ?? "";
    return /^[0-9a-f]{64}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

async function navegadorDeContaSuspensa(
  fbp: string | null | undefined,
  ga: string | null | undefined,
  impressao: string | null = null
): Promise<boolean> {
  const limpo = (v: string | null | undefined) => (v && /^[A-Za-z0-9._-]{6,300}$/.test(v) ? v : null);
  const f = limpo(fbp);
  const g = limpo(ga);
  const imp = impressao && /^[0-9a-f]{64}$/.test(impressao) ? impressao : null;
  if (!f && !g && !imp) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return false;
  try {
    const db = createClient(url, chave, { auth: { persistSession: false } });
    const { data } = await db
      .from("origem_do_clique")
      .select("empresa_id")
      .or([f ? `fbp.eq."${f}"` : null, g ? `ga_client_id.eq."${g}"` : null, imp ? `impressao.eq.${imp}` : null].filter(Boolean).join(","))
      .limit(20);
    const ids = [...new Set(((data ?? []) as { empresa_id: string }[]).map((r) => r.empresa_id))];
    if (!ids.length) return false;
    const { data: empresas } = await db.from("empresas").select("owner_user_id").in("id", ids);
    for (const e of (empresas ?? []) as { owner_user_id: string | null }[]) {
      if (!e.owner_user_id) continue;
      const { data: u } = await db.auth.admin.getUserById(e.owner_user_id);
      const banida = (u?.user as unknown as { banned_until?: string | null } | undefined)?.banned_until;
      if (banida && new Date(banida).getTime() > Date.now()) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * O cadastro pode seguir? Devolve null, ou a frase de recusa (impessoal
 * para o bloqueio; a do e-mail diz o que corrigir). Cada recusa conta no
 * /admin (207), com a porta e o motivo.
 */
export async function recusaDoCadastro(p: {
  porta: PortaBarrada;
  ip: string | null;
  fbp: string | null | undefined;
  ga: string | null | undefined;
  email: string;
}): Promise<string | null> {
  const barrar = async (motivo: MotivoBarrado, frase: string) => {
    await registrarTentativaBarrada(p.porta, motivo, p.ip);
    return frase;
  };
  if (p.ip && IPS_BLOQUEADOS.has(p.ip)) return barrar("ip_bloqueado", MOTIVO_IMPESSOAL);
  if ((p.fbp && NAVEGADORES.has(p.fbp)) || (p.ga && NAVEGADORES.has(p.ga))) return barrar("navegador_barrado", MOTIVO_IMPESSOAL);
  const impressao = impressaoDoCookie();
  if (impressao && IMPRESSOES_BLOQUEADAS.has(impressao)) return barrar("impressao_digital", MOTIVO_IMPESSOAL);
  if (await navegadorDeContaSuspensa(p.fbp, p.ga, impressao)) return barrar("conta_suspensa", MOTIVO_IMPESSOAL);
  const d = dominio(p.email);
  if (DOMINIOS_DESCARTAVEIS.has(d)) return barrar("email_descartavel", "Use um e-mail permanente — endereços temporários não são aceitos.");
  if (!(await dominioRecebe(d))) return barrar("email_sem_caixa", "Este endereço de e-mail não recebe mensagens. Confira o e-mail digitado.");
  return null;
}

/** O navegador de quem está se cadastrando, pelo cookie de origem (o pixel e o Google). */
export function navegadorDoCookie(): { fbp: string | null; ga: string | null } {
  try {
    const cru = cookies().get(COOKIE_ORIGEM)?.value;
    if (!cru) return { fbp: null, ga: null };
    const o = JSON.parse(cru) as Record<string, unknown>;
    return {
      fbp: typeof o.fbp === "string" ? o.fbp.slice(0, 300) : null,
      ga: typeof o.gaClientId === "string" ? o.gaClientId.slice(0, 300) : null,
    };
  } catch {
    return { fbp: null, ga: null };
  }
}
