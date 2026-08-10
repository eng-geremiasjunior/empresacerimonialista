// Query de servidor da Organização — separada de organizacao.ts (puro,
// client-safe) para o componente client usar tipos/helpers sem puxar o
// client de servidor para o bundle.

import { createClient } from "@/lib/supabase/server";
import type {
  ChecklistItem,
  Compromisso,
  CompromissoEstado,
  Organizacao,
  PendenciaFinanceira,
  Tarefa,
  TarefaStatus,
} from "@/lib/supabase/organizacao";

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
  created_at: string | null;
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
      "id, title, description, due_date, due_time, status, priority, category, responsavel, vinculo_modulo, supplier_id, local, valor, convite_data, created_at, " +
        "suppliers(name), " +
        "evento_decisao(id, titulo, evento_objetivo(nome)), " +
        "task_checklist(id, texto, feito, ordem)"
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
      checklist,
      criadaEm: t.created_at,
    };
  });

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
    .select("id, titulo, tipo, created_at")
    .eq("event_id", eventId)
    .eq("status", "aberta")
    .order("created_at", { ascending: false });

  const pendencias: PendenciaFinanceira[] = (pend ?? []).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    tipo: p.tipo as "pagamento" | "revisao",
    criadaEm: p.created_at,
  }));

  const diasAteEvento = dataEvento
    ? Math.round(
        (new Date(`${dataEvento}T00:00:00`).getTime() -
          new Date(new Date().toDateString()).getTime()) /
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
  };
}
