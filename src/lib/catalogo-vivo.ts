import "server-only";
import { createClient as createServico } from "@supabase/supabase-js";

// O catálogo vivo (02/10/2026, pedido do dono): um link para o Instagram
// em que qualquer pessoa entra nos portais de exemplo e nos modelos de
// site, sem cadastro.
//
// Quem entra é UM login compartilhado, o visitante, com o nível 'vitrine'
// (migração 195) nos eventos de exemplo: vê tudo o que o casal vê e não
// grava nada — o banco descarta qualquer escrita dele. "Evento do
// catálogo" = evento em que o visitante tem esse acesso; nada aqui
// depende de lista fixa de ids.

export const EMAIL_DO_VISITANTE = "visitante@eorganizei.com.br";

function servico() {
  return createServico(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

export type EventoDoCatalogo = { id: string; tipo: string; slug: string | null };

/** Os eventos de exemplo em que o visitante entra, um por tipo. */
export async function eventosDoCatalogo(): Promise<EventoDoCatalogo[]> {
  const db = servico();
  const { data: acessos, error } = await db
    .from("evento_acesso")
    .select("event_id")
    .eq("email", EMAIL_DO_VISITANTE)
    .eq("nivel", "vitrine")
    .eq("status", "ativo");
  if (error || !acessos?.length) return [];
  const ids = acessos.map((a) => (a as { event_id: string }).event_id);
  const [{ data: eventos }, { data: sites }] = await Promise.all([
    db.from("events").select("id, type, created_at").in("id", ids).order("created_at", { ascending: true }),
    db.from("evento_site").select("event_id, slug, publicado").in("event_id", ids),
  ]);
  const slugPor = new Map(
    ((sites ?? []) as { event_id: string; slug: string | null; publicado: boolean }[])
      .filter((s) => s.publicado && s.slug)
      .map((s) => [s.event_id, s.slug])
  );
  const vistos = new Set<string>();
  const lista: EventoDoCatalogo[] = [];
  for (const e of (eventos ?? []) as { id: string; type: string | null }[]) {
    const tipo = e.type ?? "";
    if (!tipo || vistos.has(tipo)) continue;
    vistos.add(tipo);
    lista.push({ id: e.id, tipo, slug: slugPor.get(e.id) ?? null });
  }
  return lista;
}

/** O site deste endereço é de um evento do catálogo? (libera ?modelo=) */
export async function siteEDoCatalogo(slug: string): Promise<boolean> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return false;
  const db = servico();
  const { data: site } = await db.from("evento_site").select("event_id").eq("slug", slug).maybeSingle();
  const eventId = (site as { event_id: string } | null)?.event_id;
  if (!eventId) return false;
  const { data } = await db.rpc("eh_evento_vitrine", { p_event_id: eventId });
  return data === true;
}

/** O evento é do catálogo? (as rotas de RSVP e álbum respondem sem gravar) */
export async function eventoEDoCatalogo(eventId: string | null | undefined): Promise<boolean> {
  if (!eventId) return false;
  const { data, error } = await servico().rpc("eh_evento_vitrine", { p_event_id: eventId });
  // sem a 195 aplicada a função não existe: ninguém é do catálogo
  return !error && data === true;
}

/** O link mágico do visitante, já no portal do evento. null = não deu. */
export async function linkMagicoDoVisitante(): Promise<string | null> {
  const { data, error } = await servico().auth.admin.generateLink({ type: "magiclink", email: EMAIL_DO_VISITANTE });
  const hash = data?.properties?.hashed_token;
  return error || !hash ? null : hash;
}
