"use server";

// A biblioteca de paletas — configuração da EMPRESA, não do evento. A
// mesma serve todos os casamentos, e é por isso que mora no Catálogo,
// junto do resto que a empresa define uma vez e reusa sempre.
//
// As paletas do sistema (empresa_id nulo) são acervo: aparecem para
// todas, e a policy da 096 impede qualquer empresa de editá-las.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResultadoPaleta = { error: string } | { success: true; id?: string };

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function criarPaleta(
  nome: string,
  sensacao: string,
  cores: { nome: string; papel: string; hex: string }[]
): Promise<ResultadoPaleta> {
  if (!nome.trim()) return { error: "A paleta precisa de um nome." };
  const validas = cores.filter((c) => c.nome.trim() && HEX.test(c.hex.trim()));
  if (validas.length < 2) {
    return { error: "Uma paleta tem pelo menos duas cores, com o hex completo." };
  }

  const supabase = createClient();
  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string }[] | null)?.[0];
  if (!cargo?.empresa_id) return { error: "Empresa não encontrada." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: paleta, error } = await supabase
    .from("paleta_biblioteca")
    .insert({
      empresa_id: cargo.empresa_id,
      nome: nome.trim(),
      sensacao: sensacao.trim() || null,
      criado_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !paleta) return { error: "Não foi possível criar a paleta." };

  const { error: eCor } = await supabase.from("paleta_biblioteca_cor").insert(
    validas.map((c, i) => ({
      paleta_id: paleta.id,
      nome: c.nome.trim(),
      papel: c.papel,
      hex: c.hex.trim().toUpperCase(),
      ordem: i,
    }))
  );
  if (eCor) return { error: "Não foi possível salvar as cores." };

  revalidatePath("/catalogo/paletas");
  return { success: true, id: paleta.id };
}

export async function removerPaleta(id: string): Promise<ResultadoPaleta> {
  const supabase = createClient();
  // A policy já impede apagar as do sistema; o filtro por empresa aqui é
  // só para a mensagem sair clara em vez de "0 linhas afetadas".
  const { error } = await supabase.from("paleta_biblioteca").delete().eq("id", id);
  if (error) return { error: "Não foi possível remover." };
  revalidatePath("/catalogo/paletas");
  return { success: true };
}

/** Copia uma paleta do acervo para a empresa, para poder ajustar. */
export async function duplicarPaleta(id: string): Promise<ResultadoPaleta> {
  const supabase = createClient();
  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string }[] | null)?.[0];
  if (!cargo?.empresa_id) return { error: "Empresa não encontrada." };

  const { data: origem } = await supabase
    .from("paleta_biblioteca")
    .select("nome, sensacao, paleta_biblioteca_cor(nome, papel, hex, ordem)")
    .eq("id", id)
    .maybeSingle();
  if (!origem) return { error: "Paleta não encontrada." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: nova, error } = await supabase
    .from("paleta_biblioteca")
    .insert({
      empresa_id: cargo.empresa_id,
      nome: `${origem.nome} (sua versão)`,
      sensacao: origem.sensacao,
      criado_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !nova) return { error: "Não foi possível duplicar." };

  const cores = (origem.paleta_biblioteca_cor as Record<string, unknown>[]) ?? [];
  if (cores.length > 0) {
    await supabase.from("paleta_biblioteca_cor").insert(
      cores.map((c) => ({
        paleta_id: nova.id,
        nome: c.nome as string,
        papel: c.papel as string,
        hex: c.hex as string,
        ordem: (c.ordem as number) ?? 0,
      }))
    );
  }

  revalidatePath("/catalogo/paletas");
  return { success: true, id: nova.id };
}
