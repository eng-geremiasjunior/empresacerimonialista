import "server-only";
import { cache } from "react";
import { createClient as createServico } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { casalDoNome, type Casal } from "@/lib/portal-noivos";

// O que a casca do portal dos noivos lê além do evento: a foto do casal.
//
// A foto é a mesma do site do casamento (evento_site.foto_casal_path, no
// balde das inspirações). O caminho vem pela sessão da família (a RLS diz
// se ela vê a linha); a URL assinada sai do servidor, como na tela do site.

const HORA = 60 * 60;

function servico() {
  return createServico(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i: RequestInfo | URL, x?: RequestInit) => fetch(i, { ...x, cache: "no-store" }) },
  });
}

/**
 * A foto da capa: a do casal no site; sem ela, a capa que a cerimonialista
 * pôs no evento (events.cover_image_url). Quem chama já conferiu o acesso
 * (getEventoDoPortal); a chave de serviço só lê estas duas colunas.
 */
export const getFotoDoCasal = cache(async (eventId: string): Promise<string | null> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("evento_site")
    .select("foto_casal_path")
    .eq("event_id", eventId)
    .maybeSingle();
  const caminho = (data as { foto_casal_path: string | null } | null)?.foto_casal_path;
  const db = servico();
  if (caminho) {
    const { data: assinada } = await db.storage.from("inspiracoes").createSignedUrl(caminho, HORA);
    if (assinada?.signedUrl) return assinada.signedUrl;
  }
  const { data: ev } = await db.from("events").select("cover_image_url").eq("id", eventId).maybeSingle();
  const capa = (ev as { cover_image_url: string | null } | null)?.cover_image_url;
  return capa && /^https:\/\//.test(capa) ? capa : null;
});

/**
 * Os nomes do casal, sem campo próprio no evento. Na ordem:
 *   1. o nome do evento, quando traz os dois ("Ana e Bruno");
 *   2. os acessos de noiva e noivo do portal;
 *   3. o nome da cliente.
 * Só primeiros nomes. Quem chama já conferiu o acesso ao evento.
 */
export const getNomesDoCasal = cache(
  async (eventId: string, nomeDoEvento: string | null): Promise<Casal | null> => {
    const primeiro = (s: string | null | undefined) => (s ?? "").trim().split(/\s+/)[0] || "";
    const doNome = nomeDoEvento && !/^seu evento$/i.test(nomeDoEvento.trim()) ? casalDoNome(nomeDoEvento) : null;
    if (doNome?.b) return doNome;
    const db = servico();
    const { data: acessos } = await db
      .from("evento_acesso")
      .select("nome, papel")
      .eq("event_id", eventId)
      .eq("status", "ativo")
      .in("papel", ["noiva", "noivo"]);
    const lista = (acessos ?? []) as { nome: string | null; papel: string }[];
    const noiva = primeiro(lista.find((x) => x.papel === "noiva")?.nome);
    const noivo = primeiro(lista.find((x) => x.papel === "noivo")?.nome);
    if (noiva && noivo) return { a: noiva, b: noivo };
    if (doNome) return doNome;
    const { data: ev } = await db.from("events").select("client_id").eq("id", eventId).maybeSingle();
    const clientId = (ev as { client_id: string | null } | null)?.client_id;
    if (clientId) {
      const { data: cli } = await db.from("clients").select("name").eq("id", clientId).maybeSingle();
      const nomeDaCliente = (cli as { name: string | null } | null)?.name ?? null;
      // a cliente costuma ser o casal ("Isabelly e Jonas"): os dois nomes
      // saem dali antes de cair no primeiro nome só
      const doCliente = casalDoNome(nomeDaCliente);
      if (doCliente?.b) return doCliente;
      const n = primeiro(nomeDaCliente);
      if (n) return { a: n, b: noiva && noiva !== n ? noiva : noivo || null };
    }
    if (noiva || noivo) return { a: noiva || noivo, b: null };
    return null;
  }
);

/** "20 de março de 2027" a partir de AAAA-MM-DD (sem fuso: é a data da festa). */
export function dataPorExtenso(iso: string | null | undefined): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d))
  );
}

/** O instante do sim em ISO, no horário de Brasília (sem hora: meia-noite). */
export function momentoDoSim(data: string | null | undefined, hora: string | null | undefined): string | null {
  if (!data) return null;
  const h = (hora ?? "00:00").slice(0, 5);
  return `${data.slice(0, 10)}T${/^\d{2}:\d{2}$/.test(h) ? h : "00:00"}:00-03:00`;
}
