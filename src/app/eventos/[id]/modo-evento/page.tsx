import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ModoEvento } from "@/components/modo-evento/ModoEvento";
import type { ItemChecklistDia } from "@/components/modo-evento/ChecklistDoDia";
import type { ModoItem, ModoSupplier } from "@/lib/modo-tema";
import type { CronogramaItem } from "@/lib/cronograma";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modo Evento — eorganizei",
};

export default async function ModoEventoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Itens condicionais que ligaram desde a última abertura entram agora.
  await supabase.rpc("semear_checklist_dia", { p_event_id: eventId });

  // Tudo escopado por event_id (RLS garante que é da cerimonialista logada).
  const [eventRes, itemsRes, linksRes, checklistRes] = await Promise.all([
    supabase
      .from("events")
      .select("type, date, time, clients(name)")
      .eq("id", eventId)
      .single(),
    // Fonte única do cronograma dinâmico (Etapa 3): status_novo,
    // horários reais, responsável, etc.
    supabase.rpc("cronograma_evento", { p_event_id: eventId }),
    supabase
      .from("roteiro_links")
      .select("confirmed, suppliers(name)")
      .eq("event_id", eventId),
    supabase
      .from("evento_checklist_dia")
      .select(
        "id, bloco, titulo, ordem, horario, conferido_em, responsavel:membros_equipe!evento_checklist_dia_responsavel_membro_id_fkey(nome), conferidor:membros_equipe!evento_checklist_dia_conferido_por_fkey(nome)"
      )
      .eq("event_id", eventId)
      .eq("ativo", true)
      .order("bloco")
      .order("ordem"),
  ]);

  if (!eventRes.data) {
    notFound();
  }

  const event = eventRes.data as unknown as {
    type: EventType;
    date: string;
    time: string | null;
    clients: { name: string } | null;
  };

  const eventLabel = `${EVENT_TYPE_LABELS[event.type]} — ${
    event.clients?.name ?? "Sem cliente"
  }`;

  const items: ModoItem[] = (
    (itemsRes.data ?? []) as unknown as CronogramaItem[]
  ).map((i) => ({
    id: i.id,
    time: i.time,
    origemHorario: i.origem_horario ?? null,
    title: i.title,
    description: i.description,
    statusNovo: i.status_novo,
    supplierName: i.supplier_name,
    responsavelNome: i.responsavel_nome,
    horarioRealInicio: i.horario_real_inicio,
    horarioRealFim: i.horario_real_fim,
    observacao: i.observacao,
  }));

  const suppliers: ModoSupplier[] = (
    (linksRes.data ?? []) as unknown as {
      confirmed: boolean;
      suppliers: { name: string } | null;
    }[]
  )
    .filter((l) => l.suppliers)
    .map((l) => ({ name: l.suppliers!.name, confirmed: l.confirmed }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const checklist: ItemChecklistDia[] = (
    (checklistRes.data ?? []) as unknown as {
      id: string;
      bloco: ItemChecklistDia["bloco"];
      titulo: string;
      ordem: number;
      horario: string | null;
      conferido_em: string | null;
      responsavel: { nome: string } | { nome: string }[] | null;
      conferidor: { nome: string } | { nome: string }[] | null;
    }[]
  ).map((i) => {
    const um = <T,>(v: T | T[] | null): T | null =>
      Array.isArray(v) ? (v[0] ?? null) : v;
    return {
      id: i.id,
      bloco: i.bloco,
      titulo: i.titulo,
      ordem: i.ordem,
      horario: i.horario,
      conferidoEm: i.conferido_em,
      responsavelNome: um(i.responsavel)?.nome ?? null,
      conferidoPorNome: um(i.conferidor)?.nome ?? null,
    };
  });

  return (
    <ModoEvento
      eventId={eventId}
      eventLabel={eventLabel}
      eventDate={event.date}
      eventTime={event.time}
      items={items}
      suppliers={suppliers}
      checklist={checklist}
    />
  );
}
