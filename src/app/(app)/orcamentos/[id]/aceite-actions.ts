"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Alguém da equipe abriu o orçamento depois do aceite.
//
// É o que faz o Copiloto parar de cobrar "Proposta aceita: conferir o
// termo": o prazo é derivado (some ao abrir ou em 7 dias), e abrir a
// tela É a conferência. Grava uma vez só — `aceite_visto_em is null` no
// filtro — e roda pela sessão dela: a policy de update de `orcamentos`
// já vale para a equipe inteira.
//
// Só quando gravou de fato a árvore é re-renderizada (o cartão do
// Copiloto na barra lateral sai da lista na hora); a segunda abertura
// não paga o custo de montar a página de novo.
export async function marcarAceiteVisto(orcamentoId: string): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase
    .from("orcamentos")
    .update({ aceite_visto_em: new Date().toISOString() })
    .eq("id", orcamentoId)
    .is("aceite_visto_em", null)
    .select("id");

  // Antes da 162 a coluna não existe e o update falha: sem efeito e sem
  // erro na tela — o orçamento continua abrindo.
  if (data && data.length > 0) {
    revalidatePath("/orcamentos/[id]", "layout");
  }
}
