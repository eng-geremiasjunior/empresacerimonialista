// Núcleo do Secretário Executivo — compartilhado entre o cron diário
// (/api/cron/agendamentos, service role) e o botão "Disparar agora"
// (server action, sessão da cerimonialista).
//
// Regra central: os horários oferecidos são a GRADE de disponibilidade da
// cerimonialista MENOS os compromissos que já existem na Agenda dela (em
// qualquer evento). Nunca um calendário paralelo. A vaga é revalidada de
// novo no momento da escolha (RPC escolher_horario_convite).

import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarConviteAgendamentoWhatsapp } from "@/lib/whatsapp";

export type SlotLivre = { data: string; hora: string };

const MAX_SLOTS = 6; // lista do WhatsApp comporta 10 linhas; 6 já decide
const HORIZONTE_DIAS = 21;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// Slots livres da cerimonialista: janelas da grade recortadas pelos
// compromissos existentes. Determinístico.
export async function gerarSlotsLivres(
  supabase: SupabaseClient,
  params: {
    userId: string;
    duracaoMin: number;
    // não oferecer depois desta data (vencimento da tarefa ou data do evento)
    ateData?: string | null;
    // overrides p/ telas (o convite usa os defaults)
    maxSlots?: number;
    horizonteDias?: number;
  }
): Promise<SlotLivre[]> {
  const MAXS = params.maxSlots ?? MAX_SLOTS;
  const HORIZ = params.horizonteDias ?? HORIZONTE_DIAS;
  const [{ data: grade }, { data: config }, { data: excecoes }] =
    await Promise.all([
      supabase
        .from("disponibilidade")
        .select("dia_semana, hora_inicio, hora_fim")
        .eq("user_id", params.userId),
      supabase
        .from("agenda_config")
        .select("buffer_min")
        .eq("user_id", params.userId)
        .maybeSingle(),
      supabase
        .from("disponibilidade_excecao")
        .select("data")
        .eq("user_id", params.userId),
    ]);

  if (!grade || grade.length === 0) return [];

  // Buffer entre reuniões (078): os slots andam de (duração + buffer).
  const buffer = config?.buffer_min ?? 15;
  const diasBloqueados = new Set((excecoes ?? []).map((e) => e.data));

  const inicio = new Date(new Date().toDateString());
  inicio.setDate(inicio.getDate() + 1); // a partir de amanhã
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + HORIZ);
  if (params.ateData) {
    const limite = new Date(`${params.ateData}T00:00:00`);
    if (limite < fim) fim.setTime(limite.getTime());
  }
  if (fim < inicio) return [];

  // Ocupação real: compromissos ativos dela no período, de TODOS os eventos.
  const { data: ocupados } = await supabase
    .from("compromisso")
    .select("data, hora, duracao_min, events!inner(cerimonialista_id)")
    .eq("events.cerimonialista_id", params.userId)
    .gte("data", iso(inicio))
    .lte("data", iso(fim))
    .in("estado", ["agendado", "confirmado"])
    .not("hora", "is", null);

  const ocupadosPorDia = new Map<string, { ini: number; fim: number }[]>();
  for (const c of ocupados ?? []) {
    const ini = minutos(String(c.hora).slice(0, 5));
    const arr = ocupadosPorDia.get(c.data) ?? [];
    arr.push({ ini, fim: ini + (c.duracao_min ?? 60) });
    ocupadosPorDia.set(c.data, arr);
  }

  const slots: SlotLivre[] = [];
  const dur = params.duracaoMin;

  for (
    let d = new Date(inicio);
    d <= fim && slots.length < MAXS;
    d.setDate(d.getDate() + 1)
  ) {
    const dia = iso(d);
    if (diasBloqueados.has(dia)) continue; // exceção: férias etc.
    const janelas = grade.filter((g) => g.dia_semana === d.getDay());
    const blocos = ocupadosPorDia.get(dia) ?? [];

    for (const j of janelas) {
      const ini = minutos(String(j.hora_inicio).slice(0, 5));
      const fimJ = minutos(String(j.hora_fim).slice(0, 5));
      // passo = duração + buffer; a reunião em si só precisa caber (dur)
      for (
        let t = ini;
        t + dur <= fimJ && slots.length < MAXS;
        t += dur + buffer
      ) {
        // ocupação considera o buffer depois da reunião: nada encosta
        const livre = !blocos.some((b) => b.ini < t + dur + buffer && t < b.fim + buffer);
        if (livre) slots.push({ data: dia, hora: hhmm(t) });
      }
    }
  }

  return slots;
}

export type ResultadoConvite =
  | { ok: true; conviteId: string; slots: number }
  | { ok: false; motivo: string };

// Cria o convite + slots e dispara o WhatsApp com a lista de horários.
// Idempotente por tarefa: convite ativo existente barra novo envio.
export async function enviarConviteAgendamento(
  supabase: SupabaseClient,
  taskId: string
): Promise<ResultadoConvite> {
  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, event_id, title, status, due_date, duracao_min, prazo_resposta_dias, supplier_id, local, suppliers(name, whatsapp, phone), events(date, cerimonialista_id, type, client_id, clients(name))"
    )
    .eq("id", taskId)
    .single();

  if (!task) return { ok: false, motivo: "tarefa não encontrada" };
  if (task.status === "concluido")
    return { ok: false, motivo: "a tarefa já está concluída" };
  if (!task.supplier_id)
    return { ok: false, motivo: "a tarefa não tem fornecedor vinculado" };

  const sup = Array.isArray(task.suppliers) ? task.suppliers[0] : task.suppliers;
  const ev = Array.isArray(task.events) ? task.events[0] : task.events;
  const telefone = sup?.whatsapp || sup?.phone;
  if (!telefone)
    return { ok: false, motivo: `${sup?.name ?? "o fornecedor"} não tem WhatsApp cadastrado` };
  if (!ev?.cerimonialista_id)
    return { ok: false, motivo: "evento sem responsável definido" };

  // já existe convite ativo? ('sugerido' também trava: a bola está com a
  // cerimonialista — aprovar/recusar antes de disparar de novo)
  const { data: ativo } = await supabase
    .from("agendamento_convite")
    .select("id, status")
    .eq("task_id", taskId)
    .in("status", ["enviado", "reenviado", "sugerido"])
    .maybeSingle();
  if (ativo) {
    return {
      ok: false,
      motivo:
        ativo.status === "sugerido"
          ? "há uma sugestão de horário aguardando sua aprovação"
          : "já existe um convite aguardando resposta",
    };
  }

  const slots = await gerarSlotsLivres(supabase, {
    userId: ev.cerimonialista_id,
    duracaoMin: task.duracao_min ?? 60,
    ateData: task.due_date ?? ev.date ?? null,
  });
  if (slots.length === 0) {
    return {
      ok: false,
      motivo: "sem horários livres na sua grade até o vencimento — confira sua disponibilidade em Configurações",
    };
  }

  const prazoDias = task.prazo_resposta_dias ?? 5;
  const prazoAte = new Date(Date.now() + prazoDias * 86_400_000).toISOString();

  const { data: convite, error: errConv } = await supabase
    .from("agendamento_convite")
    .insert({
      task_id: taskId,
      event_id: task.event_id,
      supplier_id: task.supplier_id,
      duracao_min: task.duracao_min ?? 60,
      prazo_ate: prazoAte,
    })
    .select("id, hash")
    .single();
  if (errConv || !convite)
    return { ok: false, motivo: `falha ao criar o convite: ${errConv?.message}` };

  const { data: slotRows, error: errSlots } = await supabase
    .from("agendamento_slot")
    .insert(
      slots.map((s) => ({
        convite_id: convite.id,
        event_id: task.event_id,
        data: s.data,
        hora: s.hora,
      }))
    )
    .select("id, data, hora");
  if (errSlots || !slotRows?.length) {
    await supabase.from("agendamento_convite").delete().eq("id", convite.id);
    return { ok: false, motivo: "falha ao gravar os horários" };
  }

  const cli = ev
    ? (Array.isArray(ev.clients) ? ev.clients[0] : ev.clients)
    : null;
  const eventLabel = cli?.name ? `casamento de ${cli.name}` : "o evento";

  const envio = await enviarConviteAgendamentoWhatsapp({
    telefone,
    supplierName: sup!.name,
    tarefa: task.title,
    eventLabel,
    duracaoMin: task.duracao_min ?? 60,
    hash: convite.hash,
    prazoDias,
    slots: slotRows.map((s) => ({
      id: s.id,
      data: s.data,
      hora: String(s.hora).slice(0, 5),
    })),
  });

  if (!envio.ok) {
    // sem entrega não há convite: desfaz para o cron tentar de novo amanhã
    await supabase.from("agendamento_convite").delete().eq("id", convite.id);
    return { ok: false, motivo: envio.error ?? "falha no envio do WhatsApp" };
  }

  return { ok: true, conviteId: convite.id, slots: slotRows.length };
}
