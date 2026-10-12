import "server-only";

// O CPF ou CNPJ da empresa (205, 12/10/2026): obrigatório no cadastro e
// único — um documento, uma conta. A suspensa continua dona do documento.
// Sem a 205 aplicada (a coluna não existe), a leitura falha e não barra; a
// validação dos dígitos continua valendo.

import type { SupabaseClient } from "@supabase/supabase-js";

export const DOCUMENTO_JA_USADO =
  "Já existe uma conta com este CPF ou CNPJ. Somente 1 conta é permitida por documento. Acesse a conta existente.";

/** Este documento (só dígitos) já é de alguma empresa? */
export async function documentoJaUsado(db: SupabaseClient, digitos: string): Promise<boolean> {
  try {
    const { data, error } = await db.from("empresas").select("id").eq("documento", digitos).limit(1);
    if (error) return false;
    return (data ?? []).length > 0;
  } catch {
    return false;
  }
}

/** Grava o documento na empresa recém-nascida. Devolve false se ele já era de outra (corrida). */
export async function gravarDocumento(db: SupabaseClient, empresaId: string, digitos: string): Promise<boolean> {
  const { error } = await db.from("empresas").update({ documento: digitos }).eq("id", empresaId);
  if (!error) return true;
  // 23505 = outra conta pegou o documento no meio do caminho
  if (error.code === "23505") return false;
  console.error("[eorganizei:cadastro] documento da empresa:", error.code ?? "sem código");
  return true;
}
