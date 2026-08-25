// Criação de login de cerimonialista via Admin API (service role).
// SERVER-SIDE APENAS: nunca importar deste módulo em componente client —
// a SUPABASE_SERVICE_ROLE_KEY não pode chegar ao navegador.

import { createClient } from "@supabase/supabase-js";
import type { MembroEquipe } from "@/lib/equipe-shared";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Next.js cacheia fetches GET em contexto server; sempre no-store.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

/**
 * Derruba TODAS as sessões de um login (refresh tokens inclusive).
 *
 * Desativar um membro só mudava `membros_equipe.status`, e a RLS passa a
 * negar quase tudo a partir daí — mas a sessão dele continuava válida e
 * nada no Auth mudava. Sobrava um app aberto, e as duas superfícies que
 * não passam por meu_cargo() (notifications e activities) seguiam
 * entregando nome de fornecedor, valores e links para quem já saiu.
 *
 * Devolve o erro em vez de lançar: falhar aqui não pode desfazer a
 * desativação, que é a parte que importa.
 */
export async function derrubarSessoes(
  userId: string
): Promise<{ error?: string }> {
  const admin = adminClient();
  if (!admin) return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };
  const { error } = await admin.auth.admin.signOut(userId, "global");
  return error ? { error: error.message } : {};
}

export async function criarCerimonialista(params: {
  empresaId: string;
  nome: string;
  email: string;
  senha: string;
  cargo: "coordenadora" | "cerimonialista" | "assistente";
  especialidades: string[];
}): Promise<{ membro?: MembroEquipe; error?: string }> {
  const admin = adminClient();
  if (!admin) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente" };
  }

  // 1) Cria o usuário já com e-mail confirmado (sem link de verificação)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.senha,
    email_confirm: true,
    // equipe: true → o trigger de signup (migração 024) NÃO cria uma
    // empresa própria para este login; ele entra como membro da equipe.
    user_metadata: { name: params.nome, equipe: true },
  });

  if (authError || !authData?.user) {
    const raw = authError?.message ?? "";
    if (/already.*(registered|exists)/i.test(raw)) {
      return { error: "Já existe um login com este e-mail no sistema." };
    }
    return { error: `Não foi possível criar o login: ${raw}` };
  }

  // 2) Registra o membro da equipe vinculado ao novo login
  const { data: membro, error: membroError } = await admin
    .from("membros_equipe")
    .insert({
      empresa_id: params.empresaId,
      user_id: authData.user.id,
      nome: params.nome,
      email: params.email,
      cargo: params.cargo,
      especialidades: params.especialidades,
      status: "ativo",
      is_owner: false,
    })
    .select()
    .single();

  if (membroError || !membro) {
    // desfaz a criação do login para não deixar usuário órfão
    await admin.auth.admin.deleteUser(authData.user.id);
    return {
      error: `Não foi possível registrar o membro: ${membroError?.message}`,
    };
  }

  return { membro: membro as MembroEquipe };
}
