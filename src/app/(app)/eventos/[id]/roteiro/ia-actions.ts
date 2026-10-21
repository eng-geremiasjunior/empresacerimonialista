"use server";

// Confirmar e desfazer o roteiro montado pela IA (21/10/2026).
//
// O pacote foi gravado pelo servidor (api/ai/roteiro) e a sessão só o
// LÊ — a RLS de ia_trabalho garante que é dela e de evento que ela vê.
// Tudo o que muda o roteiro roda com a SESSÃO dela, pela RLS do roteiro:
// a IA nunca grava, e nada passa por cima da permissão de quem confirma.
//
// Antes de cada operação, o servidor confere se o item ainda está como
// estava na proposta; se ela (ou alguém da equipe) mudou no meio, a
// operação volta como "mudou desde a proposta" e não é aplicada.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { estadoDaIa } from "@/lib/ia-ajustes";
import { fecharTrabalho } from "@/lib/ia-trabalhos";
import { fotoDoItem, hhmm, type FotoDoItem, type ItemAtual, type OperacaoDoRoteiro } from "@/lib/ia-roteiro";

type Resultado = { error: string } | { ok: true; aplicadas: number; recusadas: string[] };

const UUID = /^[0-9a-f-]{36}$/i;
const DESFAZER_ATE_MS = 24 * 3600 * 1000;

type Mudado = {
  id: string;
  antes: {
    time: string | null;
    title: string;
    description: string | null;
    supplier_id: string | null;
    origem_horario: string | null;
    offset_min: number | null;
  };
};
type ResultadoGravado = {
  criados: string[];
  mudados: Mudado[];
  removidos: Record<string, unknown>[];
  recusadas: string[];
};

const mesmaFoto = (a: FotoDoItem, b: FotoDoItem) =>
  a.horario === b.horario && a.titulo === b.titulo && (a.descricao ?? null) === (b.descricao ?? null) && (a.fornecedorId ?? null) === (b.fornecedorId ?? null);

const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/** "do seu padrão" acompanha a hora da cerimônia (112); "do seu cronograma" é firme */
function horarioComOrigem(horario: string, origem: "texto" | "padrao", cerimonia: string | null) {
  if (origem === "padrao" && cerimonia) {
    let off = minutos(horario) - minutos(cerimonia);
    if (off < -720) off += 1440;
    return { time: `${horario}:00`, origem_horario: "calculado", offset_min: off };
  }
  return { time: `${horario}:00`, origem_horario: "manual", offset_min: null };
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
    pacote: { operacoes?: OperacaoDoRoteiro[] } | null;
    resultado: ResultadoGravado | null;
    confirmado_em: string | null;
  } | null;
  return t && t.event_id === eventId && t.tipo === "montar_roteiro" ? t : null;
}

export async function confirmarRoteiroDaIa(eventId: string, trabalhoId: string, chaves: string[]): Promise<Resultado> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para continuar." };
  if (!(await estadoDaIa()).liberada) return { error: "Esta função ainda não está liberada para a sua conta." };

  const trabalho = await lerTrabalho(supabase, eventId, trabalhoId);
  if (!trabalho) return { error: "Esta proposta não existe mais." };
  if (trabalho.estado !== "pronto") return { error: "Esta proposta já foi usada. Leia o cronograma de novo." };

  const marcadas = new Set(chaves);
  const ops = (trabalho.pacote?.operacoes ?? []).filter((o) => marcadas.has(o.chave));
  if (!ops.length) return { error: "Marque pelo menos um item." };

  const { data: ev } = await supabase.from("events").select("time").eq("id", eventId).maybeSingle();
  const cerimonia = hhmm((ev as { time: string | null } | null)?.time);

  // o roteiro de agora, para conferir se nada mudou desde a proposta
  const ids = ops.filter((o) => o.op !== "criar").map((o) => (o as { itemId: string }).itemId);
  const atuais = new Map<string, Record<string, unknown>>();
  if (ids.length) {
    const { data } = await supabase.from("roteiro_items").select("*").eq("event_id", eventId).in("id", ids);
    for (const l of (data ?? []) as Record<string, unknown>[]) atuais.set(l.id as string, l);
  }

  const feito: ResultadoGravado = { criados: [], mudados: [], removidos: [], recusadas: [] };
  const recusar = (titulo: string, motivo: string) => feito.recusadas.push(`${titulo}: ${motivo}`);

  for (const o of ops) {
    if (o.op === "criar") {
      const { data, error } = await supabase
        .from("roteiro_items")
        .insert({
          event_id: eventId,
          ...horarioComOrigem(o.horario, o.origem, cerimonia),
          title: o.titulo,
          description: o.descricao,
          supplier_id: o.fornecedorId,
          responsavel_nome: o.responsavel,
          status: "pendente",
          status_novo: "planejado",
        })
        .select("id")
        .single();
      if (error || !data) recusar(o.titulo, "não foi possível salvar");
      else feito.criados.push((data as { id: string }).id);
      continue;
    }

    const linha = atuais.get(o.itemId);
    if (!linha) {
      recusar(o.antes.titulo, "o item não existe mais");
      continue;
    }
    const agora = fotoDoItem(linha as unknown as ItemAtual);
    if (!mesmaFoto(agora, o.antes) || linha.status_novo !== "planejado") {
      recusar(o.antes.titulo, "mudou desde a proposta");
      continue;
    }

    if (o.op === "mudar") {
      const campos: Record<string, unknown> = {};
      if (o.mudou.includes("horario")) Object.assign(campos, horarioComOrigem(o.depois.horario!, o.origem, cerimonia));
      if (o.mudou.includes("titulo")) campos.title = o.depois.titulo;
      if (o.mudou.includes("descricao")) campos.description = o.depois.descricao;
      if (o.mudou.includes("fornecedor")) campos.supplier_id = o.depois.fornecedorId;
      const { error } = await supabase.from("roteiro_items").update(campos).eq("id", o.itemId).eq("event_id", eventId);
      if (error) {
        recusar(o.antes.titulo, "não foi possível salvar");
        continue;
      }
      feito.mudados.push({
        id: o.itemId,
        antes: {
          time: (linha.time as string | null) ?? null,
          title: linha.title as string,
          description: (linha.description as string | null) ?? null,
          supplier_id: (linha.supplier_id as string | null) ?? null,
          origem_horario: (linha.origem_horario as string | null) ?? null,
          offset_min: (linha.offset_min as number | null) ?? null,
        },
      });
      continue;
    }

    // remover: só estimativa sem sugestão da família pendurada (a sugestão
    // apagaria junto e o desfazer não a traria de volta)
    const { count } = await supabase
      .from("roteiro_sugestao")
      .select("id", { count: "exact", head: true })
      .eq("roteiro_item_id", o.itemId);
    if ((count ?? 0) > 0) {
      recusar(o.antes.titulo, "tem sugestão da família ligada a ele");
      continue;
    }
    const { error } = await supabase.from("roteiro_items").delete().eq("id", o.itemId).eq("event_id", eventId);
    if (error) recusar(o.antes.titulo, "não foi possível tirar");
    else feito.removidos.push(linha);
  }

  const aplicadas = feito.criados.length + feito.mudados.length + feito.removidos.length;
  await fecharTrabalho(trabalhoId, "confirmado", { userId: user.id, resultado: feito });
  revalidatePath(`/eventos/${eventId}/roteiro`);
  return { ok: true, aplicadas, recusadas: feito.recusadas };
}

export async function descartarRoteiroDaIa(eventId: string, trabalhoId: string): Promise<{ error?: string }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const trabalho = await lerTrabalho(supabase, eventId, trabalhoId);
  if (!trabalho || trabalho.estado !== "pronto") return {};
  await fecharTrabalho(trabalhoId, "descartado");
  return {};
}

export async function desfazerRoteiroDaIa(eventId: string, trabalhoId: string): Promise<{ error?: string; ok?: true }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para continuar." };

  const trabalho = await lerTrabalho(supabase, eventId, trabalhoId);
  if (!trabalho || trabalho.estado !== "confirmado" || !trabalho.resultado || !trabalho.confirmado_em) {
    return { error: "Não há o que desfazer." };
  }
  if (Date.now() - new Date(trabalho.confirmado_em).getTime() > DESFAZER_ATE_MS) {
    return { error: "Passaram 24 horas: este roteiro não pode mais ser desfeito." };
  }
  const r = trabalho.resultado;
  let falhas = 0;

  // sempre presos ao evento do trabalho, e pela sessão: a RLS do roteiro protege
  if (r.criados?.length) {
    const { error } = await supabase.from("roteiro_items").delete().eq("event_id", eventId).in("id", r.criados);
    if (error) falhas++;
  }
  for (const m of r.mudados ?? []) {
    const { error } = await supabase.from("roteiro_items").update(m.antes).eq("id", m.id).eq("event_id", eventId);
    if (error) falhas++;
  }
  if (r.removidos?.length) {
    const linhas = r.removidos.map((l) => ({ ...l, event_id: eventId }));
    const { error } = await supabase.from("roteiro_items").insert(linhas);
    if (error) falhas++;
  }

  await fecharTrabalho(trabalhoId, "desfeito");
  revalidatePath(`/eventos/${eventId}/roteiro`);
  return falhas ? { error: "Parte do roteiro não voltou. Confira os horários." } : { ok: true };
}
