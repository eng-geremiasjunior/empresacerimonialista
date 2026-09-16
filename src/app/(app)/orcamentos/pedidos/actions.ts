"use server";

// O que a equipe faz com um pedido além de responder com proposta: encerrar.
// Um clique, motivo se quiser. A RLS da 165 decide quem pode (dona,
// coordenadora e cerimonialista da empresa).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function encerrarPedido(
  id: string,
  motivo: string | null
): Promise<{ ok: true } | { error: string }> {
  if (!UUID.test(id)) return { error: "Pedido não encontrado." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("pedido_orcamento")
    .update({
      status: "encerrado",
      motivo_encerramento: (motivo ?? "").trim().slice(0, 200) || null,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[eorg:pedido] encerrar:", error.code, (error.message ?? "").slice(0, 120));
    return { error: "Não foi possível encerrar o pedido." };
  }
  if (!data || data.length === 0) return { error: "Pedido não encontrado." };

  revalidatePath("/orcamentos/pedidos");
  revalidatePath("/orcamentos");
  return { ok: true };
}
