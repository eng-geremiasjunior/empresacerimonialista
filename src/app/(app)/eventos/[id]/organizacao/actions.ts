"use server";

// Ações da Organização: compromissos (Agenda) e o envio de confirmação por
// WhatsApp. A RLS por evento (pode_editar_evento) é a guarda real; aqui só
// gravamos e revalidamos a rota.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  enviarConfirmacaoCompromissoWhatsapp,
  enviarMensagemWhatsapp,
} from "@/lib/whatsapp";
import {
  enviarConviteAgendamento,
  enviarConviteAvulso,
} from "@/lib/agendamento";

export type AcaoResult = { error: string } | { success: true };

const RESPONSAVEIS = ["noivos", "cerimonialista", "ambos"] as const;

// Pendência financeira: a automação abre o rascunho, a cerimonialista
// decide. "Descartar" fecha sem lançar nada — dinheiro nunca se move sozinho.
// Confirmar de fato (com valor/fornecedor) acontece no Financeiro.
export async function descartarPendencia(
  eventId: string,
  pendenciaId: string
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("financeiro_pendencia")
    .update({ status: "descartada", resolvida_em: new Date().toISOString() })
    .eq("id", pendenciaId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível descartar a pendência." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

// Concluir/reabrir uma tarefa direto da Organização. Determinística (recebe
// o estado desejado) para casar com a UI otimista — clicar duas vezes rápido
// não inverte o resultado. A RLS por evento é a guarda.
export async function alternarTarefa(
  eventId: string,
  taskId: string,
  concluir: boolean
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: concluir ? "concluido" : "pendente" })
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar a tarefa." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

// ------------------------------------------------------------
// Tarefa como fonte única (076): CRUD do drawer
// ------------------------------------------------------------

export type TarefaForm = {
  titulo?: string;
  descricao?: string | null;
  status?: string;
  priority?: string | null;
  dueDate?: string | null; // yyyy-mm-dd
  dueTime?: string | null; // HH:mm
  responsavel?: string | null;
  supplierId?: string | null;
  local?: string | null;
  valor?: number | null;
  conviteData?: string | null;
  // offset em dias antes do EVENTO (anexo 1: "disparar [21] dias antes");
  // null = data manual ("Editar data"), que segue conviteData.
  conviteOffsetDias?: number | null;
  prazoRespostaDias?: number;
  reenvioHoras?: number;
  categoria?: string | null;
  autoAgendar?: boolean;
  duracaoMin?: number;
};

function tarefaRow(form: TarefaForm) {
  // Monta só os campos presentes — o drawer salva parcial sem apagar o resto.
  const row: Record<string, unknown> = {};
  if (form.titulo !== undefined) row.title = form.titulo.trim();
  if (form.descricao !== undefined) row.description = form.descricao?.trim() || null;
  if (form.status !== undefined) row.status = form.status;
  if (form.priority !== undefined) row.priority = form.priority || null;
  if (form.dueDate !== undefined) row.due_date = form.dueDate || null;
  if (form.dueTime !== undefined) row.due_time = form.dueTime || null;
  if (form.responsavel !== undefined)
    row.responsavel =
      form.responsavel && RESPONSAVEIS.includes(form.responsavel as never)
        ? form.responsavel
        : null;
  if (form.supplierId !== undefined) row.supplier_id = form.supplierId || null;
  if (form.local !== undefined) row.local = form.local?.trim() || null;
  if (form.valor !== undefined)
    row.valor = form.valor === null || Number.isNaN(form.valor) ? null : form.valor;
  if (form.conviteData !== undefined) row.convite_data = form.conviteData || null;
  if (form.conviteOffsetDias !== undefined)
    row.convite_offset_dias =
      form.conviteOffsetDias === null || Number.isNaN(form.conviteOffsetDias)
        ? null
        : form.conviteOffsetDias;
  if (form.prazoRespostaDias !== undefined && Number.isFinite(form.prazoRespostaDias))
    row.prazo_resposta_dias = Math.min(30, Math.max(1, form.prazoRespostaDias));
  if (form.reenvioHoras !== undefined && Number.isFinite(form.reenvioHoras))
    row.reenvio_horas = Math.min(168, Math.max(1, form.reenvioHoras));
  if (form.categoria !== undefined) row.category = form.categoria || "geral";
  if (form.autoAgendar !== undefined) row.auto_agendar = form.autoAgendar;
  if (form.duracaoMin !== undefined && Number.isFinite(form.duracaoMin))
    row.duracao_min = form.duracaoMin;
  return row;
}

export async function criarTarefa(
  eventId: string,
  form: TarefaForm
): Promise<AcaoResult & { id?: string }> {
  const titulo = form.titulo?.trim();
  if (!titulo) return { error: "Dê um título à tarefa." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      event_id: eventId,
      status: "pendente",
      category: "geral",
      priority: "media",
      ...tarefaRow(form),
      title: titulo,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível criar a tarefa." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true, id: data.id };
}

export async function atualizarTarefa(
  eventId: string,
  taskId: string,
  form: TarefaForm
): Promise<AcaoResult> {
  if (form.titulo !== undefined && !form.titulo.trim()) {
    return { error: "O título não pode ficar vazio." };
  }
  const row = tarefaRow(form);
  if (Object.keys(row).length === 0) return { success: true };

  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update(row)
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível salvar a tarefa." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

export async function excluirTarefa(
  eventId: string,
  taskId: string
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível excluir a tarefa." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

// Disparo MANUAL do convite de agendamento ("Disparar agora"). Mesmo núcleo
// do cron; a RLS da sessão limita ao que a cerimonialista pode editar.
export async function dispararConvite(
  eventId: string,
  taskId: string
): Promise<AcaoResult> {
  const supabase = createClient();

  // guarda de escopo: a tarefa precisa ser deste evento
  const { data: t } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!t) return { error: "Tarefa não encontrada." };

  const r = await enviarConviteAgendamento(supabase, taskId);
  if (!r.ok) return { error: r.motivo };

  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

// Sugestão de horário do fornecedor ("nenhum serve"): a cerimonialista
// aprova (vira compromisso confirmado, com a vaga revalidada) ou recusa
// (convite encerra e o fornecedor é avisado — ela combina manualmente).
export async function aprovarSugestao(
  eventId: string,
  conviteId: string
): Promise<AcaoResult> {
  const supabase = createClient();

  const { data: conv } = await supabase
    .from("agendamento_convite")
    .select(
      "id, status, sugestao_data, sugestao_hora, duracao_min, task_id, supplier_id, tasks(title, local, evento_decisao_id), suppliers(name, whatsapp, phone), events!inner(cerimonialista_id)"
    )
    .eq("id", conviteId)
    .eq("event_id", eventId)
    .single();

  if (!conv || conv.status !== "sugerido" || !conv.sugestao_data || !conv.sugestao_hora) {
    return { error: "Não há sugestão pendente neste convite." };
  }

  const ev = Array.isArray(conv.events) ? conv.events[0] : conv.events;
  const task = Array.isArray(conv.tasks) ? conv.tasks[0] : conv.tasks;
  const sup = Array.isArray(conv.suppliers) ? conv.suppliers[0] : conv.suppliers;

  // Vaga revalidada também aqui: a sugestão pode colidir com a Agenda.
  const { data: ocupado } = await supabase.rpc("horario_ocupado", {
    p_user_id: ev!.cerimonialista_id,
    p_data: conv.sugestao_data,
    p_hora: conv.sugestao_hora,
    p_duracao_min: conv.duracao_min,
  });
  if (ocupado) {
    return { error: "Esse horário colide com um compromisso seu. Recuse e combine outro." };
  }

  const { data: comp, error: eComp } = await supabase
    .from("compromisso")
    .insert({
      event_id: eventId,
      titulo: task?.title ?? "Reunião com fornecedor",
      data: conv.sugestao_data,
      hora: conv.sugestao_hora,
      local: task?.local ?? null,
      supplier_id: conv.supplier_id,
      task_id: conv.task_id,
      evento_decisao_id: task?.evento_decisao_id ?? null,
      estado: "confirmado",
      duracao_min: conv.duracao_min,
      confirmado_em: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (eComp || !comp) return { error: "Não foi possível criar o compromisso." };

  const { error: eConv } = await supabase
    .from("agendamento_convite")
    .update({ status: "respondido", compromisso_id: comp.id })
    .eq("id", conviteId);
  if (eConv) return { error: "Compromisso criado, mas o convite não fechou." };

  // avisa o fornecedor no canal que ele já usou
  const tel = sup?.whatsapp || sup?.phone;
  if (tel) {
    const [a, m, d] = conv.sugestao_data.split("-");
    await enviarMensagemWhatsapp(
      tel,
      `Confirmado! ${d}/${m}/${a} às ${String(conv.sugestao_hora).slice(0, 5)}. Obrigado!`
    );
  }

  revalidatePath(`/eventos/${eventId}/organizacao`);
  revalidatePath("/agenda");
  return { success: true };
}

export async function recusarSugestao(
  eventId: string,
  conviteId: string
): Promise<AcaoResult> {
  const supabase = createClient();

  const { data: conv } = await supabase
    .from("agendamento_convite")
    .select("id, status, suppliers(name, whatsapp, phone)")
    .eq("id", conviteId)
    .eq("event_id", eventId)
    .single();
  if (!conv || conv.status !== "sugerido") {
    return { error: "Não há sugestão pendente neste convite." };
  }

  const { error } = await supabase
    .from("agendamento_convite")
    .update({ status: "cancelado" })
    .eq("id", conviteId);
  if (error) return { error: "Não foi possível recusar." };

  const sup = Array.isArray(conv.suppliers) ? conv.suppliers[0] : conv.suppliers;
  const tel = sup?.whatsapp || sup?.phone;
  if (tel) {
    await enviarMensagemWhatsapp(
      tel,
      "Esse horário não vai dar. A cerimonialista entra em contato para combinar."
    );
  }

  revalidatePath(`/eventos/${eventId}/organizacao`);
  revalidatePath("/agenda");
  return { success: true };
}

// Sub-checklist: passos dentro da tarefa. Determinístico (recebe o estado).
export async function alternarChecklist(
  eventId: string,
  itemId: string,
  feito: boolean
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("task_checklist")
    .update({ feito })
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar o item." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

export async function adicionarChecklistItem(
  eventId: string,
  taskId: string,
  texto: string,
  ordem: number
): Promise<AcaoResult & { id?: string }> {
  const t = texto.trim();
  if (!t) return { error: "Escreva o passo." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("task_checklist")
    .insert({ event_id: eventId, task_id: taskId, texto: t, ordem })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível adicionar o item." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true, id: data.id };
}

export async function removerChecklistItem(
  eventId: string,
  itemId: string
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("task_checklist")
    .delete()
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível remover o item." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

export async function criarCompromisso(
  eventId: string,
  form: {
    titulo: string;
    data: string; // yyyy-mm-dd
    hora?: string | null; // HH:mm
    local?: string | null;
    responsavel?: string | null;
    observacao?: string | null;
    supplierId?: string | null;
    // Secretário na Agenda (080): em vez de marcar o horário, manda o
    // fornecedor escolher. Sem data — a reunião nasce quando ele responde.
    agendarAutomatico?: boolean;
    duracaoMin?: number;
    prazoRespostaDias?: number;
  }
): Promise<AcaoResult> {
  const titulo = form.titulo?.trim();
  if (!titulo) return { error: "Dê um título ao compromisso." };

  // Caminho do agendamento automático: dispara o convite e sai.
  if (form.agendarAutomatico) {
    if (!form.supplierId) {
      return { error: "Escolha o fornecedor para o sistema agendar com ele." };
    }
    const supabase = createClient();
    const r = await enviarConviteAvulso(supabase, {
      eventId,
      supplierId: form.supplierId,
      titulo,
      duracaoMin: form.duracaoMin ?? 60,
      prazoDias: form.prazoRespostaDias ?? 5,
      ateData: form.data || null,
    });
    if (!r.ok) return { error: r.motivo };
    revalidatePath(`/eventos/${eventId}/organizacao`);
    revalidatePath("/agenda");
    return { success: true };
  }

  if (!form.data) return { error: "Escolha a data." };

  const responsavel =
    form.responsavel && RESPONSAVEIS.includes(form.responsavel as never)
      ? form.responsavel
      : null;

  const supabase = createClient();
  const { error } = await supabase.from("compromisso").insert({
    event_id: eventId,
    titulo,
    data: form.data,
    hora: form.hora || null,
    local: form.local?.trim() || null,
    responsavel,
    observacao: form.observacao?.trim() || null,
    supplier_id: form.supplierId || null,
  });

  if (error) return { error: "Não foi possível criar o compromisso." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

// Remarcar / cancelar manualmente pela cerimonialista.
export async function mudarEstadoCompromisso(
  eventId: string,
  compromissoId: string,
  estado: "agendado" | "confirmado" | "cancelado" | "remarcado"
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("compromisso")
    .update({ estado })
    .eq("id", compromissoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar o compromisso." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

export async function excluirCompromisso(
  eventId: string,
  compromissoId: string
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("compromisso")
    .delete()
    .eq("id", compromissoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível excluir o compromisso." };
  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}

// Envio MANUAL da confirmação: a cerimonialista dispara; o fornecedor
// responde por botão (o hash do compromisso vai no id do botão). O disparo
// automático agendado é de outra etapa.
export async function enviarConfirmacaoCompromisso(
  eventId: string,
  compromissoId: string
): Promise<AcaoResult> {
  const supabase = createClient();

  const { data: c } = await supabase
    .from("compromisso")
    .select(
      "titulo, data, hora, local, hash, supplier_id, suppliers(name, whatsapp, phone), events(type, client_id)"
    )
    .eq("id", compromissoId)
    .eq("event_id", eventId)
    .single();

  if (!c) return { error: "Compromisso não encontrado." };
  if (!c.supplier_id)
    return { error: "Vincule um fornecedor antes de pedir confirmação." };

  const sup = Array.isArray(c.suppliers) ? c.suppliers[0] : c.suppliers;
  const telefone = sup?.whatsapp || sup?.phone;
  if (!telefone)
    return { error: "O fornecedor não tem WhatsApp cadastrado." };

  const ev = Array.isArray(c.events) ? c.events[0] : c.events;

  // event_label é montado no banco em outros fluxos; aqui uma legenda simples
  // basta para a mensagem.
  const eventLabel =
    ev?.type === "casamento" ? "seu casamento" : "sua festa";

  const res = await enviarConfirmacaoCompromissoWhatsapp({
    telefone,
    supplierName: sup?.name ?? "fornecedor",
    titulo: c.titulo,
    eventLabel,
    data: c.data,
    hora: c.hora ? String(c.hora).slice(0, 5) : null,
    local: c.local,
    hash: c.hash,
  });

  if (!res.ok) {
    return {
      error: res.configurado
        ? `Falha ao enviar: ${res.error ?? "erro desconhecido"}`
        : "WhatsApp não está configurado no servidor.",
    };
  }

  revalidatePath(`/eventos/${eventId}/organizacao`);
  return { success: true };
}
