import "server-only";

// Quem convida, quando o evento não tem nome.
//
// As consultas públicas do convite devolvem "os noivos" (092, 094, 095) ou
// "os anfitriões" (128, 129) quando o evento está sem nome, e o convite
// saía "o casamento de os noivos". Aqui, no servidor, o nome da cliente do
// evento entra no lugar — sem migração, e sem nada novo atravessar para o
// navegador além do nome que o convite já mostraria.
//
// Só nos tipos em que quem contrata é quem está sendo celebrado. Na
// debutante, no aniversário, no batizado e no chá revelação, quem contrata
// costuma ser a mãe ou o pai: o nome dela no convite seria o de outra
// pessoa. Aí o convite fica sem nome ("os 15 anos"), que é verdade.

import { createClient } from "@supabase/supabase-js";
import { temNome } from "@/lib/rsvp-convite";

const CLIENTE_E_QUEM_CELEBRA = new Set(["casamento", "bodas", "formatura", "corporativo"]);

type Busca =
  | { eventoId: string }
  | { rsvpHash: string }
  | { conviteHash: string }
  /** o endereço do site: o slug (atual ou antigo) ou o hash do link do evento */
  | { siteRef: string };

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

type Db = NonNullable<ReturnType<typeof servico>>;

async function idDoEvento(db: Db, busca: Busca): Promise<string | null> {
  if ("eventoId" in busca) return busca.eventoId;
  if ("conviteHash" in busca) {
    const { data } = await db.from("evento_convidado").select("event_id").eq("hash", busca.conviteHash).maybeSingle();
    return (data as { event_id?: string } | null)?.event_id ?? null;
  }
  const hash = "rsvpHash" in busca ? busca.rsvpHash : busca.siteRef;
  if ("siteRef" in busca) {
    const { data } = await db.from("site_slugs").select("event_id").eq("slug", busca.siteRef).maybeSingle();
    const doSlug = (data as { event_id?: string } | null)?.event_id;
    if (doSlug) return doSlug;
  }
  const { data } = await db.from("events").select("id").eq("rsvp_hash", hash).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

/**
 * O nome para o convite: o do evento, quando existe; senão o da cliente
 * (nos tipos acima); senão vazio — e a frase do convite para antes do "de"
 * (conviteCom, em rsvp-convite).
 */
export async function anfitrioesDoConvite(
  anfitrioes: string | null | undefined,
  busca: Busca
): Promise<string> {
  if (temNome(anfitrioes)) return anfitrioes!.trim();
  try {
    const db = servico();
    if (!db) return "";
    const eventoId = await idDoEvento(db, busca);
    if (!eventoId) return "";
    const { data } = await db.from("events").select("type, clients(name)").eq("id", eventoId).maybeSingle();
    const ev = data as { type?: string; clients?: { name?: string | null } | { name?: string | null }[] | null } | null;
    if (!ev?.type || !CLIENTE_E_QUEM_CELEBRA.has(ev.type)) return "";
    const cliente = Array.isArray(ev.clients) ? ev.clients[0] : ev.clients;
    return cliente?.name?.trim() ?? "";
  } catch {
    return "";
  }
}
