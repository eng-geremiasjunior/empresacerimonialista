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
import { enviarConviteAgendamentoEmail } from "@/lib/email";
import { inicioDoDiaBR } from "@/lib/tempo";

export type CanalConvite = "whatsapp" | "email";

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

  const inicio = inicioDoDiaBR();
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

// Cria o convite + slots e dispara o WhatsApp. Serve aos DOIS caminhos:
// a partir de uma tarefa (taskId) ou avulso, direto da Agenda (080).
async function criarEDisparar(
  supabase: SupabaseClient,
  p: {
    eventId: string;
    supplierId: string;
    titulo: string;
    duracaoMin: number;
    prazoDias: number;
    ateData: string | null;
    userId: string;
    taskId?: string | null;
    supplierNome: string;
    canal: CanalConvite;
    telefone: string | null;
    email: string | null;
    eventLabel: string;
  }
): Promise<ResultadoConvite> {
  // Valida o canal escolhido tem para onde mandar.
  if (p.canal === "whatsapp" && !p.telefone)
    return { ok: false, motivo: `${p.supplierNome} não tem WhatsApp cadastrado` };
  if (p.canal === "email" && !p.email)
    return { ok: false, motivo: `${p.supplierNome} não tem e-mail cadastrado` };
  const slots = await gerarSlotsLivres(supabase, {
    userId: p.userId,
    duracaoMin: p.duracaoMin,
    ateData: p.ateData,
  });
  if (slots.length === 0) {
    return {
      ok: false,
      motivo:
        "sem horários livres na sua grade até essa data — confira a Agenda de Fornecedores",
    };
  }

  const prazoAte = new Date(Date.now() + p.prazoDias * 86_400_000).toISOString();

  const { data: convite, error: errConv } = await supabase
    .from("agendamento_convite")
    .insert({
      task_id: p.taskId ?? null,
      titulo: p.titulo,
      event_id: p.eventId,
      supplier_id: p.supplierId,
      duracao_min: p.duracaoMin,
      canal: p.canal,
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
        event_id: p.eventId,
        data: s.data,
        hora: s.hora,
      }))
    )
    .select("id, data, hora");
  if (errSlots || !slotRows?.length) {
    await supabase.from("agendamento_convite").delete().eq("id", convite.id);
    return { ok: false, motivo: "falha ao gravar os horários" };
  }

  const slotsPayload = slotRows.map((s) => ({
    id: s.id,
    data: s.data,
    hora: String(s.hora).slice(0, 5),
  }));

  const envio =
    p.canal === "email"
      ? await enviarConviteAgendamentoEmail({
          to: p.email!,
          supplierName: p.supplierNome,
          tarefa: p.titulo,
          eventLabel: p.eventLabel,
          duracaoMin: p.duracaoMin,
          hash: convite.hash,
          prazoDias: p.prazoDias,
          slots: slotsPayload,
        })
      : await enviarConviteAgendamentoWhatsapp({
          telefone: p.telefone!,
          supplierName: p.supplierNome,
          tarefa: p.titulo,
          eventLabel: p.eventLabel,
          duracaoMin: p.duracaoMin,
          hash: convite.hash,
          prazoDias: p.prazoDias,
          slots: slotsPayload,
        });

  if (!envio.ok) {
    // sem entrega não há convite: desfaz para não deixar fantasma
    await supabase.from("agendamento_convite").delete().eq("id", convite.id);
    return {
      ok: false,
      motivo: envio.error ?? `falha no envio por ${p.canal}`,
    };
  }

  // Registra no sino e no Histórico do evento (081).
  const canalLabel = p.canal === "email" ? "e-mail" : "WhatsApp";
  await supabase.rpc("registrar_agendamento_evento", {
    p_event_id: p.eventId,
    p_tipo: "convite_enviado",
    p_titulo: `Convite enviado a ${p.supplierNome} (${canalLabel})`,
    p_mensagem: `${p.titulo} · ${slotRows.length} horários oferecidos · resposta em até ${p.prazoDias} dias`,
    p_link: p.taskId
      ? `/eventos/${p.eventId}/organizacao?tarefa=${p.taskId}`
      : `/eventos/${p.eventId}/organizacao`,
  });

  return { ok: true, conviteId: convite.id, slots: slotRows.length };
}

// Convite AVULSO — nasce na Agenda ("+ Novo" com agendamento automático),
// sem tarefa por trás. A reunião só vira compromisso quando o fornecedor
// escolhe o horário.
export async function enviarConviteAvulso(
  supabase: SupabaseClient,
  p: {
    eventId: string;
    supplierId: string;
    titulo: string;
    duracaoMin: number;
    prazoDias: number;
    canal: CanalConvite;
    ateData?: string | null;
  }
): Promise<ResultadoConvite> {
  const [{ data: sup }, { data: ev }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("name, whatsapp, phone, email")
      .eq("id", p.supplierId)
      .single(),
    supabase
      .from("events")
      .select("date, cerimonialista_id, clients(name)")
      .eq("id", p.eventId)
      .single(),
  ]);

  if (!sup) return { ok: false, motivo: "fornecedor não encontrado" };
  if (!ev?.cerimonialista_id)
    return { ok: false, motivo: "evento sem responsável definido" };

  const cli = Array.isArray(ev.clients) ? ev.clients[0] : ev.clients;

  return criarEDisparar(supabase, {
    eventId: p.eventId,
    supplierId: p.supplierId,
    titulo: p.titulo,
    duracaoMin: p.duracaoMin,
    prazoDias: p.prazoDias,
    ateData: p.ateData ?? ev.date ?? null,
    userId: ev.cerimonialista_id,
    taskId: null,
    supplierNome: sup.name,
    canal: p.canal,
    telefone: sup.whatsapp || sup.phone || null,
    email: sup.email || null,
    eventLabel: cli?.name ? `casamento de ${cli.name}` : "o evento",
  });
}

// Cria o convite + slots e dispara o WhatsApp com a lista de horários.
// Idempotente por tarefa: convite ativo existente barra novo envio.
export async function enviarConviteAgendamento(
  supabase: SupabaseClient,
  taskId: string
): Promise<ResultadoConvite> {
  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, event_id, title, status, due_date, duracao_min, prazo_resposta_dias, canal_convite, supplier_id, local, suppliers(name, whatsapp, phone, email), events(date, cerimonialista_id, type, client_id, clients(name))"
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

  const cli = ev
    ? (Array.isArray(ev.clients) ? ev.clients[0] : ev.clients)
    : null;

  return criarEDisparar(supabase, {
    eventId: task.event_id,
    supplierId: task.supplier_id,
    titulo: task.title,
    duracaoMin: task.duracao_min ?? 60,
    prazoDias: task.prazo_resposta_dias ?? 5,
    ateData: task.due_date ?? ev.date ?? null,
    userId: ev.cerimonialista_id,
    taskId,
    supplierNome: sup?.name ?? "fornecedor",
    canal: (task.canal_convite as CanalConvite) ?? "whatsapp",
    telefone: sup?.whatsapp || sup?.phone || null,
    email: sup?.email || null,
    eventLabel: cli?.name ? `casamento de ${cli.name}` : "o evento",
  });
}
