// Query de servidor da Organização — separada de organizacao.ts (puro,
// client-safe) para o componente client usar tipos/helpers sem puxar o
// client de servidor para o bundle.

import { createClient } from "@/lib/supabase/server";
import type {
  ChecklistItem,
  Compromisso,
  CompromissoEstado,
  Disparo,
  Organizacao,
  PendenciaFinanceira,
  Tarefa,
  TarefaStatus,
} from "@/lib/supabase/organizacao";
import { inicioDoDiaBR } from "@/lib/tempo";

const umObjeto = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? v[0] ?? null : v;

// Linha crua do select de tasks — o parser de tipos do supabase-js não
// infere selects montados por concatenação, então tipamos à mão.
type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  responsavel: string | null;
  vinculo_modulo: string | null;
  supplier_id: string | null;
  local: string | null;
  valor: number | string | null;
  convite_data: string | null;
  convite_offset_dias: number | null;
  prazo_resposta_dias: number | null;
  reenvio_horas: number | null;
  auto_agendar: boolean | null;
  canal_convite: string | null;
  duracao_min: number | null;
  created_at: string | null;
  agendamento_convite:
    | {
        id: string;
        status: string;
        enviado_em: string;
        prazo_ate: string;
        created_at: string;
        sugestao_data: string | null;
        sugestao_hora: string | null;
      }[]
    | null;
  suppliers: { name: string } | { name: string }[] | null;
  evento_decisao:
    | { id: string; titulo: string; evento_objetivo: { nome: string } | { nome: string }[] | null }
    | { id: string; titulo: string; evento_objetivo: { nome: string } | { nome: string }[] | null }[]
    | null;
  task_checklist: ChecklistItem[] | null;
};

export async function getOrganizacao(
  eventId: string,
  dataEvento: string | null
): Promise<Organizacao> {
  const supabase = createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, description, due_date, due_time, status, priority, category, responsavel, vinculo_modulo, supplier_id, local, valor, convite_data, convite_offset_dias, prazo_resposta_dias, reenvio_horas, auto_agendar, duracao_min, canal_convite, created_at, " +
        "suppliers(name), " +
        "evento_decisao(id, titulo, evento_objetivo(nome)), " +
        "task_checklist(id, texto, feito, ordem), " +
        "agendamento_convite(id, status, enviado_em, prazo_ate, created_at, sugestao_data, sugestao_hora)"
    )
    .eq("event_id", eventId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: true });

  const tarefas: Tarefa[] = ((tasks ?? []) as unknown as TaskRow[]).map((t) => {
    // PostgREST devolve embeds como objeto ou array conforme a relação.
    const decisao = umObjeto(t.evento_decisao);
    const objetivo = decisao ? umObjeto(decisao.evento_objetivo) : null;
    const sup = umObjeto(t.suppliers);
    const checklist: ChecklistItem[] = (t.task_checklist ?? [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem);
    return {
      id: t.id,
      titulo: t.title,
      descricao: t.description,
      dueDate: t.due_date,
      dueTime: t.due_time ? String(t.due_time).slice(0, 5) : null,
      status: (t.status ?? "pendente") as TarefaStatus,
      priority: t.priority,
      category: t.category,
      responsavel: t.responsavel,
      origemDecisao: decisao?.titulo ?? null,
      origemObjetivo: objetivo?.nome ?? null,
      decisaoId: decisao?.id ?? null,
      vinculoModulo:
        (t.vinculo_modulo as "execucao" | "financeiro" | null) ?? null,
      supplierId: t.supplier_id,
      supplierNome: sup?.name ?? null,
      local: t.local,
      valor: t.valor === null || t.valor === undefined ? null : Number(t.valor),
      conviteData: t.convite_data,
      conviteOffsetDias: t.convite_offset_dias,
      prazoRespostaDias: t.prazo_resposta_dias ?? 5,
      reenvioHoras: t.reenvio_horas ?? 48,
      autoAgendar: t.auto_agendar ?? false,
      duracaoMin: t.duracao_min ?? 60,
      canalConvite: (t.canal_convite as "whatsapp" | "email") ?? "whatsapp",
      convite: (() => {
        const c = (t.agendamento_convite ?? [])
          .slice()
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        return c
          ? {
              id: c.id,
              status: c.status as NonNullable<Tarefa["convite"]>["status"],
              enviadoEm: c.enviado_em,
              prazoAte: c.prazo_ate,
              sugestaoData: c.sugestao_data,
              sugestaoHora: c.sugestao_hora
                ? String(c.sugestao_hora).slice(0, 5)
                : null,
            }
          : null;
      })(),
      checklist,
      criadaEm: t.created_at,
    };
  });

  // Central de Disparos: programados (auto ligado, convite futuro/sem envio)
  // + convites já disparados, num feed único ordenado por data.
  const disparos: Disparo[] = [];
  for (const t of tarefas) {
    if (t.convite) {
      disparos.push({
        id: `c-${t.id}`,
        tarefa: t.titulo,
        taskId: t.id,
        fornecedor: t.supplierNome,
        status: t.convite.status === "cancelado" ? "expirado" : t.convite.status,
        data: t.convite.enviadoEm.slice(0, 10),
      });
    } else if (t.autoAgendar && t.supplierId && t.status !== "concluido") {
      disparos.push({
        id: `p-${t.id}`,
        tarefa: t.titulo,
        taskId: t.id,
        fornecedor: t.supplierNome,
        status: "agendado",
        data: t.conviteData ?? "",
      });
    }
  }
  // Convites AVULSOS (080): nascem na Agenda, sem tarefa por trás — não
  // apareceriam no laço acima, que percorre tarefas.
  const { data: avulsos } = await supabase
    .from("agendamento_convite")
    .select("id, titulo, status, enviado_em, suppliers(name)")
    .eq("event_id", eventId)
    .is("task_id", null)
    .in("status", ["enviado", "reenviado", "sugerido", "respondido"])
    .order("enviado_em", { ascending: true });

  for (const c of avulsos ?? []) {
    const s = umObjeto(c.suppliers as { name: string } | { name: string }[] | null);
    disparos.push({
      id: `a-${c.id}`,
      tarefa: c.titulo ?? "Reunião",
      taskId: "",
      fornecedor: s?.name ?? null,
      status: c.status as Disparo["status"],
      data: c.enviado_em.slice(0, 10),
    });
  }

  disparos.sort((a, b) => a.data.localeCompare(b.data));

  // COMPROMISSO (Agenda): evento no tempo com fornecedor e origem opcionais.
  const { data: comps } = await supabase
    .from("compromisso")
    .select(
      "id, titulo, data, hora, local, responsavel, estado, observacao, supplier_id, suppliers(name, whatsapp, phone), evento_decisao(titulo)"
    )
    .eq("event_id", eventId)
    .order("data", { ascending: true })
    .order("hora", { ascending: true, nullsFirst: true });

  const compromissos: Compromisso[] = (comps ?? []).map((c) => {
    const sup = umObjeto(
      c.suppliers as
        | { name: string; whatsapp: string | null; phone: string | null }
        | { name: string; whatsapp: string | null; phone: string | null }[]
        | null
    );
    const dec = umObjeto(
      c.evento_decisao as { titulo: string } | { titulo: string }[] | null
    );
    return {
      id: c.id,
      titulo: c.titulo,
      data: c.data,
      hora: c.hora ? String(c.hora).slice(0, 5) : null,
      local: c.local,
      responsavel: c.responsavel,
      estado: (c.estado ?? "agendado") as CompromissoEstado,
      observacao: c.observacao,
      supplierId: c.supplier_id,
      supplierNome: sup?.name ?? null,
      supplierWhatsapp: sup?.whatsapp ?? sup?.phone ?? null,
      origemDecisao: dec?.titulo ?? null,
    };
  });

  // Pendências financeiras abertas pela automação (074). Se a migração
  // ainda não rodou, degrada para lista vazia em vez de quebrar a tela.
  const { data: pend } = await supabase
    .from("financeiro_pendencia")
    .select("id, titulo, tipo, created_at, task_id, evento_recurso_id")
    .eq("event_id", eventId)
    .eq("status", "aberta")
    .order("created_at", { ascending: false });

  const pendencias: PendenciaFinanceira[] = (pend ?? []).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    tipo: p.tipo as "pagamento" | "revisao",
    criadaEm: p.created_at,
    // sem tarefa e sem recurso: é a defasagem do público (137)
    daDefasagem:
      p.tipo === "revisao" && !p.task_id && !p.evento_recurso_id,
  }));

  const diasAteEvento = dataEvento
    ? Math.round(
        (new Date(`${dataEvento}T00:00:00`).getTime() -
          inicioDoDiaBR().getTime()) /
          86_400_000
      )
    : null;

  return {
    diasAteEvento,
    dataEvento,
    tarefas,
    tarefasAbertas: tarefas.filter((t) => t.status !== "concluido").length,
    compromissos,
    agendaDisponivel: true,
    pendencias,
    disparos,
  };
}
