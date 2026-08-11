// Job diário do Secretário Executivo.
// Chamado pelo agendador (Vercel Cron) com Authorization: Bearer CRON_SECRET.
// Service role: roda sem sessão, varrendo eventos de todas as empresas.
//
// Três passos, todos determinísticos por data:
//   1) DISPARO  — tarefa com auto_agendar ligado e convite_data vencida,
//                 sem convite ativo → envia a lista de horários.
//   2) REENVIO  — convite sem resposta após reenvio_horas → manda de novo
//                 (uma vez), com os horários que AINDA estão livres.
//   3) EXPIRAÇÃO— passou o prazo → marca expirado e avisa a cerimonialista:
//                 volta para o agendamento manual.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enviarConviteAgendamento } from "@/lib/agendamento";
import { enviarConviteAgendamentoWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

type Sb = NonNullable<ReturnType<typeof serviceClient>>;

async function notificar(
  supabase: Sb,
  eventId: string,
  titulo: string,
  mensagem: string,
  taskId?: string
) {
  const { data: ev } = await supabase
    .from("events")
    .select("cerimonialista_id")
    .eq("id", eventId)
    .single();
  if (!ev?.cerimonialista_id) return;
  await supabase.from("notifications").insert({
    cerimonialista_id: ev.cerimonialista_id,
    type: "compromisso",
    title: titulo,
    message: mensagem,
    link: `/eventos/${eventId}/organizacao${taskId ? `?tarefa=${taskId}` : ""}`,
  });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no ambiente" },
      { status: 500 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente" },
      { status: 500 }
    );
  }

  const hoje = new Date();
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const agora = new Date().toISOString();

  // ---- 1) DISPARO -------------------------------------------------
  const { data: paraDisparar } = await supabase
    .from("tasks")
    .select("id, title, event_id")
    .eq("auto_agendar", true)
    .neq("status", "concluido")
    .not("supplier_id", "is", null)
    .not("convite_data", "is", null)
    .lte("convite_data", hojeIso);

  const disparos: { taskId: string; ok: boolean; motivo?: string }[] = [];
  for (const t of paraDisparar ?? []) {
    // convite ativo (ou já respondido) barra novo envio
    const { data: existente } = await supabase
      .from("agendamento_convite")
      .select("id, status")
      .eq("task_id", t.id)
      .in("status", ["enviado", "reenviado", "respondido", "sugerido"])
      .maybeSingle();
    if (existente) continue;

    const r = await enviarConviteAgendamento(supabase, t.id);
    disparos.push({ taskId: t.id, ok: r.ok, motivo: r.ok ? undefined : r.motivo });
    if (!r.ok) {
      await notificar(
        supabase,
        t.event_id,
        `Convite não enviado: ${t.title}`,
        `${r.motivo}. Agende manualmente.`,
        t.id
      );
    }
  }

  // ---- 2) REENVIO -------------------------------------------------
  const { data: paraReenviar } = await supabase
    .from("agendamento_convite")
    .select(
      "id, hash, task_id, event_id, duracao_min, prazo_ate, enviado_em, supplier_id, tasks(title, due_date, reenvio_horas), suppliers(name, whatsapp, phone), events(date, cerimonialista_id, clients(name))"
    )
    .eq("status", "enviado")
    .gt("prazo_ate", agora);

  const reenvios: { conviteId: string; ok: boolean }[] = [];
  for (const c of paraReenviar ?? []) {
    const task = Array.isArray(c.tasks) ? c.tasks[0] : c.tasks;
    const horas = task?.reenvio_horas ?? 48;
    const limite = new Date(c.enviado_em).getTime() + horas * 3_600_000;
    if (Date.now() < limite) continue;

    const sup = Array.isArray(c.suppliers) ? c.suppliers[0] : c.suppliers;
    const ev = Array.isArray(c.events) ? c.events[0] : c.events;
    const telefone = sup?.whatsapp || sup?.phone;
    if (!telefone || !ev?.cerimonialista_id) continue;

    // Reenvia só o que AINDA está livre — a Agenda pode ter mudado.
    const { data: slots } = await supabase
      .from("agendamento_slot")
      .select("id, data, hora")
      .eq("convite_id", c.id)
      .gte("data", hojeIso)
      .order("data")
      .order("hora");
    const livres: { id: string; data: string; hora: string }[] = [];
    for (const s of slots ?? []) {
      const { data: ocupado } = await supabase.rpc("horario_ocupado", {
        p_user_id: ev.cerimonialista_id,
        p_data: s.data,
        p_hora: s.hora,
        p_duracao_min: c.duracao_min,
      });
      if (!ocupado) livres.push({ id: s.id, data: s.data, hora: String(s.hora).slice(0, 5) });
    }

    if (livres.length === 0) {
      // nada sobrou para oferecer: expira já e devolve ao manual
      await supabase
        .from("agendamento_convite")
        .update({ status: "expirado" })
        .eq("id", c.id);
      await notificar(
        supabase,
        c.event_id,
        `Sem horários livres: ${task?.title ?? "tarefa"}`,
        "Os horários oferecidos foram ocupados e o fornecedor não escolheu. Agende manualmente.",
        c.task_id
      );
      continue;
    }

    const cli = ev ? (Array.isArray(ev.clients) ? ev.clients[0] : ev.clients) : null;
    const envio = await enviarConviteAgendamentoWhatsapp({
      telefone,
      supplierName: sup!.name,
      tarefa: task?.title ?? "agendamento",
      eventLabel: cli?.name ? `casamento de ${cli.name}` : "o evento",
      duracaoMin: c.duracao_min,
      hash: c.hash,
      prazoDias: Math.max(
        1,
        Math.ceil((new Date(c.prazo_ate).getTime() - Date.now()) / 86_400_000)
      ),
      slots: livres,
    });

    if (envio.ok) {
      await supabase
        .from("agendamento_convite")
        .update({ status: "reenviado", reenviado_em: new Date().toISOString() })
        .eq("id", c.id);
      reenvios.push({ conviteId: c.id, ok: true });
    }
  }

  // ---- 3) EXPIRAÇÃO (volta ao manual + aviso) ---------------------
  const { data: vencidos } = await supabase
    .from("agendamento_convite")
    .select("id, task_id, event_id, tasks(title), suppliers(name)")
    .in("status", ["enviado", "reenviado"])
    .lt("prazo_ate", agora);

  for (const c of vencidos ?? []) {
    await supabase
      .from("agendamento_convite")
      .update({ status: "expirado" })
      .eq("id", c.id);
    const task = Array.isArray(c.tasks) ? c.tasks[0] : c.tasks;
    const sup = Array.isArray(c.suppliers) ? c.suppliers[0] : c.suppliers;
    await notificar(
      supabase,
      c.event_id,
      `${sup?.name ?? "Fornecedor"} não confirmou o agendamento`,
      `${task?.title ?? "Tarefa"} voltou para agendamento manual.`,
      c.task_id
    );
  }

  return NextResponse.json({
    ok: true,
    disparos,
    reenvios: reenvios.length,
    expirados: (vencidos ?? []).length,
  });
}

