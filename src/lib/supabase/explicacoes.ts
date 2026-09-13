// A preferência de uma pessoa sobre as fichas do menu (migração 159).
//
// Leitura e escrita passam por função do banco, e não por `select` na
// tabela, de propósito: o PostgREST derruba a consulta inteira quando um
// campo pedido não existe. Se o deploy chegar antes da migração, um
// `select` ampliado em `membros_equipe` deixaria TODO MUNDO sem cargo.
// Assim o pior caso é local — a função não existe, e o app assume o
// padrão: explicações ligadas, que é o que serve a quem não conhece.

import { createClient } from "@/lib/supabase/server";

/** Padrão quando não dá para saber. Ligado serve a quem está chegando. */
const PADRAO = true;

export async function getExplicacoesLigadas(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("minhas_explicacoes");
    if (error) return PADRAO;
    return data === false ? false : PADRAO;
  } catch {
    return PADRAO;
  }
}
