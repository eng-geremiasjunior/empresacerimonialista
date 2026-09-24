"use server";

// O primeiro fornecedor (24/09/2026): o passo que faz o eOrganizei valer
// no primeiro dia — o roteiro chega no celular de quem trabalha no evento.
// Cadastra o fornecedor, vincula ao evento (o link nasce junto, 158) e
// marca nele os itens do roteiro que ela escolheu. Tudo pela sessão dela.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { vincularFornecedor } from "../fornecedores/actions";

export async function criarPrimeiroFornecedor(
  eventId: string,
  nome: string,
  whatsapp: string
): Promise<{ supplierId: string } | { error: string }> {
  const limpo = nome.trim().slice(0, 120);
  if (!limpo) return { error: "Escreva o nome do fornecedor." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre de novo." };

  const zap = whatsapp.replace(/\D/g, "").slice(0, 13) || null;
  const { data: s, error } = await supabase
    .from("suppliers")
    .insert({ cerimonialista_id: user.id, name: limpo, whatsapp: zap, phone: zap })
    .select("id")
    .single();
  if (error || !s) return { error: "Não foi possível cadastrar o fornecedor agora." };

  const v = await vincularFornecedor(eventId, s.id as string);
  if (v.error) return { error: v.error };
  return { supplierId: s.id as string };
}

export async function marcarItensDoFornecedor(
  eventId: string,
  supplierId: string,
  itemIds: string[]
): Promise<{ hash: string } | { error: string }> {
  const supabase = createClient();
  if (itemIds.length) {
    const { error } = await supabase
      .from("roteiro_items")
      .update({ supplier_id: supplierId })
      .eq("event_id", eventId)
      .in("id", itemIds.slice(0, 100));
    if (error) return { error: "Não foi possível marcar os horários agora." };
  }
  const { data } = await supabase
    .from("roteiro_links")
    .select("hash")
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId)
    .maybeSingle();
  revalidatePath(`/eventos/${eventId}/roteiro`);
  if (!data?.hash) return { error: "O link não ficou pronto. Recarregue a página." };
  return { hash: data.hash as string };
}
