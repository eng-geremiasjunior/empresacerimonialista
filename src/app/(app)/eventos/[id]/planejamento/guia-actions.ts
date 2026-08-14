"use server";

// Montar o guia de estilo — o lado da cerimonialista.
//
// O guia é o produto da decisão "Fazer o briefing de decoração": ela
// monta a partir do drawer daquela decisão, como preenche qualquer outro
// campo. Não é área nova.
//
// A paleta vem da biblioteca da empresa (Catálogo) e é copiada POR VALOR:
// mexer na biblioteca depois não pode reescrever o guia de um casamento
// que já foi aprovado.

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getGuiaDoEvento, getPaletas } from "@/lib/supabase/guia-estilo";
import type { GuiaDeEstilo, PaletaDaBiblioteca } from "@/lib/guia-shared";

export type ResultadoGuia = { error: string } | { success: true; id?: string };

export async function carregarGuia(eventId: string): Promise<GuiaDeEstilo | null> {
  return getGuiaDoEvento(eventId);
}

export async function carregarPaletas(): Promise<PaletaDaBiblioteca[]> {
  return getPaletas();
}

/** Cria o guia (ou devolve o que já existe) e copia a paleta escolhida. */
export async function criarGuia(
  eventId: string,
  decisaoId: string | null,
  paletaId: string | null
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existente } = await supabase
    .from("evento_guia_estilo")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existente) return { success: true, id: existente.id };

  let nome = "Guia de estilo";
  let sensacao: string | null = null;
  let cores: { nome: string; papel: string; hex: string; ordem: number }[] = [];

  if (paletaId) {
    const { data: paleta } = await supabase
      .from("paleta_biblioteca")
      .select("nome, sensacao, paleta_biblioteca_cor(nome, papel, hex, ordem)")
      .eq("id", paletaId)
      .maybeSingle();
    if (paleta) {
      nome = paleta.nome as string;
      sensacao = (paleta.sensacao as string) ?? null;
      cores = ((paleta.paleta_biblioteca_cor as Record<string, unknown>[]) ?? []).map(
        (c) => ({
          nome: c.nome as string,
          papel: c.papel as string,
          hex: c.hex as string,
          ordem: (c.ordem as number) ?? 0,
        })
      );
    }
  }

  const { data: guia, error } = await supabase
    .from("evento_guia_estilo")
    .insert({
      event_id: eventId,
      evento_decisao_id: decisaoId,
      paleta_id: paletaId,
      nome,
      sensacao,
      criado_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !guia) return { error: "Não foi possível criar o guia." };

  if (cores.length > 0) {
    await supabase.from("evento_guia_cor").insert(
      cores.map((c) => ({ ...c, guia_id: guia.id }))
    );
  }

  await supabase.from("evento_guia_historico").insert({
    guia_id: guia.id,
    tipo: "montado",
    texto: "Guia criado",
    autor_user_id: user?.id ?? null,
  });

  revalidatePath(`/eventos/${eventId}/planejamento`);
  revalidatePath(`/portal/${eventId}/guia-estilo`);
  return { success: true, id: guia.id };
}

export async function salvarCabecalhoGuia(
  eventId: string,
  guiaId: string,
  campos: { nome?: string; sensacao?: string }
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_guia_estilo")
    .update({
      ...(campos.nome !== undefined ? { nome: campos.nome.trim() || "Guia de estilo" } : {}),
      ...(campos.sensacao !== undefined
        ? { sensacao: campos.sensacao.trim() || null }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", guiaId);
  if (error) return { error: "Não foi possível salvar." };
  await marcarAlterado(eventId, guiaId);
  return { success: true };
}

export async function salvarPapelaria(
  eventId: string,
  guiaId: string,
  campos: {
    fontes: string;
    nomeCasal: string;
    data: string;
    local: string;
    nota: string;
  }
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_guia_estilo")
    .update({
      papelaria_fontes: campos.fontes.trim() || null,
      papelaria_nome_casal: campos.nomeCasal.trim() || null,
      papelaria_data: campos.data.trim() || null,
      papelaria_local: campos.local.trim() || null,
      papelaria_nota: campos.nota.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guiaId);
  if (error) return { error: "Não foi possível salvar a papelaria." };
  await marcarAlterado(eventId, guiaId);
  return { success: true };
}

// ------------------------------------------------------------------
// Itens: cor, flor, material, traje
// ------------------------------------------------------------------

type TabelaItem = "cor" | "flor" | "material" | "traje";
const TABELA: Record<TabelaItem, string> = {
  cor: "evento_guia_cor",
  flor: "evento_guia_flor",
  material: "evento_guia_material",
  traje: "evento_guia_traje",
};

export async function salvarItemGuia(
  eventId: string,
  guiaId: string,
  tipo: TabelaItem,
  item: Record<string, unknown> & { id?: string }
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const { id, ...campos } = item;

  if (id) {
    const { error } = await supabase
      .from(TABELA[tipo])
      .update(campos)
      .eq("id", id)
      .eq("guia_id", guiaId);
    if (error) return { error: "Não foi possível salvar." };
  } else {
    const { error } = await supabase
      .from(TABELA[tipo])
      .insert({ ...campos, guia_id: guiaId });
    if (error) return { error: "Não foi possível adicionar." };
  }

  await marcarAlterado(eventId, guiaId);
  return { success: true };
}

export async function removerItemGuia(
  eventId: string,
  guiaId: string,
  tipo: TabelaItem,
  id: string
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const { error } = await supabase
    .from(TABELA[tipo])
    .delete()
    .eq("id", id)
    .eq("guia_id", guiaId);
  if (error) return { error: "Não foi possível remover." };
  await marcarAlterado(eventId, guiaId);
  return { success: true };
}

// ------------------------------------------------------------------
// Situação
// ------------------------------------------------------------------

/** Manda para a cliente: sai de montagem e entra em "aguardando". */
export async function enviarGuiaParaCliente(
  eventId: string,
  guiaId: string
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("evento_guia_estilo")
    .update({ situacao: "aguardando", updated_at: new Date().toISOString() })
    .eq("id", guiaId);
  if (error) return { error: "Não foi possível enviar." };

  await supabase.from("evento_guia_historico").insert({
    guia_id: guiaId,
    tipo: "enviado",
    texto: "Enviado para o casal ver",
    autor_user_id: user?.id ?? null,
  });

  revalidatePath(`/eventos/${eventId}/planejamento`);
  revalidatePath(`/portal/${eventId}/guia-estilo`);
  return { success: true };
}

/**
 * Mexer num guia já aprovado não apaga a aprovação: passa para
 * "alterado", que pede nova confirmação e MANTÉM o histórico. Em
 * montagem ou aguardando, editar não muda situação nenhuma.
 */
async function marcarAlterado(eventId: string, guiaId: string) {
  const supabase = createClient();
  const { data: guia } = await supabase
    .from("evento_guia_estilo")
    .select("situacao")
    .eq("id", guiaId)
    .maybeSingle();

  if (guia?.situacao === "aprovado") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("evento_guia_estilo")
      .update({ situacao: "alterado", updated_at: new Date().toISOString() })
      .eq("id", guiaId);
    await supabase.from("evento_guia_historico").insert({
      guia_id: guiaId,
      tipo: "alterado",
      texto: "O guia mudou depois da aprovação",
      autor_user_id: user?.id ?? null,
    });
  }

  revalidatePath(`/eventos/${eventId}/planejamento`);
  revalidatePath(`/portal/${eventId}/guia-estilo`);
}

// ------------------------------------------------------------------
// Distribuição por fatia
// ------------------------------------------------------------------

/**
 * Cada fornecedor recebe o pedaço dele. A floricultura vê cores e
 * flores; a papelaria vê cores e papelaria. Ninguém recebe o guia
 * inteiro, e nada sai antes de o casal aprovar (a RPC pública recusa).
 */
export async function compartilharGuia(
  eventId: string,
  guiaId: string,
  supplierId: string,
  secoes: string[]
): Promise<ResultadoGuia> {
  if (secoes.length === 0) {
    return { error: "Escolha ao menos uma seção para enviar." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existente } = await supabase
    .from("guia_compartilhamento")
    .select("id")
    .eq("guia_id", guiaId)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("guia_compartilhamento")
      .update({ secoes })
      .eq("id", existente.id);
    if (error) return { error: "Não foi possível atualizar o envio." };
  } else {
    const { error } = await supabase.from("guia_compartilhamento").insert({
      guia_id: guiaId,
      supplier_id: supplierId,
      secoes,
      hash: randomUUID().replace(/-/g, ""),
      compartilhado_por: user?.id ?? null,
    });
    if (error) return { error: "Não foi possível compartilhar." };
  }

  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

export async function pararDeCompartilharGuia(
  eventId: string,
  guiaId: string,
  supplierId: string
): Promise<ResultadoGuia> {
  const supabase = createClient();
  const { error } = await supabase
    .from("guia_compartilhamento")
    .delete()
    .eq("guia_id", guiaId)
    .eq("supplier_id", supplierId);
  if (error) return { error: "Não foi possível desfazer." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

export async function carregarCompartilhamentos(guiaId: string) {
  const { getCompartilhamentos } = await import("@/lib/supabase/guia-estilo");
  return getCompartilhamentos(guiaId);
}
