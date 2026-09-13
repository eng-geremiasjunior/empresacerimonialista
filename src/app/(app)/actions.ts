"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Liga e desliga as fichas do `?` no menu, para QUEM ESTÁ LOGADA (159).
 *
 * Devolve o que ficou valendo, não o que foi pedido: se o banco recusar,
 * quem chamou fica sabendo. A tela já esconde o `?` na hora pelo estado
 * local — o que esta função garante é que a escolha sobreviva ao recarregar
 * e acompanhe a pessoa em outro computador.
 */
export async function definirExplicacoes(
  ativo: boolean
): Promise<{ ok: boolean; ativo: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("definir_explicacoes", {
    p_ativo: ativo,
  });
  if (error) return { ok: false, ativo: true };

  // O menu é do layout, e o layout é servido em todas as telas do app.
  revalidatePath("/", "layout");
  return { ok: true, ativo: data === false ? false : true };
}

/**
 * O guia do primeiro acesso (160). Três verbos e nada mais.
 *
 * Nenhum deles recebe "em que passo ela está": o passo é derivado dos
 * fatos a cada carregamento. O que se grava aqui é só o fim — pulou ou
 * terminou —, e os dois são permanentes.
 */
async function mexerNoGuia(acao: "dispensar" | "retomar" | "concluir") {
  const supabase = createClient();
  const { error } = await supabase.rpc("definir_guia", { p_acao: acao });
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** "Pular por agora": some, e não volta sozinho. */
export async function dispensarGuia() {
  return mexerNoGuia("dispensar");
}

/** Os cinco fatos ficaram verdadeiros. Carimba a data uma única vez. */
export async function concluirGuia() {
  return mexerNoGuia("concluir");
}

/** O caminho de volta, em Configurações. Só ela pede. */
export async function retomarGuia() {
  return mexerNoGuia("retomar");
}
