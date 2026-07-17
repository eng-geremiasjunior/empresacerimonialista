import { addDays, endOfWeek, format, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getSaudeBulk } from "@/lib/supabase/evento";
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
  migrationPendente: boolean;
};

const PER_PAGE_OPTIONS = [20, 50, 100];
const iso = (d: Date) => format(d, "yyyy-MM-dd");

function sanitizeSearch(q: string) {
  return q.trim().replace(/[,()]/g, "");
}

type RawRow = {
  id: string;
  type: EventType;
  name: string | null;
  date: string;
  location: string | null;
  city: string | null;
  guests: number | null;
  status: EventStatus;
  cover_image_url?: string | null;
  clients: { name: string } | null;
  responsavel?: { nome: string } | null;
};

function mapRow(record: RawRow): EventoRow {
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
}

// Lista de eventos com busca (cliente, local, tipo, responsável e
// fornecedor), filtros (status, tipo, responsável, cidade, arquivados,
// faixa de saúde) e paginação. A faixa de saúde é pós-filtro (calculada),
// então buscamos todos os que casam com os demais filtros e paginamos em
// memória — volume por empresa é modesto.
export async function getEventosList(
  params: EventosParams
): Promise<EventosListResult> {
  const supabase = createClient();

  const perPage = PER_PAGE_OPTIONS.includes(Number(params.perPage))
    ? Number(params.perPage)
    : 20;
  const page = Math.max(1, Number(params.page) || 1);

  const statuses = params.status ? (params.status.split(",") as EventStatus[]) : [];
  const types = params.type ? (params.type.split(",") as EventType[]) : [];
  const q = sanitizeSearch(params.q);

  // Pré-buscas da busca por texto
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
    matchedTypes = (Object.keys(EVENT_TYPE_LABELS) as EventType[]).filter((t) =>
      EVENT_TYPE_LABELS[t].toLowerCase().includes(qLower)
    );
  }

  const mostrarArquivados = params.arquivados === "sim";

  function buildQuery(
    withArchived: boolean,
    withResponsavel: boolean,
    withRich: boolean,
    withCover: boolean
  ) {
    const cover = withCover ? "cover_image_url, " : "";
    const cols = withResponsavel
      ? `id, type, name, date, location, city, guests, status, ${cover}clients(name), responsavel:membros_equipe(nome)`
      : `id, type, name, date, location, city, guests, status, ${cover}clients(name)`;
    let query = supabase.from("events").select(cols).limit(1000);

    if (withArchived) query = query.eq("archived", mostrarArquivados);
    if (statuses.length > 0) query = query.in("status", statuses);
    if (types.length > 0) query = query.in("type", types);
    if (params.city) query = query.eq("city", params.city);
    if (withRich && params.responsavel) {
      query = query.eq("cerimonialista_responsavel_id", params.responsavel);
    }

    if (q) {
      const orParts = [`location.ilike.%${q}%`, `city.ilike.%${q}%`, `name.ilike.%${q}%`];
      if (clientIds.length > 0) orParts.push(`client_id.in.(${clientIds.join(",")})`);
      if (withRich) {
        if (supplierEventIds.length > 0) orParts.push(`id.in.(${supplierEventIds.join(",")})`);
        if (responsavelIds.length > 0) orParts.push(`cerimonialista_responsavel_id.in.(${responsavelIds.join(",")})`);
        if (matchedTypes.length > 0) orParts.push(`type.in.(${matchedTypes.join(",")})`);
      }
      query = query.or(orParts.join(","));
    }

    if (params.sort === "client") {
      query = query.order("name", { ascending: params.dir !== "desc", referencedTable: "clients" });
    } else if (params.sort === "status") {
      query = query.order("status", { ascending: params.dir !== "desc" });
    } else {
      query = query.order("date", { ascending: params.dir !== "desc" });
    }
    return query;
  }

  let withArchived = true;
  let withResponsavel = true;
  let withRich = true;
  let withCover = true;
  let migrationPendente = false;

  let { data, error } = await buildQuery(withArchived, withResponsavel, withRich, withCover);
  for (let i = 0; i < 4 && error; i++) {
    if (error.code === "PGRST200" && withResponsavel) withResponsavel = false;
    else if (error.code === "42703" && withCover) withCover = false;
    else if (error.code === "42703" && withRich) withRich = false;
    else if (error.code === "42703" && withArchived) {
      withArchived = false;
      migrationPendente = true;
    } else break;
    ({ data, error } = await buildQuery(withArchived, withResponsavel, withRich, withCover));
  }

  let rows = ((data ?? []) as unknown as RawRow[]).map(mapRow);

  // Filtro por faixa de saúde (calculado)
  if (params.saude) {
    const saudeById = await getSaudeBulk(rows.map((r) => r.id));
    rows = rows.filter((r) => {
      const s = saudeById[r.id];
      if (!s) return false;
      if (params.saude === "critico") return s.score < 50;
      if (params.saude === "atencao") return s.score >= 50 && s.score < 80;
      if (params.saude === "saudavel") return s.score >= 80;
      if (params.saude === "pendente") return s.score < 80; // usado pelo Copiloto
      return true;
    });
  }

  const total = rows.length;
  const inicio = (page - 1) * perPage;
  return { rows: rows.slice(inicio, inicio + perPage), total, migrationPendente };
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

// Dados dos dropdowns do painel de filtros: responsáveis e cidades.
export async function getEventosFiltroDados(): Promise<{
  responsaveis: { id: string; nome: string }[];
  cidades: string[];
}> {
  const supabase = createClient();
  const [membrosRes, cidadesRes] = await Promise.all([
    supabase
      .from("membros_equipe")
      .select("id, nome")
      .eq("status", "ativo")
      .order("nome"),
    supabase.from("events").select("city"),
  ]);
  const cidades = [
    ...new Set(
      ((cidadesRes.data ?? []) as { city: string | null }[])
        .map((e) => e.city)
        .filter((c): c is string => Boolean(c && c.trim()))
    ),
  ].sort((a, b) => a.localeCompare(b));
  return {
    responsaveis: (membrosRes.data ?? []) as { id: string; nome: string }[],
    cidades,
  };
}

// Contagem de eventos por faixa de saúde (ativos da empresa).
export async function getSaudeContagem(): Promise<{
  criticos: number;
  atencao: number;
  saudaveis: number;
}> {
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("id, archived")
    .limit(1000);
  const ids = ((data ?? []) as { id: string; archived?: boolean }[])
    .filter((e) => e.archived !== true)
    .map((e) => e.id);
  const saudeById = await getSaudeBulk(ids);
  let criticos = 0,
    atencao = 0,
    saudaveis = 0;
  for (const id of ids) {
    const s = saudeById[id];
    if (!s) continue;
    if (s.score < 50) criticos++;
    else if (s.score < 80) atencao++;
    else saudaveis++;
  }
  return { criticos, atencao, saudaveis };
}

// Resumo rápido: próximo evento, eventos desta semana, receita prevista do mês.
export type ResumoRapidoEventos = {
  proximoEvento: { id: string; label: string; date: string; time: string | null } | null;
  estaSemana: number;
  receitaPrevistaMes: number;
};

export async function getResumoRapidoEventos(): Promise<ResumoRapidoEventos> {
  const supabase = createClient();
  const hoje = new Date();
  const hojeIso = iso(hoje);
  const fimSemana = iso(endOfWeek(hoje, { weekStartsOn: 1 }));
  const mesInicio = iso(startOfMonth(hoje));
  const mesFim = iso(endOfMonth(hoje));

  const { data } = await supabase
    .from("events")
    .select("id, type, name, date, time, status, contract_value, clients(name)")
    .gte("date", hojeIso)
    .order("date", { ascending: true })
    .limit(1000);

  const rows = (data ?? []) as unknown as {
    id: string;
    type: EventType;
    name: string | null;
    date: string;
    time: string | null;
    status: string;
    contract_value: number | null;
    clients: { name: string } | null;
  }[];

  const futuros = rows.filter((e) => e.status !== "cancelado");
  const prox = futuros[0];

  return {
    proximoEvento: prox
      ? {
          id: prox.id,
          label:
            prox.name ||
            `${EVENT_TYPE_LABELS[prox.type]}${prox.clients?.name ? ` — ${prox.clients.name}` : ""}`,
          date: prox.date,
          time: prox.time,
        }
      : null,
    estaSemana: futuros.filter((e) => e.date <= fimSemana).length,
    receitaPrevistaMes: rows
      .filter(
        (e) =>
          e.status === "confirmado" &&
          e.date >= mesInicio &&
          e.date <= mesFim
      )
      .reduce((s, e) => s + Number(e.contract_value ?? 0), 0),
  };
}

// Copiloto: nº de eventos que precisam de atenção hoje.
// saúde < 80% OU parcela vencendo hoje OU fornecedor não confirmado com
// evento em até 3 dias. Reaproveita a Saúde do Evento (não cria cálculo
// paralelo) e adiciona os dois gatilhos temporais.
export async function getEventosAtencaoCount(): Promise<number> {
  const supabase = createClient();
  const hoje = iso(new Date());
  const em3 = iso(addDays(new Date(), 3));

  const { data: evData } = await supabase
    .from("events")
    .select("id, date, archived, status")
    .limit(2000);
  const eventos = ((evData ?? []) as {
    id: string;
    date: string;
    archived?: boolean;
    status: string;
  }[]).filter((e) => e.archived !== true && e.status !== "cancelado");
  const ids = eventos.map((e) => e.id);
  if (ids.length === 0) return 0;

  const [saudeById, txRes, linksRes] = await Promise.all([
    getSaudeBulk(ids),
    supabase
      .from("transactions")
      .select("event_id, type, paid, due_date")
      .in("event_id", ids)
      .eq("type", "receita")
      .eq("paid", false)
      .eq("due_date", hoje),
    supabase
      .from("roteiro_links")
      .select("event_id, confirmed")
      .in("event_id", ids)
      .eq("confirmed", false),
  ]);

  const comParcelaHoje = new Set(
    ((txRes.data ?? []) as { event_id: string }[]).map((t) => t.event_id)
  );
  const comFornPendente = new Set(
    ((linksRes.data ?? []) as { event_id: string }[]).map((l) => l.event_id)
  );
  const dateById = new Map(eventos.map((e) => [e.id, e.date]));

  let n = 0;
  for (const id of ids) {
    const saude = saudeById[id];
    const baixa = saude ? saude.score < 80 : false;
    const parcelaHoje = comParcelaHoje.has(id);
    const d = dateById.get(id)!;
    const fornUrgente =
      comFornPendente.has(id) && d >= hoje && d <= em3;
    if (baixa || parcelaHoje || fornUrgente) n++;
  }
  return n;
}

// Linhas para relatório/exportação (respeita os filtros atuais, sem paginar).
export type EventoExportRow = {
  nome: string;
  tipo: string;
  data: string;
  status: string;
  cliente: string;
  valor: number | null;
};

export async function getEventosParaExport(
  params: EventosParams
): Promise<EventoExportRow[]> {
  // Reaproveita getEventosList com uma página gigante para trazer tudo
  // filtrado (inclusive faixa de saúde).
  const { rows } = await getEventosList({ ...params, page: "1", perPage: "100" });
  const supabase = createClient();
  const ids = rows.map((r) => r.id);
  const { data } = await supabase
    .from("events")
    .select("id, contract_value")
    .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const valorById = new Map(
    ((data ?? []) as { id: string; contract_value: number | null }[]).map((e) => [
      e.id,
      e.contract_value,
    ])
  );
  return rows.map((r) => ({
    nome:
      r.name ||
      `${EVENT_TYPE_LABELS[r.type]}${r.client_name ? ` — ${r.client_name}` : ""}`,
    tipo: EVENT_TYPE_LABELS[r.type],
    data: r.date,
    status: r.status,
    cliente: r.client_name ?? "",
    valor: valorById.get(r.id) ?? null,
  }));
}
