"use server";

// Reuniões (21/10/2026, fase 3): guardar a pauta, confirmar o que a leitura
// da conversa propôs e desfazer (24 h). O pacote foi gravado pelo servidor
// e a sessão só o LÊ; tudo o que muda o evento roda com a SESSÃO dela, pela
// RLS de cada tabela. Antes de cada operação, confere o estado de agora.
//
// Decidir dispara o gatilho da 067 (as tarefas da decisão nascem); voltar
// para pendente no desfazer remove as que não foram concluídas.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { estadoDaIa } from "@/lib/ia-ajustes";
import { fecharTrabalho } from "@/lib/ia-trabalhos";
import { hhmm } from "@/lib/ia-roteiro";
import type { PacoteDaReuniao } from "@/lib/ia-reuniao";

const UUID = /^[0-9a-f-]{36}$/i;
const DESFAZER_ATE_MS = 24 * 3600 * 1000;

type Feito = {
  notaId: string | null;
  decididas: string[];
  tarefas: string[];
  roteiro: { id: string; antes: { time: string | null; origem_horario: string | null; offset_min: number | null } }[];
};

function revalidar(eventId: string) {
  for (const p of ["reunioes", "planejamento", "organizacao", "roteiro"]) revalidatePath(`/eventos/${eventId}/${p}`);
}

async function lerTrabalho(supabase: ReturnType<typeof createClient>, eventId: string, trabalhoId: string) {
  const { data } = await supabase
    .from("ia_trabalho")
    .select("id, event_id, tipo, estado, pacote, resultado, confirmado_em")
    .eq("id", trabalhoId)
    .maybeSingle();
  const t = data as {
    id: string;
    event_id: string | null;
    tipo: string;
    estado: string;
    pacote: PacoteDaReuniao | null;
    resultado: Feito | null;
    confirmado_em: string | null;
  } | null;
  return t && t.event_id === eventId && t.tipo === "registrar_reuniao" ? t : null;
}

/** A pauta vai para o Caderno, presa à reunião (sem IA: é a lista de fatos). */
export async function guardarPauta(eventId: string, compromissoId: string, texto: string): Promise<{ error?: string; ok?: true }> {
  if (!UUID.test(eventId) || !UUID.test(compromissoId)) return { error: "Pedido inválido." };
  const limpo = texto.trim().slice(0, 4000);
  if (!limpo) return { error: "A pauta está vazia." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para continuar." };
  const { error } = await supabase
    .from("event_notes")
    .insert({ event_id: eventId, author_id: user.id, content: limpo, compromisso_id: compromissoId });
  if (error) return { error: "Não foi possível guardar a pauta." };
  revalidar(eventId);
  return { ok: true };
}

export async function confirmarReuniao(
  eventId: string,
  trabalhoId: string,
  chaves: string[],
  ata: string
): Promise<{ error: string } | { ok: true; feito: { decisoes: number; tarefas: number; horarios: number }; recusadas: string[] }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para continuar." };
  if (!(await estadoDaIa()).liberada) return { error: "Esta função ainda não está liberada para a sua conta." };

  const trabalho = await lerTrabalho(supabase, eventId, trabalhoId);
  if (!trabalho?.pacote) return { error: "Esta proposta não existe mais." };
  if (trabalho.estado !== "pronto") return { error: "Esta proposta já foi usada. Leia a conversa de novo." };
  const p = trabalho.pacote;
  const marcadas = new Set(chaves);
  const feito: Feito = { notaId: null, decididas: [], tarefas: [], roteiro: [] };
  const recusadas: string[] = [];

  // a ata (editada por ela) vai para o Caderno, presa à reunião
  const textoDaAta = ata.trim().slice(0, 4000);
  if (textoDaAta) {
    const { data, error } = await supabase
      .from("event_notes")
      .insert({ event_id: eventId, author_id: user.id, content: textoDaAta, compromisso_id: p.compromissoId })
      .select("id")
      .single();
    if (error || !data) return { error: "Não foi possível guardar a ata." };
    feito.notaId = (data as { id: string }).id;
  }

  // decisões: só as que ainda estão pendentes
  const decisoes = p.decisoes.filter((d) => marcadas.has(d.chave));
  if (decisoes.length) {
    const { data: agora } = await supabase
      .from("evento_decisao")
      .select("id, estado")
      .eq("event_id", eventId)
      .in(
        "id",
        decisoes.map((d) => d.decisaoId)
      );
    const pendentes = new Set(((agora ?? []) as { id: string; estado: string }[]).filter((d) => d.estado === "pendente").map((d) => d.id));
    for (const d of decisoes) {
      if (!pendentes.has(d.decisaoId)) {
        recusadas.push(`${d.titulo}: já não estava em aberto`);
        continue;
      }
      const agoraIso = new Date().toISOString();
      const { error } = await supabase
        .from("evento_decisao")
        .update({ estado: "decidida", decidida_em: agoraIso, updated_at: agoraIso })
        .eq("id", d.decisaoId)
        .eq("event_id", eventId);
      if (error) recusadas.push(`${d.titulo}: não foi possível marcar`);
      else feito.decididas.push(d.decisaoId);
    }
  }

  // tarefas
  const tarefas = p.tarefas.filter((t) => marcadas.has(t.chave));
  if (tarefas.length) {
    const { data, error } = await supabase
      .from("tasks")
      .insert(
        tarefas.map((t) => ({
          event_id: eventId,
          title: t.titulo,
          due_date: t.prazo,
          responsavel: t.responsavel,
          status: "pendente",
          category: "geral",
          priority: "media",
        }))
      )
      .select("id");
    if (error || !data) recusadas.push("As tarefas não puderam ser criadas");
    else feito.tarefas = (data as { id: string }[]).map((t) => t.id);
  }

  // horários do roteiro: só se ainda estão como na proposta
  for (const r of p.roteiro.filter((x) => marcadas.has(x.chave))) {
    const { data: item } = await supabase
      .from("roteiro_items")
      .select("id, time, origem_horario, offset_min, status_novo")
      .eq("id", r.itemId)
      .eq("event_id", eventId)
      .maybeSingle();
    const i = item as { time: string | null; origem_horario: string | null; offset_min: number | null; status_novo: string } | null;
    if (!i || hhmm(i.time) !== r.antes || i.status_novo !== "planejado") {
      recusadas.push(`${r.titulo}: mudou desde a proposta`);
      continue;
    }
    const { error } = await supabase
      .from("roteiro_items")
      .update({ time: `${r.depois}:00`, origem_horario: "manual", offset_min: null })
      .eq("id", r.itemId)
      .eq("event_id", eventId);
    if (error) recusadas.push(`${r.titulo}: não foi possível mudar`);
    else feito.roteiro.push({ id: r.itemId, antes: { time: i.time, origem_horario: i.origem_horario, offset_min: i.offset_min } });
  }

  await fecharTrabalho(trabalhoId, "confirmado", { userId: user.id, resultado: feito });
  revalidar(eventId);
  return {
    ok: true,
    feito: { decisoes: feito.decididas.length, tarefas: feito.tarefas.length, horarios: feito.roteiro.length },
    recusadas,
  };
}

export async function descartarReuniao(eventId: string, trabalhoId: string): Promise<{ error?: string }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const t = await lerTrabalho(supabase, eventId, trabalhoId);
  if (t?.estado === "pronto") await fecharTrabalho(trabalhoId, "descartado");
  return {};
}

export async function desfazerReuniao(eventId: string, trabalhoId: string): Promise<{ error?: string; ok?: true }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const t = await lerTrabalho(supabase, eventId, trabalhoId);
  if (!t || t.estado !== "confirmado" || !t.resultado || !t.confirmado_em) return { error: "Não há o que desfazer." };
  if (Date.now() - new Date(t.confirmado_em).getTime() > DESFAZER_ATE_MS) {
    return { error: "Passaram 24 horas: esta reunião não pode mais ser desfeita por aqui." };
  }
  const r = t.resultado;
  let falhas = 0;
  if (r.notaId) {
    const { error } = await supabase.from("event_notes").delete().eq("id", r.notaId).eq("event_id", eventId);
    if (error) falhas++;
  }
  if (r.decididas.length) {
    const { error } = await supabase
      .from("evento_decisao")
      .update({ estado: "pendente", decidida_em: null, updated_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .in("id", r.decididas);
    if (error) falhas++;
  }
  if (r.tarefas.length) {
    const { error } = await supabase.from("tasks").delete().eq("event_id", eventId).in("id", r.tarefas);
    if (error) falhas++;
  }
  for (const x of r.roteiro) {
    const { error } = await supabase.from("roteiro_items").update(x.antes).eq("id", x.id).eq("event_id", eventId);
    if (error) falhas++;
  }
  await fecharTrabalho(trabalhoId, "desfeito");
  revalidar(eventId);
  return falhas ? { error: "Parte não voltou. Confira o Planejamento e o Roteiro." } : { ok: true };
}
