"use server";

// Etapa 6: orçamento aprovado + ficha preenchida => Evento.
//
// O miolo (templates + RPC criar_evento_do_orcamento) mora em
// lib/orcamento-evento.ts, porque a rota do aceite também cria o evento —
// no servidor, sem sessão. Esta action é a porta para quem tem sessão (o
// painel da cerimonialista) e para a página pública: chama o mesmo miolo
// e invalida as páginas em cache, que é o que uma rota não tem.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { criarEventoDoOrcamento } from "@/lib/orcamento-evento";

export type ResultadoGeracaoEvento =
  | { success: true; eventoId: string; jaExistia: boolean }
  | { semData: true }
  | { error: string };

export async function criarEventoAPartirDoOrcamento(
  hash: string,
  tipoEvento: string,
  dataEvento?: string | null
): Promise<ResultadoGeracaoEvento> {
  const supabase = createClient();

  const res = await criarEventoDoOrcamento(supabase, hash, tipoEvento, dataEvento ?? null);

  if (res.semData) return { semData: true };
  if (!res.ok || !res.eventoId) {
    return { error: res.erro ?? "Não foi possível gerar o evento." };
  }

  revalidatePath("/orcamentos");
  revalidatePath("/eventos");
  return {
    success: true,
    eventoId: res.eventoId,
    jaExistia: res.jaExistia,
  };
}

// Geração pelo painel da cerimonialista (caso "sem data" ou nova
// tentativa após falha). Busca hash+tipo pelo id e chama a mesma RPC.
export async function gerarEventoDoOrcamentoManual(
  orcamentoId: string,
  dataEvento?: string | null
): Promise<ResultadoGeracaoEvento> {
  const supabase = createClient();
  const { data: orc } = await supabase
    .from("orcamentos")
    .select("hash_publico, tipo_evento")
    .eq("id", orcamentoId)
    .single();

  if (!orc) return { error: "Orçamento não encontrado." };

  const res = await criarEventoAPartirDoOrcamento(
    orc.hash_publico,
    orc.tipo_evento,
    dataEvento ?? null
  );
  revalidatePath(`/orcamentos/${orcamentoId}`);
  return res;
}
