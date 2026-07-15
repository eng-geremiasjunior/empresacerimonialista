// Painel de equipe (Etapa 5): status de cada membro calculado a partir
// dos eventos reais (responsável ou participante), indicadores do topo e
// detalhe por pessoa. Nada de mock — zero é resposta honesta.

import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import type { MembroEquipe } from "@/lib/equipe-shared";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export type StatusMembro = "disponivel" | "em_evento" | "inativo";

export type EventoResumo = {
  id: string;
  label: string;
  date: string;
  status: string;
};

export type MembroComStatus = MembroEquipe & {
  statusHoje: StatusMembro;
  eventoHoje: EventoResumo | null;
  proximoEvento: EventoResumo | null;
};

type EventoRow = {
  id: string;
  type: EventType;
  date: string;
  status: string;
  cerimonialista_responsavel_id: string | null;
  clients: { name: string } | null;
};

function eventoLabel(ev: EventoRow): EventoResumo {
  return {
    id: ev.id,
    label: `${EVENT_TYPE_LABELS[ev.type] ?? ev.type} — ${ev.clients?.name ?? "Sem cliente"}`,
    date: ev.date,
    status: ev.status,
  };
}

// Membros da empresa vinculados aos eventos (via responsável OU
// participante) para calcular status. Poucas queries, cálculo em memória.
async function carregarBase() {
  const supabase = createClient();
  const hoje = iso(new Date());

  const [membrosRes, eventosRes, participantesRes] = await Promise.all([
    supabase
      .from("membros_equipe")
      .select(
        "id, empresa_id, user_id, nome, email, cargo, especialidades, status, is_owner, created_at"
      )
      .order("is_owner", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("events")
      .select(
        "id, type, date, status, cerimonialista_responsavel_id, clients(name)"
      )
      .neq("status", "cancelado"),
    supabase
      .from("evento_participantes")
      .select("event_id, membro_equipe_id"),
  ]);

  const membros = (membrosRes.data ?? []) as MembroEquipe[];
  const eventos = (eventosRes.data ?? []) as unknown as EventoRow[];
  const participantes = (participantesRes.data ?? []) as {
    event_id: string;
    membro_equipe_id: string;
  }[];

  return { hoje, membros, eventos, participantes };
}

// Ids dos membros vinculados a um evento (responsável + participantes).
function membrosDoEvento(
  ev: EventoRow,
  participantes: { event_id: string; membro_equipe_id: string }[]
): Set<string> {
  const ids = new Set<string>();
  if (ev.cerimonialista_responsavel_id) {
    ids.add(ev.cerimonialista_responsavel_id);
  }
  for (const p of participantes) {
    if (p.event_id === ev.id) ids.add(p.membro_equipe_id);
  }
  return ids;
}

export async function getEquipeComStatus(): Promise<MembroComStatus[]> {
  const { hoje, membros, eventos, participantes } = await carregarBase();

  // Índice: membroId -> eventos vinculados (ordenados por data asc)
  const porMembro = new Map<string, EventoRow[]>();
  for (const ev of eventos) {
    for (const mid of membrosDoEvento(ev, participantes)) {
      const lista = porMembro.get(mid) ?? [];
      lista.push(ev);
      porMembro.set(mid, lista);
    }
  }
  for (const lista of porMembro.values()) {
    lista.sort((a, b) => a.date.localeCompare(b.date));
  }

  return membros.map((m) => {
    const vinculados = porMembro.get(m.id) ?? [];
    const eventoHoje = vinculados.find((ev) => ev.date === hoje) ?? null;
    const proximo = vinculados.find((ev) => ev.date > hoje) ?? null;

    const statusHoje: StatusMembro =
      m.status === "inativo"
        ? "inativo"
        : eventoHoje
          ? "em_evento"
          : "disponivel";

    return {
      ...m,
      statusHoje,
      eventoHoje: eventoHoje ? eventoLabel(eventoHoje) : null,
      proximoEvento: proximo ? eventoLabel(proximo) : null,
    };
  });
}

export type IndicadoresEquipe = {
  ativos: number;
  emEventoHoje: number;
  disponiveis: number;
  inativos: number;
};

export function calcularIndicadores(
  equipe: MembroComStatus[]
): IndicadoresEquipe {
  const ativos = equipe.filter((m) => m.status === "ativo").length;
  const emEventoHoje = equipe.filter((m) => m.statusHoje === "em_evento").length;
  const inativos = equipe.filter((m) => m.status === "inativo").length;
  return {
    ativos,
    emEventoHoje,
    disponiveis: ativos - emEventoHoje,
    inativos,
  };
}

// ------------------------------------------------------------
// Detalhe de um membro (painel)
// ------------------------------------------------------------

export type DetalheCerimonialista = {
  membro: MembroEquipe;
  eventoHoje: EventoResumo | null;
  proximosEventos: EventoResumo[];
  ativos: number;
  concluidos: number;
  tarefasPendentes: number;
};

export async function getDetalheCerimonialista(
  membroId: string
): Promise<DetalheCerimonialista | null> {
  const { hoje, membros, eventos, participantes } = await carregarBase();
  const membro = membros.find((m) => m.id === membroId);
  if (!membro) return null;

  const vinculados = eventos
    .filter((ev) => membrosDoEvento(ev, participantes).has(membroId))
    .sort((a, b) => a.date.localeCompare(b.date));

  const eventoHoje = vinculados.find((ev) => ev.date === hoje) ?? null;
  const proximos = vinculados.filter((ev) => ev.date > hoje);

  // Tarefas pendentes nos eventos vinculados (RLS já limita o acesso).
  let tarefasPendentes = 0;
  const ids = vinculados.map((ev) => ev.id);
  if (ids.length > 0) {
    const supabase = createClient();
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("event_id", ids)
      .neq("status", "concluido");
    tarefasPendentes = count ?? 0;
  }

  return {
    membro,
    eventoHoje: eventoHoje ? eventoLabel(eventoHoje) : null,
    proximosEventos: proximos.map(eventoLabel),
    ativos: vinculados.filter((ev) => ev.status !== "concluido").length,
    concluidos: vinculados.filter((ev) => ev.status === "concluido").length,
    tarefasPendentes,
  };
}
