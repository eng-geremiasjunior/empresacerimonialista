"use server";

// A cara da festa (176): cor, fundo, topo e retrato. A família e a
// equipe do evento escrevem; a RLS da 176 é a trava real. O autor e a
// hora são gravados pelo gatilho do banco, não por aqui.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { corValida, ehFundo, ehTopo, type CorDaFesta, type Fundo, type Topo } from "@/lib/cor-da-festa";

export type MudancaDeEstilo = {
  cor?: CorDaFesta;
  fundo?: Fundo;
  topo?: Topo;
  /** caminho no balde 'inspiracoes' (a pasta é o evento), ou null para tirar */
  retratoPath?: string | null;
  retratoNoConvite?: boolean;
};

export async function salvarEstilo(
  eventoId: string,
  m: MudancaDeEstilo
): Promise<{ ok: true } | { error: string }> {
  const linha: Record<string, unknown> = { event_id: eventoId };
  if (m.cor !== undefined) {
    const cor = corValida(m.cor);
    if (!cor) return { error: "Cor inválida." };
    Object.assign(linha, { cor_nome: cor.nome, cor_l: cor.l, cor_c: cor.c, cor_h: cor.h });
  }
  if (m.fundo !== undefined) {
    if (!ehFundo(m.fundo)) return { error: "Fundo inválido." };
    linha.fundo = m.fundo;
  }
  if (m.topo !== undefined) {
    if (!ehTopo(m.topo)) return { error: "Topo inválido." };
    linha.topo = m.topo;
  }
  if (m.retratoPath !== undefined) {
    if (m.retratoPath !== null && !m.retratoPath.startsWith(`${eventoId}/`)) {
      return { error: "Retrato inválido." };
    }
    linha.retrato_path = m.retratoPath;
  }
  if (m.retratoNoConvite !== undefined) linha.retrato_no_convite = m.retratoNoConvite === true;

  const supabase = createClient();
  const { error } = await supabase
    .from("evento_portal_estilo")
    .upsert(linha, { onConflict: "event_id" });
  if (error) return { error: "Não foi possível salvar agora. Tente de novo." };
  revalidatePath(`/portal/${eventoId}`, "layout");
  return { ok: true };
}
