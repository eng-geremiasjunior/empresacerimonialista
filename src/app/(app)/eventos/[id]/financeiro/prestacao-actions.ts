"use server";

// A prestação de contas: salvar as observações dela e ENTREGAR.
//
// A entrega é o único momento com peso: monta o documento AGORA, passa o
// payload pelo guarda de chaves (nada fora da allowlist sai para o
// casal), grava a fotografia como versão N+1 e nunca mais a toca. A
// tabela não tem policy de update/delete — errou, reemite.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPrestacaoAoVivo } from "@/lib/supabase/prestacao";
import { SECOES_NOTA, validarPayloadCasal } from "@/lib/prestacao-core";

export type ResultadoPrestacao =
  | { error: string }
  | { success: true; versao?: number };

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/financeiro`);
}

export async function salvarNotaPrestacao(
  eventId: string,
  secao: string,
  texto: string
): Promise<ResultadoPrestacao> {
  if (!(SECOES_NOTA as readonly string[]).includes(secao)) {
    return { error: "Seção inválida." };
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evento_relatorio_nota")
    .upsert(
      {
        event_id: eventId,
        secao,
        texto: texto.slice(0, 2000),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,secao" }
    )
    .select("id");

  if (error) {
    console.error("[vela:prestacao] nota:", error.message);
    return { error: "Não foi possível salvar a observação." };
  }
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar este evento." };
  }
  revalidar(eventId);
  return { success: true };
}

export async function entregarPrestacao(
  eventId: string
): Promise<ResultadoPrestacao> {
  const supabase = createClient();

  // monta o documento do jeito que ele está NESTE momento
  const vivo = await getPrestacaoAoVivo(eventId);
  if (!vivo) return { error: "Não foi possível montar o documento." };

  // O guarda: chave fora da allowlist derruba a entrega. Isto nunca deve
  // disparar em produção — se disparar, é refatoração vazando campo novo,
  // e é exatamente por isso que o erro é barulhento.
  const violacoes = validarPayloadCasal(vivo.payload);
  if (violacoes.length > 0) {
    console.error("[vela:prestacao] payload recusado:", JSON.stringify(violacoes));
    return {
      error:
        "O documento contém campos que não podem ir ao casal. Nada foi entregue — fale com o suporte.",
    };
  }

  // a versão seguinte (o unique segura corrida de dois cliques)
  const { data: ultima } = await supabase
    .from("evento_relatorio")
    .select("versao")
    .eq("event_id", eventId)
    .eq("destino", "casal")
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const versao = (ultima?.versao ?? 0) + 1;

  const { data, error } = await supabase
    .from("evento_relatorio")
    .insert({
      event_id: eventId,
      destino: "casal",
      versao,
      conteudo: vivo.payload,
    })
    .select("id");

  if (error) {
    // 23505 = dois cliques ao mesmo tempo; o segundo perde e tenta de novo
    if (error.code === "23505") {
      return { error: "Uma entrega acabou de acontecer. Recarregue e confira." };
    }
    console.error("[vela:prestacao] entregar:", error.message);
    return { error: "Não foi possível entregar. Tente de novo." };
  }
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para entregar neste evento." };
  }

  revalidar(eventId);
  return { success: true, versao };
}
