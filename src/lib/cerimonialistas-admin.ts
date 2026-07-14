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
    user_metadata: { name: params.nome },
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
