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
import { COOKIE_ORIGEM } from "@/lib/marketing";
import { IPS_BLOQUEADOS } from "@/lib/ips-bloqueados";

const NAVEGADORES = new Set([
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
]);


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
 * O cadastro pode seguir? Devolve null, ou a frase de recusa (impessoal
 * para o bloqueio; a do e-mail diz o que corrigir).
 */
export async function recusaDoCadastro(p: {
  ip: string | null;
  fbp: string | null | undefined;
  ga: string | null | undefined;
  email: string;
}): Promise<string | null> {
  if (p.ip && IPS_BLOQUEADOS.has(p.ip)) return MOTIVO_IMPESSOAL;
  if ((p.fbp && NAVEGADORES.has(p.fbp)) || (p.ga && NAVEGADORES.has(p.ga))) return MOTIVO_IMPESSOAL;
  const d = dominio(p.email);
  if (DOMINIOS_DESCARTAVEIS.has(d)) return "Use um e-mail permanente — endereços temporários não são aceitos.";
  if (!(await dominioRecebe(d))) return "Este endereço de e-mail não recebe mensagens. Confira o e-mail digitado.";
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
