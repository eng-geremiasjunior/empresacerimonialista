// Query de servidor da Organização (4B). Separada de organizacao.ts (puro,
// client-safe) para o componente client usar os tipos/itensDoMes sem puxar
// o client de servidor para o bundle.

import { createClient } from "@/lib/supabase/server";
import type {
  Compromisso,
  CompromissoEstado,
  Organizacao,
  PendenciaFinanceira,
  Tarefa,
  TarefaStatus,
} from "@/lib/supabase/organizacao";

export async function getOrganizacao(
  eventId: string,
  dataEvento: string | null
): Promise<Organizacao> {
  const supabase = createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, title, description, due_date, due_time, status, priority, category, responsavel, vinculo_modulo, evento_decisao(titulo)"
    )
    .eq("event_id", eventId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: true });

  const tarefas: Tarefa[] = (tasks ?? []).map((t) => {
    // PostgREST devolve o embed como objeto ou array conforme a relação;
    // normalizamos para pegar o título da decisão de origem.
    const emb = t.evento_decisao as
      | { titulo: string }
      | { titulo: string }[]
      | null;
    const decisao = Array.isArray(emb) ? emb[0] ?? null : emb;
    return {
      id: t.id,
      titulo: t.title,
      descricao: t.description,
      dueDate: t.due_date,
      dueTime: t.due_time,
      status: (t.status ?? "pendente") as TarefaStatus,
      priority: t.priority,
      category: t.category,
      responsavel: t.responsavel,
      origemDecisao: decisao?.titulo ?? null,
      vinculoModulo:
        (t.vinculo_modulo as "execucao" | "financeiro" | null) ?? null,
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

  const umObjeto = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? v[0] ?? null : v;

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
