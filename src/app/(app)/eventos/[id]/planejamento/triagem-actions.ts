"use server";

// Gravar a triagem (212). Cada resposta vai para a linha e para as etapas
// dela (cotações, degustação…), num UPDATE só por linha: o gatilho da
// decisão lê `triagem` na mesma gravação e, em "Já resolvido", não gera
// as tarefas de contrato. A RLS de evento_decisao decide quem pode.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ehEscolha, type EscolhaDaTriagem } from "@/lib/triagem";

export type RespostaDaTriagem = { id: string; escolha: EscolhaDaTriagem; etapas: string[] };

const UUID = /^[0-9a-f-]{36}$/i;

export async function gravarTriagem(
  eventId: string,
  respostas: RespostaDaTriagem[]
): Promise<{ ok: true; gravadas: number } | { ok: false; erro: string }> {
  if (!UUID.test(eventId) || !Array.isArray(respostas) || respostas.length === 0 || respostas.length > 300) {
    return { ok: false, erro: "Nada para gravar." };
  }
  const supabase = createClient();
  const agora = new Date().toISOString();
  let gravadas = 0;

  // agrupa por escolha: três gravações no máximo, cada uma com a lista de ids
  const porEscolha = new Map<EscolhaDaTriagem, string[]>();
  for (const r of respostas) {
    if (!r || !UUID.test(r.id) || !ehEscolha(r.escolha)) continue;
    const ids = [r.id, ...(Array.isArray(r.etapas) ? r.etapas.filter((x) => UUID.test(x)) : [])];
    porEscolha.set(r.escolha, [...(porEscolha.get(r.escolha) ?? []), ...ids]);
  }

  for (const [escolha, ids] of porEscolha) {
    const mudanca: Record<string, unknown> = { triagem: escolha, triada_em: agora };
    if (escolha === "ja_resolvido") {
      mudanca.estado = "decidida";
      mudanca.decidida_em = agora;
    } else if (escolha === "nao_se_aplica") {
      mudanca.estado = "nao_se_aplica";
    }
    const { data, error } = await supabase
      .from("evento_decisao")
      .update(mudanca)
      .eq("event_id", eventId)
      .eq("estado", "pendente")
      .in("id", ids)
      .select("id");
    if (error) {
      console.error("[triagem] gravar:", error.code);
      return { ok: false, erro: "Não foi possível gravar agora. Tente de novo." };
    }
    gravadas += data?.length ?? 0;
  }

  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { ok: true, gravadas };
}
