"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FilaState = { error: string } | { success: true } | null;

/** Segurar não cancela: tira do dia de hoje e devolve amanhã. */
export async function segurarBatida(batidaId: string): Promise<FilaState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  const { error } = await supabase
    .from("batida")
    .update({ status: "segurada", segurada_em: new Date().toISOString(), segurada_por: user.id })
    .eq("id", batidaId)
    .eq("status", "na_fila");

  if (error) return { error: "Não deu para segurar. Tente de novo." };
  revalidatePath("/solicitacoes");
  return { success: true };
}

export async function soltarBatida(batidaId: string): Promise<FilaState> {
  const supabase = createClient();
  const { error } = await supabase
    .from("batida")
    .update({ status: "na_fila", segurada_em: null, segurada_por: null })
    .eq("id", batidaId)
    .eq("status", "segurada");

  if (error) return { error: "Não deu para devolver à fila." };
  revalidatePath("/solicitacoes");
  return { success: true };
}

/**
 * Ela tocou em enviar. O WhatsApp abre com o texto pronto e a mensagem
 * sai do número dela — o que registramos aqui é que a batida saiu, para
 * o relógio de reenvio começar a contar e o fornecedor não ser cobrado
 * duas vezes pela mesma coisa.
 */
export async function marcarEnviada(batidaId: string): Promise<FilaState> {
  const supabase = createClient();
  const agora = new Date().toISOString();

  const { data: batida, error: erroBatida } = await supabase
    .from("batida")
    .update({ status: "enviada", enviada_em: agora })
    .eq("id", batidaId)
    .in("status", ["na_fila", "segurada"])
    .select("id")
    .maybeSingle();

  if (erroBatida || !batida) return { error: "Esta mensagem já tinha saído." };

  const { data: itens } = await supabase
    .from("solicitacao_fornecedor")
    .select("id, status, tentativas")
    .eq("batida_id", batidaId)
    .in("status", ["pendente", "enviada"]);

  for (const i of itens ?? []) {
    await supabase
      .from("solicitacao_fornecedor")
      .update({
        // primeira saída é envio; a segunda é cobrança da mesma coisa
        status: i.status === "pendente" ? "enviada" : "reenviada",
        enviada_em: i.status === "pendente" ? agora : undefined,
        reenviada_em: i.status === "pendente" ? undefined : agora,
        tentativas: (i.tentativas ?? 0) + 1,
        updated_at: agora,
      })
      .eq("id", i.id);
  }

  revalidatePath("/solicitacoes");
  return { success: true };
}

/** Cancelar é para o que ela resolveu por fora — não vira cobrança nenhuma. */
export async function cancelarBatida(batidaId: string): Promise<FilaState> {
  const supabase = createClient();
  const { error } = await supabase
    .from("batida")
    .update({ status: "cancelada" })
    .eq("id", batidaId)
    .in("status", ["na_fila", "segurada"]);

  if (error) return { error: "Não deu para cancelar." };
  await supabase
    .from("solicitacao_fornecedor")
    .update({ batida_id: null })
    .eq("batida_id", batidaId)
    .eq("status", "pendente");

  revalidatePath("/solicitacoes");
  return { success: true };
}

/**
 * Um link novo para o fornecedor. O anterior morre na hora — serve para
 * quando o contato dele mudou de mãos ou o link vazou para quem não devia.
 */
export async function gerarNovoLinkFornecedor(
  supplierId: string
): Promise<{ error: string } | { hash: string }> {
  const supabase = createClient();

  const { data: cargo } = await supabase.rpc("meu_cargo");
  const linha = Array.isArray(cargo) ? cargo[0] : cargo;
  const empresaId = (linha as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { error: "Não foi possível identificar a empresa." };

  // Trocar o hash É a revogação: o endereço antigo deixa de existir e a
  // RPC pública devolve nulo para quem tentar. Mesmo formato do default
  // do banco — 64 hex, dois UUIDs sem os hífens.
  const novoHash = (randomUUID() + randomUUID()).replace(/-/g, "");

  const { data, error } = await supabase
    .from("fornecedor_acesso")
    .upsert(
      {
        empresa_id: empresaId,
        supplier_id: supplierId,
        hash: novoHash,
        expira_em: new Date(Date.now() + 90 * 86_400_000).toISOString(),
        revogado_em: null,
        aberturas: 0,
        ultima_abertura: null,
      },
      { onConflict: "empresa_id,supplier_id" }
    )
    .select("hash")
    .single();

  if (error || !data) return { error: "Não deu para gerar o link." };
  revalidatePath(`/fornecedores/${supplierId}`);
  return { hash: data.hash };
}
