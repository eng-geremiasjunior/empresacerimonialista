import { createClient } from "@/lib/supabase/server";
import type { EventosParams } from "@/lib/eventos-url";
import type { EventStatus, EventType } from "@/lib/types";

export type EventoRow = {
  id: string;
  type: EventType;
  date: string;
  location: string | null;
  city: string | null;
  status: EventStatus;
  client_name: string | null;
  responsavel_name: string | null;
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

// Lista de eventos com busca (cliente/local), filtros, ordenação e
// paginação real (via .range()) — não carrega tudo para paginar no cliente.
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

  let clientIds: string[] = [];
  if (q) {
    const { data: matchingClients } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", `%${q}%`);
    clientIds = (matchingClients ?? []).map((c) => c.id as string);
  }

  function buildQuery(withArchivedFilter: boolean, withResponsavel: boolean) {
    const cols = withResponsavel
      ? "id, type, date, location, city, status, clients(name), responsavel:membros_equipe(nome)"
      : "id, type, date, location, city, status, clients(name)";
    let query = supabase.from("events").select(cols, { count: "exact" });

    if (withArchivedFilter) query = query.eq("archived", false);
    if (statuses.length > 0) query = query.in("status", statuses);
    if (types.length > 0) query = query.in("type", types);

    if (q) {
      const orParts = [`location.ilike.%${q}%`, `city.ilike.%${q}%`];
      if (clientIds.length > 0) {
        orParts.push(`client_id.in.(${clientIds.join(",")})`);
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

  // Fallbacks: PGRST200 = relação do responsável ausente (migração 022
  // pendente); 42703 = coluna archived ausente (migração 015 pendente).
  let withArchived = true;
  let withResponsavel = true;
  let migrationPendente = false;

  let { data, count, error } = await buildQuery(withArchived, withResponsavel);
  for (let i = 0; i < 2 && error; i++) {
    if (error.code === "PGRST200" && withResponsavel) {
      withResponsavel = false;
    } else if (error.code === "42703" && withArchived) {
      withArchived = false;
      migrationPendente = true;
    } else {
      break;
    }
    ({ data, count, error } = await buildQuery(withArchived, withResponsavel));
  }

  const rows: EventoRow[] = ((data ?? []) as unknown[]).map((row) => {
    const record = row as {
      id: string;
      type: EventType;
      date: string;
      location: string | null;
      city: string | null;
      status: EventStatus;
      clients: { name: string } | null;
      responsavel?: { nome: string } | null;
    };
    return {
      id: record.id,
      type: record.type,
      date: record.date,
      location: record.location,
      city: record.city,
      status: record.status,
      client_name: record.clients?.name ?? null,
      responsavel_name: record.responsavel?.nome ?? null,
    };
  });

  return { rows, total: count ?? 0, migrationPendente };
}
