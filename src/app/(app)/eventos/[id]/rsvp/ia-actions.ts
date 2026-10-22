"use server";

// As respostas do RSVP em lote (21/10/2026): confirmar o que a leitura
// propôs, descartar e desfazer (24 h). O pacote foi gravado pelo servidor
// e a sessão só o LÊ; o que muda a lista roda com a SESSÃO dela, pela RLS
// de evento_convidado — a mesma de "mudar a resposta" na ficha.
//
// O convidado de cada resposta é o que ELA escolheu na conferência
// (quando a leitura não teve certeza, ela escolhe). O servidor confere
// que ele é deste evento.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { estadoDaIa } from "@/lib/ia-ajustes";
import { fecharTrabalho } from "@/lib/ia-trabalhos";
import type { PacoteDasRespostas } from "@/lib/ia-rsvp";

const UUID = /^[0-9a-f-]{36}$/i;
const DESFAZER_ATE_MS = 24 * 3600 * 1000;

type Antes = {
  confirmacao: string;
  confirmado_via: string | null;
  confirmado_em: string | null;
  acompanhantes?: number;
  criancas?: number;
  restricao_alimentar?: string | null;
  acessibilidade?: string | null;
};
type Feito = { mudados: { id: string; antes: Antes; em: string }[] };

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/rsvp`);
  revalidatePath(`/portal/${eventId}/convidados`);
  revalidatePath(`/portal/${eventId}`);
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
    pacote: PacoteDasRespostas | null;
    resultado: Feito | null;
    confirmado_em: string | null;
  } | null;
  return t && t.event_id === eventId && t.tipo === "respostas_rsvp" ? t : null;
}

export async function confirmarRespostas(
  eventId: string,
  trabalhoId: string,
  escolhas: { chave: string; convidadoId: string }[]
): Promise<{ error: string } | { ok: true; gravadas: number; recusadas: string[] }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre de novo para continuar." };
  if (!(await estadoDaIa()).liberada) return { error: "Esta função ainda não está liberada para a sua conta." };

  const trabalho = await lerTrabalho(supabase, eventId, trabalhoId);
  if (!trabalho?.pacote) return { error: "Esta proposta não existe mais." };
  if (trabalho.estado !== "pronto") return { error: "Esta proposta já foi usada. Leia as respostas de novo." };

  const porChave = new Map(trabalho.pacote.itens.map((i) => [i.chave, i]));
  const recusadas: string[] = [];
  // um convidado só uma vez: vale a última escolha
  const escolhidas = new Map<string, (typeof trabalho.pacote.itens)[number]>();
  for (const e of escolhas.slice(0, 300)) {
    const item = porChave.get(e.chave);
    if (!item || !UUID.test(e.convidadoId)) continue;
    escolhidas.set(e.convidadoId, item);
  }
  if (!escolhidas.size) return { error: "Marque ao menos uma resposta." };

  const ids = [...escolhidas.keys()];
  const [agora, comNomes] = await Promise.all([
    supabase
      .from("evento_convidado")
      .select("id, nome, confirmacao, confirmado_via, confirmado_em, acompanhantes, criancas, restricao_alimentar")
      .eq("event_id", eventId)
      .in("id", ids),
    supabase.from("evento_acompanhante").select("convidado_id").eq("event_id", eventId).in("convidado_id", ids),
  ]);
  const linhas = new Map(
    ((agora.data ?? []) as {
      id: string;
      nome: string;
      confirmacao: string;
      confirmado_via: string | null;
      confirmado_em: string | null;
      acompanhantes: number;
      criancas: number;
      restricao_alimentar: string | null;
    }[]).map((l) => [l.id, l])
  );
  const temNomes = new Set(((comNomes.data ?? []) as { convidado_id: string }[]).map((a) => a.convidado_id));

  const feito: Feito = { mudados: [] };
  for (const [id, item] of escolhidas) {
    const l = linhas.get(id);
    if (!l) {
      recusadas.push(`${item.citado}: não está na lista deste evento`);
      continue;
    }
    const em = new Date().toISOString();
    const antes: Antes = { confirmacao: l.confirmacao, confirmado_via: l.confirmado_via, confirmado_em: l.confirmado_em };
    const novo: Record<string, unknown> = { confirmacao: item.resposta, confirmado_via: "manual", confirmado_em: em };
    if (item.acompanhantes !== null || item.criancas !== null) {
      if (temNomes.has(id)) recusadas.push(`${l.nome}: tem acompanhantes com nome; ajuste o número na ficha`);
      else {
        if (item.acompanhantes !== null) {
          antes.acompanhantes = l.acompanhantes;
          novo.acompanhantes = Math.min(item.acompanhantes, 20);
        }
        if (item.criancas !== null) {
          antes.criancas = l.criancas;
          novo.criancas = Math.min(item.criancas, 20);
        }
      }
    }
    if (item.restricao) {
      antes.restricao_alimentar = l.restricao_alimentar;
      novo.restricao_alimentar = item.restricao;
    }
    const { error } = await supabase.from("evento_convidado").update(novo).eq("id", id).eq("event_id", eventId);
    if (!error && item.acessibilidade) {
      // a coluna é da 180; sem ela, o resto da resposta já ficou gravado
      const { data: a } = await supabase.from("evento_convidado").select("acessibilidade").eq("id", id).maybeSingle();
      const r2 = await supabase.from("evento_convidado").update({ acessibilidade: item.acessibilidade }).eq("id", id).eq("event_id", eventId);
      if (!r2.error) antes.acessibilidade = (a as { acessibilidade: string | null } | null)?.acessibilidade ?? null;
    }
    if (error) recusadas.push(`${l.nome}: não foi possível gravar`);
    else feito.mudados.push({ id, antes, em });
  }

  await fecharTrabalho(trabalhoId, "confirmado", { userId: user.id, resultado: feito });
  revalidar(eventId);
  return { ok: true, gravadas: feito.mudados.length, recusadas };
}

export async function descartarRespostas(eventId: string, trabalhoId: string): Promise<{ error?: string }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const t = await lerTrabalho(supabase, eventId, trabalhoId);
  if (t?.estado === "pronto") await fecharTrabalho(trabalhoId, "descartado");
  return {};
}

/** Volta cada convidado ao que era, menos quem mudou de novo depois (pelo link, na ficha). */
export async function desfazerRespostas(eventId: string, trabalhoId: string): Promise<{ error?: string; ok?: true; mantidos?: number }> {
  if (!UUID.test(eventId) || !UUID.test(trabalhoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const t = await lerTrabalho(supabase, eventId, trabalhoId);
  if (!t || t.estado !== "confirmado" || !t.resultado || !t.confirmado_em) return { error: "Não há o que desfazer." };
  if (Date.now() - new Date(t.confirmado_em).getTime() > DESFAZER_ATE_MS) {
    return { error: "Passaram 24 horas: estas respostas não podem mais ser desfeitas por aqui." };
  }
  const mudados = t.resultado.mudados ?? [];
  const { data } = await supabase
    .from("evento_convidado")
    .select("id, confirmado_em")
    .eq("event_id", eventId)
    .in(
      "id",
      mudados.map((m) => m.id)
    );
  const emAgora = new Map(((data ?? []) as { id: string; confirmado_em: string | null }[]).map((l) => [l.id, l.confirmado_em]));
  let falhas = 0;
  let mantidos = 0;
  for (const m of mudados) {
    const atual = emAgora.get(m.id);
    if (atual === undefined) continue;
    if (!atual || new Date(atual).getTime() !== new Date(m.em).getTime()) {
      mantidos++;
      continue;
    }
    const { error } = await supabase.from("evento_convidado").update(m.antes).eq("id", m.id).eq("event_id", eventId);
    if (error) falhas++;
  }
  await fecharTrabalho(trabalhoId, "desfeito");
  revalidar(eventId);
  return falhas ? { error: "Parte não voltou. Confira a lista." } : { ok: true, mantidos };
}
