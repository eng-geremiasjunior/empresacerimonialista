// Dados da tela /agenda (Agenda de Fornecedores) — tudo real, nada mockado.
//
// Reuniões = compromissos com fornecedor vinculado, dos eventos em que ESTA
// cerimonialista é a responsável (a mesma régua do motor de slots: a
// ocupação é dela, atravessando todos os eventos). Nunca noivos: compromisso
// sem fornecedor não entra aqui.

import { createClient } from "@/lib/supabase/server";
import { gerarSlotsLivres, type SlotLivre } from "@/lib/agendamento";

export type ReuniaoFornecedor = {
  id: string;
  eventId: string;
  titulo: string;
  data: string;
  hora: string | null;
  duracaoMin: number;
  local: string | null;
  estado: "agendado" | "confirmado" | "remarcado";
  fornecedor: string;
  fornecedorIniciais: string;
  casal: string | null;
  dataEvento: string | null;
};

export type ConvitePendente = {
  id: string;
  tarefa: string;
  fornecedor: string | null;
  prazoAte: string;
  status: "enviado" | "reenviado";
};

export type JanelaGrade = {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

export type Excecao = { id: string; data: string; label: string | null };

export type AgendaFornecedores = {
  userId: string;
  reunioes: ReuniaoFornecedor[];
  convitesPendentes: ConvitePendente[];
  livresSemana: number;
  proximoSlot: SlotLivre | null;
  frequentes: { nome: string; iniciais: string; total: number }[];
  grade: JanelaGrade[];
  slotPadraoMin: number;
  bufferMin: number;
  excecoes: Excecao[];
};

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

export async function getAgendaFornecedores(): Promise<AgendaFornecedores | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const hoje = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const [compRes, convRes, gradeRes, configRes, excRes] = await Promise.all([
    supabase
      .from("compromisso")
      .select(
        "id, event_id, titulo, data, hora, duracao_min, local, estado, suppliers!inner(name), events!inner(cerimonialista_id, date, clients(name))"
      )
      .eq("events.cerimonialista_id", user.id)
      .not("supplier_id", "is", null)
      .gte("data", hojeIso)
      .in("estado", ["agendado", "confirmado", "remarcado"])
      .order("data")
      .order("hora", { nullsFirst: true }),
    supabase
      .from("agendamento_convite")
      .select(
        "id, status, prazo_ate, tasks(title), suppliers(name), events!inner(cerimonialista_id)"
      )
      .eq("events.cerimonialista_id", user.id)
      .in("status", ["enviado", "reenviado"]),
    supabase
      .from("disponibilidade")
      .select("id, dia_semana, hora_inicio, hora_fim")
      .eq("user_id", user.id)
      .order("dia_semana")
      .order("hora_inicio"),
    supabase
      .from("agenda_config")
      .select("slot_padrao_min, buffer_min")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("disponibilidade_excecao")
      .select("id, data, label")
      .eq("user_id", user.id)
      .gte("data", hojeIso)
      .order("data"),
  ]);

  const um = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? v[0] ?? null : v;

  const reunioes: ReuniaoFornecedor[] = (compRes.data ?? []).map((c) => {
    const sup = um(c.suppliers as { name: string } | { name: string }[] | null);
    const ev = um(
      c.events as
        | { date: string | null; clients: { name: string } | { name: string }[] | null }
        | { date: string | null; clients: { name: string } | { name: string }[] | null }[]
        | null
    );
    const cli = ev ? um(ev.clients) : null;
    return {
      id: c.id,
      eventId: c.event_id,
      titulo: c.titulo,
      data: c.data,
      hora: c.hora ? String(c.hora).slice(0, 5) : null,
      duracaoMin: c.duracao_min ?? 60,
      local: c.local,
      estado: c.estado as ReuniaoFornecedor["estado"],
      fornecedor: sup?.name ?? "Fornecedor",
      fornecedorIniciais: iniciais(sup?.name ?? "?"),
      casal: cli?.name ?? null,
      dataEvento: ev?.date ?? null,
    };
  });

  const convitesPendentes: ConvitePendente[] = (convRes.data ?? []).map((c) => {
    const t = um(c.tasks as { title: string } | { title: string }[] | null);
    const s = um(c.suppliers as { name: string } | { name: string }[] | null);
    return {
      id: c.id,
      tarefa: t?.title ?? "tarefa",
      fornecedor: s?.name ?? null,
      prazoAte: c.prazo_ate,
      status: c.status as ConvitePendente["status"],
    };
  });

  const slotPadraoMin = configRes.data?.slot_padrao_min ?? 45;
  const bufferMin = configRes.data?.buffer_min ?? 15;

  // Slots livres da semana (7 dias) — a régua real do motor, com buffer.
  const livres = await gerarSlotsLivres(supabase, {
    userId: user.id,
    duracaoMin: slotPadraoMin,
    maxSlots: 60,
    horizonteDias: 7,
  });

  // Fornecedores frequentes: quem mais teve reunião (inclui histórico).
  const { data: todasComp } = await supabase
    .from("compromisso")
    .select("suppliers!inner(name), events!inner(cerimonialista_id)")
    .eq("events.cerimonialista_id", user.id)
    .not("supplier_id", "is", null);
  const contagem = new Map<string, number>();
  for (const c of todasComp ?? []) {
    const s = um(c.suppliers as { name: string } | { name: string }[] | null);
    if (s?.name) contagem.set(s.name, (contagem.get(s.name) ?? 0) + 1);
  }
  const frequentes = [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([nome, total]) => ({ nome, iniciais: iniciais(nome), total }));

  return {
    userId: user.id,
    reunioes,
    convitesPendentes,
    livresSemana: livres.length,
    proximoSlot: livres[0] ?? null,
    frequentes,
    grade: (gradeRes.data ?? []) as JanelaGrade[],
    slotPadraoMin,
    bufferMin,
    excecoes: (excRes.data ?? []) as Excecao[],
  };
}
