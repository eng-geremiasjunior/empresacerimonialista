"use server";

// Ações da tela "Meu modelo" (23/09/2026). Escrevem direto no Playbook
// da empresa (metodo_*): a política de escrita da 064 já só deixa a
// PROPRIETÁRIA, então a RLS é a guarda real; aqui validamos, montamos o
// código das linhas novas e revalidamos.
//
// Nada apaga: tirar é fora_do_modelo (170) — a decisão nasce "não se
// aplica" nos próximos eventos e o código dela continua existindo para o
// portal, as tarefas e o roteiro que dependem dele.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { chaveDeNome, type Responsavel } from "@/lib/modelo-proprio";

type R = { error: string } | { success: true };

const RESPONSAVEIS: Responsavel[] = ["noivos", "cerimonialista", "ambos"];

function codigoNovo() {
  return `meu_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

/** A prioridade no mesmo passo do método: prazo maior = mais estruturante. */
function prioridadeDoPrazo(dias: number | null) {
  return dias === null ? 50 : Math.max(1, Math.round(dias / 3));
}

function diasValidos(dias: number | null): number | null {
  if (dias === null) return null;
  const n = Math.round(Number(dias));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 730) : null;
}

async function daDona() {
  const supabase = createClient();
  const { data } = await supabase.rpc("meu_cargo").maybeSingle();
  const c = data as { empresa_id: string; cargo: string } | null;
  if (!c || c.cargo !== "proprietaria") return { supabase, empresaId: null };
  return { supabase, empresaId: c.empresa_id };
}

function revalidar() {
  revalidatePath("/configuracoes/modelo");
}

export async function renomearAssunto(id: string, nome: string): Promise<R> {
  const limpo = nome.trim().slice(0, 80);
  if (!limpo) return { error: "Escreva o nome." };
  const { supabase, empresaId } = await daDona();
  if (!empresaId) return { error: "Só a proprietária muda o modelo." };
  const { error } = await supabase
    .from("metodo_objetivo")
    .update({ nome: limpo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresaId);
  if (error) return { error: "Não foi possível salvar." };
  revalidar();
  return { success: true };
}

export async function renomearDecisao(id: string, titulo: string): Promise<R> {
  const limpo = titulo.trim().slice(0, 140);
  if (!limpo) return { error: "Escreva a decisão." };
  const { supabase, empresaId } = await daDona();
  if (!empresaId) return { error: "Só a proprietária muda o modelo." };
  const { error } = await supabase
    .from("metodo_decisao")
    .update({ titulo: limpo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresaId);
  if (error) return { error: "Não foi possível salvar." };
  revalidar();
  return { success: true };
}

export async function mudarPrazo(id: string, dias: number | null): Promise<R> {
  const { supabase, empresaId } = await daDona();
  if (!empresaId) return { error: "Só a proprietária muda o modelo." };
  const d = diasValidos(dias);
  const { data: atual } = await supabase
    .from("metodo_decisao")
    .select("offset_min_dias, offset_max_dias")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (!atual) return { error: "Decisão não encontrada." };
  // a faixa do método (min/ideal/max) continua coerente: o ideal novo
  // sempre cabe dentro dela
  const min = atual.offset_min_dias as number | null;
  const max = atual.offset_max_dias as number | null;
  const { error } = await supabase
    .from("metodo_decisao")
    .update({
      offset_ideal_dias: d,
      offset_min_dias: d === null || min === null ? min : Math.min(min, d),
      offset_max_dias: d === null || max === null ? max : Math.max(max, d),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("empresa_id", empresaId);
  if (error) return { error: "Não foi possível salvar." };
  revalidar();
  return { success: true };
}

export async function mudarResponsavel(id: string, responsavel: Responsavel): Promise<R> {
  if (!RESPONSAVEIS.includes(responsavel)) return { error: "Responsável inválido." };
  const { supabase, empresaId } = await daDona();
  if (!empresaId) return { error: "Só a proprietária muda o modelo." };
  const { error } = await supabase
    .from("metodo_decisao")
    .update({ responsavel, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresaId);
  if (error) return { error: "Não foi possível salvar." };
  revalidar();
  return { success: true };
}

export async function alternarNoModelo(id: string, fora: boolean): Promise<R> {
  const { supabase, empresaId } = await daDona();
  if (!empresaId) return { error: "Só a proprietária muda o modelo." };
  const { error } = await supabase
    .from("metodo_decisao")
    .update({ fora_do_modelo: fora, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresaId);
  if (error) return { error: "Não foi possível salvar." };
  revalidar();
  return { success: true };
}

export async function adicionarAssunto(tipo: string, nome: string): Promise<R> {
  const limpo = nome.trim().slice(0, 80);
  if (!limpo) return { error: "Escreva o nome do assunto." };
  if (!(tipo in EVENT_TYPE_LABELS)) return { error: "Tipo de evento inválido." };
  const { supabase, empresaId } = await daDona();
  if (!empresaId) return { error: "Só a proprietária muda o modelo." };
  const { data: max } = await supabase
    .from("metodo_objetivo")
    .select("ordem")
    .eq("empresa_id", empresaId)
    .eq("tipo_evento", tipo)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("metodo_objetivo").insert({
    empresa_id: empresaId,
    tipo_evento: tipo,
    codigo: codigoNovo(),
    nome: limpo,
    ordem: ((max?.ordem as number | undefined) ?? 0) + 1,
    proprio: true,
  });
  if (error) return { error: "Não foi possível criar o assunto." };
  revalidar();
  return { success: true };
}

export async function adicionarDecisao(
  objetivoId: string,
  titulo: string,
  dias: number | null,
  responsavel: Responsavel
): Promise<R> {
  const limpo = titulo.trim().slice(0, 140);
  if (!limpo) return { error: "Escreva a decisão." };
  if (!RESPONSAVEIS.includes(responsavel)) return { error: "Responsável inválido." };
  const { supabase, empresaId } = await daDona();
  if (!empresaId) return { error: "Só a proprietária muda o modelo." };
  const { data: max } = await supabase
    .from("metodo_decisao")
    .select("ordem")
    .eq("objetivo_id", objetivoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const d = diasValidos(dias);
  const { error } = await supabase.from("metodo_decisao").insert({
    objetivo_id: objetivoId,
    empresa_id: empresaId,
    codigo: codigoNovo(),
    titulo: limpo,
    responsavel,
    offset_ideal_dias: d,
    prioridade: prioridadeDoPrazo(d),
    ordem: ((max?.ordem as number | undefined) ?? 0) + 1,
    proprio: true,
  });
  if (error) return { error: "Não foi possível criar a decisão." };
  revalidar();
  return { success: true };
}

/**
 * A importação conferida por ela. O servidor confere de novo o que a
 * prévia disse: assunto que já existe pelo nome é reusado, decisão que
 * já existe pelo título não duplica.
 */
export async function importarNoModelo(
  tipo: string,
  assuntos: {
    nome: string;
    objetivoId: string | null;
    decisoes: { titulo: string; diasAntes: number | null; responsavel: Responsavel }[];
  }[]
): Promise<{ error: string } | { assuntos: number; decisoes: number }> {
  if (!(tipo in EVENT_TYPE_LABELS)) return { error: "Tipo de evento inválido." };
  const { supabase, empresaId } = await daDona();
  if (!empresaId) return { error: "Só a proprietária muda o modelo." };

  const { data: existentes } = await supabase
    .from("metodo_objetivo")
    .select("id, nome, ordem, metodo_decisao(titulo, ordem)")
    .eq("empresa_id", empresaId)
    .eq("tipo_evento", tipo);
  const lista = (existentes ?? []) as {
    id: string;
    nome: string;
    ordem: number;
    metodo_decisao: { titulo: string; ordem: number }[];
  }[];
  const porNome = new Map(lista.map((o) => [chaveDeNome(o.nome), o.id]));
  const porId = new Map(lista.map((o) => [o.id, o]));
  const titulos = new Set(lista.flatMap((o) => o.metodo_decisao.map((d) => chaveDeNome(d.titulo))));
  let ordemAssunto = Math.max(0, ...lista.map((o) => o.ordem));
  let nAssuntos = 0;
  let nDecisoes = 0;

  for (const a of assuntos.slice(0, 60)) {
    const nome = a.nome.trim().slice(0, 80);
    const novas = a.decisoes
      .map((d) => ({ ...d, titulo: d.titulo.trim().slice(0, 140) }))
      .filter((d) => d.titulo && RESPONSAVEIS.includes(d.responsavel) && !titulos.has(chaveDeNome(d.titulo)));
    if (!nome || novas.length === 0) continue;

    let objetivoId =
      (a.objetivoId && porId.has(a.objetivoId) ? a.objetivoId : null) ?? porNome.get(chaveDeNome(nome)) ?? null;
    if (!objetivoId) {
      ordemAssunto += 1;
      const { data, error } = await supabase
        .from("metodo_objetivo")
        .insert({
          empresa_id: empresaId,
          tipo_evento: tipo,
          codigo: codigoNovo(),
          nome,
          ordem: ordemAssunto,
          proprio: true,
        })
        .select("id")
        .single();
      if (error || !data) return { error: "Não foi possível criar o assunto “" + nome + "”." };
      objetivoId = data.id as string;
      porNome.set(chaveDeNome(nome), objetivoId);
      nAssuntos++;
    }

    let ordem = Math.max(0, ...(porId.get(objetivoId)?.metodo_decisao.map((d) => d.ordem) ?? [0]));
    const linhas = novas.map((d) => {
      const dias = diasValidos(d.diasAntes);
      titulos.add(chaveDeNome(d.titulo));
      ordem += 1;
      return {
        objetivo_id: objetivoId,
        empresa_id: empresaId,
        codigo: codigoNovo(),
        titulo: d.titulo,
        responsavel: d.responsavel,
        offset_ideal_dias: dias,
        prioridade: prioridadeDoPrazo(dias),
        ordem,
        proprio: true,
      };
    });
    const { error } = await supabase.from("metodo_decisao").insert(linhas);
    if (error) return { error: "Parte do checklist não entrou. Tente de novo — o que já entrou não duplica." };
    nDecisoes += linhas.length;
  }

  revalidar();
  return { assuntos: nAssuntos, decisoes: nDecisoes };
}
