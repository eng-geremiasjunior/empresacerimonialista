// Consultas server-side da equipe para os selects de responsável.
// Obs.: até a Etapa 4, o RLS de membros_equipe só permite leitura à
// proprietária — para outros cargos a lista volta vazia e as telas
// escondem o campo (comportamento documentado da Etapa 3).

import { createClient } from "@/lib/supabase/server";
import type { Cargo, MembroOption } from "@/lib/equipe-shared";

// Cargo do usuário logado (null = sem registro na equipe ou migração 021
// pendente). Usado para restringir menu e telas por papel (Etapa 4).
export async function getMeuCargo(): Promise<{
  cargo: Cargo | null;
  empresaId: string | null;
  membroId: string | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { cargo: null, empresaId: null, membroId: null };

  const { data } = await supabase
    .from("membros_equipe")
    .select("id, empresa_id, cargo")
    .eq("user_id", user.id)
    .eq("status", "ativo")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    cargo: (data?.cargo as Cargo) ?? null,
    empresaId: data?.empresa_id ?? null,
    membroId: data?.id ?? null,
  };
}

export type MembrosSelecionaveis = {
  membros: MembroOption[];
  // membro correspondente ao usuário logado (pré-seleção do wizard)
  meuMembroId: string | null;
};

export async function getMembrosSelecionaveis(): Promise<MembrosSelecionaveis> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("membros_equipe")
    .select("id, nome, cargo, user_id")
    .eq("status", "ativo")
    .order("is_owner", { ascending: false })
    .order("nome", { ascending: true });

  const rows = (data ?? []) as (MembroOption & { user_id: string | null })[];

  return {
    membros: rows.map(({ id, nome, cargo }) => ({ id, nome, cargo })),
    meuMembroId: rows.find((m) => m.user_id === user?.id)?.id ?? null,
  };
}
