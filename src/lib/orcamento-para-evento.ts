"use server";

// Etapa 6: orçamento aprovado + ficha preenchida => Evento.
//
// Os TEMPLATES vêm daqui (lib/event-templates.ts — os mesmos do wizard,
// sem duplicar regra); a ESCRITA acontece toda dentro da RPC
// criar_evento_do_orcamento, que roda em transação única.
//
// Chamável pela página pública (cliente anônimo): o hash é a credencial,
// mesmo modelo do restante da Etapa 5.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  gerarChecklistPorTipo,
  gerarFasesPorTipo,
  resolverTemplate,
} from "@/lib/event-templates";

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

  // Mesmos templates do wizard de Eventos.
  const arquetipo = resolverTemplate(tipoEvento);
  const tasks = gerarChecklistPorTipo(arquetipo, {}).map((t) => ({
    title: t.title,
    category: "geral",
    priority: t.group === "evento" ? "media" : "alta",
  }));
  const phases = gerarFasesPorTipo(arquetipo);

  const { data, error } = await supabase.rpc("criar_evento_do_orcamento", {
    p_hash: hash,
    p_tasks: tasks,
    p_phases: phases,
    p_data_evento: dataEvento ?? null,
  });

  if (error) {
    return { error: "Não foi possível gerar o evento. Tente novamente." };
  }

  const res = data as {
    success?: boolean;
    evento_id?: string;
    ja_existia?: boolean;
    error?: string;
  };

  if (res?.error === "sem_data") return { semData: true };
  if (res?.error) return { error: res.error };
  if (!res?.success || !res.evento_id) {
    return { error: "Não foi possível gerar o evento." };
  }

  revalidatePath("/orcamentos");
  revalidatePath("/eventos");
  return {
    success: true,
    eventoId: res.evento_id,
    jaExistia: Boolean(res.ja_existia),
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
