"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RoteiroStatusNovo } from "@/lib/types";

export type RoteiroFormState = { error: string } | { success: true } | null;

const STATUSES_NOVO: RoteiroStatusNovo[] = [
  "planejado",
  "em_andamento",
  "concluido",
  "problema",
];

// status_novo -> status antigo (coexistência até a limpeza final).
// 'problema' não tem equivalente antigo: mapeia para em_andamento.
const STATUS_ANTIGO: Record<RoteiroStatusNovo, string> = {
  planejado: "pendente",
  em_andamento: "em_andamento",
  concluido: "concluido",
  problema: "em_andamento",
};

function readForm(formData: FormData) {
  const duracaoRaw = String(formData.get("duracao_minutos") ?? "").trim();
  return {
    time: String(formData.get("time") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    // Só um fornecedor JÁ VINCULADO ao evento (via aba Fornecedores).
    supplierId: String(formData.get("supplier_id") ?? "") || null,
    responsavelNome: String(formData.get("responsavel_nome") ?? "").trim(),
    responsavelTelefone: String(
      formData.get("responsavel_telefone") ?? ""
    ).trim(),
    etapaObrigatoria: formData.get("etapa_obrigatoria") === "on",
    duracaoMinutos: duracaoRaw ? Number(duracaoRaw) : null,
    // Item que precisa terminar antes deste. Só faz sentido com o tipo:
    // sem dependência escolhida, os dois vão nulos.
    dependeDe: String(formData.get("depende_de") ?? "") || null,
    tipoDependencia:
      String(formData.get("tipo_dependencia") ?? "") === "suave"
        ? "suave"
        : "dura",
  };
}

function validate(form: ReturnType<typeof readForm>): string | null {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(form.time)) return "Informe o horário.";
  if (!form.title) return "Informe o título do item.";
  if (
    form.duracaoMinutos !== null &&
    (Number.isNaN(form.duracaoMinutos) || form.duracaoMinutos < 0)
  ) {
    return "Duração inválida.";
  }
  return null;
}

// "16:00" -> "16:00:00" (formato da coluna time do Postgres)
function normalizeTime(time: string) {
  return time.length === 5 ? `${time}:00` : time;
}

// Não existe checagem de horário duplicado de propósito: no dia do evento
// várias equipes trabalham ao mesmo tempo (o som monta enquanto a
// decoração monta), e recusar o segundo item no mesmo horário obrigava a
// falsear o cronograma. A visão de raias mostra esses itens em paralelo e
// avisa quando o MESMO fornecedor fica em dois lugares de uma vez.

export async function createRoteiroItem(
  eventId: string,
  _prev: RoteiroFormState,
  formData: FormData
): Promise<RoteiroFormState> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const time = normalizeTime(form.time);

  const { error } = await supabase.from("roteiro_items").insert({
    event_id: eventId,
    time,
    // digitado por ela: firme — o recálculo da âncora não toca
    origem_horario: "manual",
    title: form.title,
    description: form.description || null,
    supplier_id: form.supplierId,
    status: "pendente",
    status_novo: "planejado",
    responsavel_nome: form.responsavelNome || null,
    responsavel_telefone: form.responsavelTelefone || null,
    etapa_obrigatoria: form.etapaObrigatoria,
    duracao_minutos: form.duracaoMinutos,
    depende_de: form.dependeDe,
    tipo_dependencia: form.dependeDe ? form.tipoDependencia : null,
  });

  if (error) {
    return { error: "Não foi possível salvar o item. Tente novamente." };
  }

  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { success: true };
}

export async function updateRoteiroItem(
  eventId: string,
  itemId: string,
  _prev: RoteiroFormState,
  formData: FormData
): Promise<RoteiroFormState> {
  const form = readForm(formData);
  const invalid = validate(form);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const time = normalizeTime(form.time);

  // A hora mudou? Então foi ELA quem decidiu o novo horário, e ele vira
  // firme. Editar só título/descrição preserva a origem — senão toda
  // correção de texto congelaria uma estimativa.
  const { data: atual } = await supabase
    .from("roteiro_items")
    .select("time")
    .eq("id", itemId)
    .eq("event_id", eventId)
    .maybeSingle();
  const horaAtual = atual?.time ? String(atual.time).slice(0, 5) : null;
  const horaNova = time ? String(time).slice(0, 5) : null;
  const horaMudou = horaAtual !== horaNova;

  // Edição NÃO altera status (isso é feito pelas ações de status, que
  // carimbam horários e registram no log). Só os campos do formulário.
  const { error } = await supabase
    .from("roteiro_items")
    .update({
      time,
      ...(horaMudou ? { origem_horario: "manual" } : {}),
      title: form.title,
      description: form.description || null,
      supplier_id: form.supplierId,
      responsavel_nome: form.responsavelNome || null,
      responsavel_telefone: form.responsavelTelefone || null,
      etapa_obrigatoria: form.etapaObrigatoria,
      duracao_minutos: form.duracaoMinutos,
      // Um item não pode depender de si mesmo (o banco também barra).
      depende_de: form.dependeDe === itemId ? null : form.dependeDe,
      tipo_dependencia:
        form.dependeDe && form.dependeDe !== itemId ? form.tipoDependencia : null,
    })
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) {
    return { error: "Não foi possível salvar o item. Tente novamente." };
  }

  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { success: true };
}

// Atrasa um item e, opcionalmente, a cadeia que depende dele.
//
// A cadeia é calculada AQUI, no servidor, a partir dos dados do banco: o
// cliente manda só o item e se quer empurrar os dependentes. Assim o que
// é gravado não depende do que a tela tinha em memória.
//
// Só dependência DURA empurra. SUAVE é "o ideal é terminar antes", e
// empurrá-la atrasaria o dia inteiro sem necessidade.
export async function atrasarItem(
  eventId: string,
  itemId: string,
  minutos: number,
  emCascata: boolean
): Promise<{ error: string } | { success: true; afetados: number }> {
  if (!Number.isFinite(minutos) || minutos === 0 || Math.abs(minutos) > 600) {
    return { error: "Atraso inválido." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: itens, error: erroLeitura } = await supabase
    .from("roteiro_items")
    .select("id, time, time_original, depende_de, tipo_dependencia")
    .eq("event_id", eventId);

  if (erroLeitura || !itens) {
    return { error: "Não foi possível carregar o cronograma." };
  }

  type Linha = {
    id: string;
    time: string | null;
    time_original: string | null;
    depende_de: string | null;
    tipo_dependencia: string | null;
  };
  const lista = itens as Linha[];
  const alvo = lista.find((i) => i.id === itemId);
  if (!alvo) return { error: "Item não encontrado." };

  // BFS pelos dependentes duros. O conjunto de visitados também protege
  // contra ciclo: sem ele, A→B→A rodaria para sempre.
  const paraAtrasar = new Set<string>([itemId]);
  if (emCascata) {
    const fila = [itemId];
    while (fila.length > 0) {
      const atual = fila.shift()!;
      for (const i of lista) {
        if (
          i.depende_de === atual &&
          i.tipo_dependencia === "dura" &&
          !paraAtrasar.has(i.id)
        ) {
          paraAtrasar.add(i.id);
          fila.push(i.id);
        }
      }
    }
  }

  const somar = (hhmmss: string, mins: number) => {
    const [h, m] = hhmmss.split(":").map(Number);
    const total = Math.max(0, Math.min(24 * 60 - 1, h * 60 + m + mins));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
      total % 60
    ).padStart(2, "0")}:00`;
  };

  for (const id of paraAtrasar) {
    const linha = lista.find((i) => i.id === id);
    if (!linha?.time) continue;
    await supabase
      .from("roteiro_items")
      .update({
        time: somar(linha.time, minutos),
        // atraso é decisão humana no meio do dia: vira firme, senão uma
        // mudança de âncora desfaria o atraso que ela acabou de aplicar
        origem_horario: "manual",
        // Só no primeiro atraso: preserva o horário combinado para a tela
        // mostrar "era HH:MM" riscado.
        time_original: linha.time_original ?? linha.time,
      })
      .eq("id", id)
      .eq("event_id", eventId);
  }

  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { success: true, afetados: paraAtrasar.size };
}

// Volta o item ao horário combinado, desfazendo os atrasos aplicados.
export async function desfazerAtraso(
  eventId: string,
  itemId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("roteiro_items")
    .select("time_original")
    .eq("id", itemId)
    .eq("event_id", eventId)
    .maybeSingle();

  const original = (item as { time_original: string | null } | null)
    ?.time_original;
  if (!original) return { error: "Este item não foi atrasado." };

  const { error } = await supabase
    .from("roteiro_items")
    .update({ time: original, time_original: null })
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível desfazer." };

  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { success: true };
}

export async function deleteRoteiroItem(eventId: string, itemId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("roteiro_items")
    .delete()
    .eq("id", itemId)
    .eq("event_id", eventId);

  if (error) {
    throw new Error("Não foi possível excluir o item.");
  }

  revalidatePath(`/eventos/${eventId}/roteiro`);
}

// Atualização manual de status pela cerimonialista — usa a MESMA função
// agnóstica de canal da Etapa 1 (carimba horário real + grava no log),
// com origem 'cerimonialista'.
export async function atualizarStatusManual(
  eventId: string,
  itemId: string,
  status: RoteiroStatusNovo,
  observacao?: string | null
): Promise<{ error: string } | { success: true }> {
  if (!STATUSES_NOVO.includes(status)) return { error: "Status inválido." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("atualizar_status_item", {
    p_roteiro_item_id: itemId,
    p_novo_status: status,
    p_observacao: observacao ?? null,
    p_origem: "cerimonialista",
  });

  if (error || (data as { error?: string })?.error) {
    return { error: "Não foi possível atualizar o status." };
  }

  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath(`/eventos/${eventId}`, "layout");
  return { success: true };
}

// Modo Evento: toque marca o item como concluído (ou reabre). Segue pela
// mesma função agnóstica, mantendo o log e os horários coerentes.
export async function setRoteiroItemDone(
  eventId: string,
  itemId: string,
  done: boolean
) {
  const supabase = createClient();
  await supabase.rpc("atualizar_status_item", {
    p_roteiro_item_id: itemId,
    p_novo_status: done ? "concluido" : "planejado",
    p_observacao: null,
    p_origem: "cerimonialista",
  });

  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath(`/eventos/${eventId}/modo-evento`);
  revalidatePath(`/eventos/${eventId}`, "layout");
}
