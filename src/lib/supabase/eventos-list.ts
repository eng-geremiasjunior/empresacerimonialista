import { createClient } from "@/lib/supabase/server";
import type { EventosParams } from "@/lib/eventos-url";
import {
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";

export type EventoRow = {
  id: string;
  type: EventType;
  name: string | null;
  date: string;
  location: string | null;
  city: string | null;
  guests: number | null;
  status: EventStatus;
  client_name: string | null;
  responsavel_name: string | null;
  cover_image_url: string | null;
};

export type EventosListResult = {
  rows: EventoRow[];
  total: number;
  // true se a migração 015 (coluna events.archived) ainda não rodou —
  // a lista funciona normalmente, só sem o soft-hide de arquivados.
  migrationPendente: boolean;
};

const PER_PAGE_OPTIONS = [20, 50, 100];

function sanitizeSearch(q: string) {
  // "," e "()" quebram a sintaxe do .or() do PostgREST — removidos por segurança.
  return q.trim().replace(/[,()]/g, "");
}

// Lista de eventos com busca (cliente, local, tipo, responsável e
// fornecedor), filtros, ordenação e paginação real (via .range()).
export async function getEventosList(
  params: EventosParams
): Promise<EventosListResult> {
  const supabase = createClient();

  const perPage = PER_PAGE_OPTIONS.includes(Number(params.perPage))
    ? Number(params.perPage)
    : 20;
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const statuses = params.status ? (params.status.split(",") as EventStatus[]) : [];
  const types = params.type ? (params.type.split(",") as EventType[]) : [];
  const q = sanitizeSearch(params.q);

  // Pré-buscas para ampliar o alcance da busca por texto.
  let clientIds: string[] = [];
  let supplierEventIds: string[] = [];
  let responsavelIds: string[] = [];
  let matchedTypes: string[] = [];
  if (q) {
    const qLower = q.toLowerCase();
    const [clientsRes, linksRes, membrosRes] = await Promise.all([
      supabase.from("clients").select("id").ilike("name", `%${q}%`),
      supabase
        .from("roteiro_links")
        .select("event_id, suppliers(name)")
        .ilike("suppliers.name", `%${q}%`),
      supabase.from("membros_equipe").select("id").ilike("nome", `%${q}%`),
    ]);
    clientIds = (clientsRes.data ?? []).map((c) => c.id as string);
    supplierEventIds = [
      ...new Set(
        ((linksRes.data ?? []) as unknown as {
          event_id: string;
          suppliers: { name: string } | null;
        }[])
          .filter((l) => l.suppliers)
          .map((l) => l.event_id)
      ),
    ];
    responsavelIds = (membrosRes.data ?? []).map((m) => m.id as string);
    matchedTypes = (Object.keys(EVENT_TYPE_LABELS) as EventType[]).filter(
      (t) => EVENT_TYPE_LABELS[t].toLowerCase().includes(qLower)
    );
  }

  function buildQuery(
    withArchivedFilter: boolean,
    withResponsavel: boolean,
    withRichSearch: boolean,
    withCover: boolean
  ) {
    const cover = withCover ? "cover_image_url, " : "";
    const cols = withResponsavel
      ? `id, type, name, date, location, city, guests, status, ${cover}clients(name), responsavel:membros_equipe(nome)`
      : `id, type, name, date, location, city, guests, status, ${cover}clients(name)`;
    let query = supabase.from("events").select(cols, { count: "exact" });

    if (withArchivedFilter) query = query.eq("archived", false);
    if (statuses.length > 0) query = query.in("status", statuses);
    if (types.length > 0) query = query.in("type", types);

    if (q) {
      const orParts = [`location.ilike.%${q}%`, `city.ilike.%${q}%`, `name.ilike.%${q}%`];
      if (clientIds.length > 0) orParts.push(`client_id.in.(${clientIds.join(",")})`);
      if (withRichSearch) {
        if (supplierEventIds.length > 0) orParts.push(`id.in.(${supplierEventIds.join(",")})`);
        if (responsavelIds.length > 0) {
          orParts.push(`cerimonialista_responsavel_id.in.(${responsavelIds.join(",")})`);
        }
        if (matchedTypes.length > 0) orParts.push(`type.in.(${matchedTypes.join(",")})`);
      }
      query = query.or(orParts.join(","));
    }

    if (params.sort === "client") {
      query = query.order("name", {
        ascending: params.dir !== "desc",
        referencedTable: "clients",
      });
    } else if (params.sort === "status") {
      query = query.order("status", { ascending: params.dir !== "desc" });
    } else {
      query = query.order("date", { ascending: params.dir !== "desc" });
    }

    return query.range(from, to);
  }

  // Fallbacks: PGRST200 = relação do responsável ausente (022 pendente);
  // 42703 = coluna ausente (archived/cover/responsavel_id em DB antigo) —
  // degrada removendo o filtro/busca ricos em vez de derrubar a página.
  let withArchived = true;
  let withResponsavel = true;
  let withRich = true;
  let withCover = true;
  let migrationPendente = false;

  let { data, count, error } = await buildQuery(
    withArchived,
    withResponsavel,
    withRich,
    withCover
  );
  for (let i = 0; i < 4 && error; i++) {
    if (error.code === "PGRST200" && withResponsavel) {
      withResponsavel = false;
    } else if (error.code === "42703" && withCover) {
      withCover = false; // migração 029 (cover) pendente
    } else if (error.code === "42703" && withRich) {
      withRich = false; // busca por responsável/tipo indisponível
    } else if (error.code === "42703" && withArchived) {
      withArchived = false;
      migrationPendente = true;
    } else {
      break;
    }
    ({ data, count, error } = await buildQuery(
      withArchived,
      withResponsavel,
      withRich,
      withCover
    ));
  }

  const rows: EventoRow[] = ((data ?? []) as unknown[]).map((row) => {
    const record = row as {
      id: string;
      type: EventType;
      name: string | null;
      date: string;
      location: string | null;
      city: string | null;
      guests: number | null;
      status: EventStatus;
      cover_image_url: string | null;
      clients: { name: string } | null;
      responsavel?: { nome: string } | null;
    };
    return {
      id: record.id,
      type: record.type,
      name: record.name ?? null,
      date: record.date,
      location: record.location,
      city: record.city,
      guests: record.guests ?? null,
      status: record.status,
      client_name: record.clients?.name ?? null,
      responsavel_name: record.responsavel?.nome ?? null,
      cover_image_url: record.cover_image_url ?? null,
    };
  });

  return { rows, total: count ?? 0, migrationPendente };
}

// Indicadores do topo: contagem por status (empresa via RLS).
export type EventosIndicadores = {
  total: number;
  orcamento: number;
  confirmado: number;
  concluido: number;
  cancelado: number;
};

export async function getEventosIndicadores(): Promise<EventosIndicadores> {
  const supabase = createClient();
  const { data } = await supabase.from("events").select("status");
  const rows = (data ?? []) as { status: EventStatus }[];
  const cont = (s: EventStatus) => rows.filter((r) => r.status === s).length;
  return {
    total: rows.length,
    orcamento: cont("orcamento"),
    confirmado: cont("confirmado"),
    concluido: cont("concluido"),
    cancelado: cont("cancelado"),
  };
}
