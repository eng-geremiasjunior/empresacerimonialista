"use server";

// Ações da tela Cerimonialistas. A empresa NUNCA vem do client: é
// derivada da sessão (o usuário logado precisa ser o owner da empresa).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { criarCerimonialista } from "@/lib/cerimonialistas-admin";
import { CARGOS_CADASTRO } from "@/lib/equipe-shared";
import {
  getDetalheCerimonialista,
  type DetalheCerimonialista,
} from "@/lib/supabase/cerimonialistas";

// Detalhe do membro para o painel (carregado sob demanda ao abrir o card).
// O RLS garante que só quem pode ver a equipe recebe os dados.
export async function carregarDetalhe(
  membroId: string
): Promise<DetalheCerimonialista | null> {
  return getDetalheCerimonialista(membroId);
}

type Resultado = { error?: string };

// Empresa da qual o usuário logado é proprietário (RLS já limita, mas
// validamos explicitamente para as ações administrativas).
async function empresaDoOwner() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" as const };

  const { data: empresa, error } = await supabase
    .from("empresas")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error?.code === "42P01" || error?.code === "PGRST205") {
    return {
      error:
        "A migração 021_fundacao_empresas_equipe.sql ainda não foi aplicada no Supabase" as const,
    };
  }
  if (!empresa) {
    // Usuário logado não é dono de empresa (ex.: uma cerimonialista da
    // equipe) — só a proprietária gerencia a equipe.
    return {
      error:
        "Apenas a proprietária da empresa pode gerenciar a equipe" as const,
    };
  }
  return { empresaId: empresa.id as string, supabase };
}

export type NovaCerimonialista = {
  nome: string;
  email: string;
  senha: string;
  cargo: string;
  especialidades: string[];
};

export async function cadastrarCerimonialista(
  input: NovaCerimonialista
): Promise<Resultado> {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();

  if (!nome) return { error: "Informe o nome completo" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "E-mail inválido" };
  }
  if (
    !CARGOS_CADASTRO.includes(input.cargo as (typeof CARGOS_CADASTRO)[number])
  ) {
    return { error: "Cargo inválido" };
  }
  if ((input.senha ?? "").length < 6) {
    return { error: "A senha precisa de pelo menos 6 caracteres" };
  }

  const ctx = await empresaDoOwner();
  if ("error" in ctx) return { error: ctx.error };

  // E-mail já usado por outro membro desta empresa?
  const { data: existente } = await ctx.supabase
    .from("membros_equipe")
    .select("id")
    .eq("empresa_id", ctx.empresaId)
    .ilike("email", email)
    .maybeSingle();
  if (existente) {
    return { error: "Já existe um membro da equipe com este e-mail" };
  }

  const r = await criarCerimonialista({
    empresaId: ctx.empresaId,
    nome,
    email,
    senha: input.senha,
    cargo: input.cargo as "coordenadora" | "cerimonialista" | "assistente",
    especialidades: input.especialidades ?? [],
  });
  if (r.error) return { error: r.error };

  revalidatePath("/cerimonialistas");
  return {};
}

export async function editarMembro(
  membroId: string,
  input: { nome: string; cargo: string; especialidades: string[] }
): Promise<Resultado> {
  const nome = input.nome.trim();
  if (!nome) return { error: "Informe o nome" };
  if (
    !CARGOS_CADASTRO.includes(input.cargo as (typeof CARGOS_CADASTRO)[number])
  ) {
    return { error: "Cargo inválido" };
  }

  const ctx = await empresaDoOwner();
  if ("error" in ctx) return { error: ctx.error };

  // A proprietária não pode ter o cargo alterado
  const { error } = await ctx.supabase
    .from("membros_equipe")
    .update({
      nome,
      cargo: input.cargo,
      especialidades: input.especialidades ?? [],
    })
    .eq("id", membroId)
    .eq("empresa_id", ctx.empresaId)
    .eq("is_owner", false);

  if (error) return { error: "Não foi possível salvar as alterações" };
  revalidatePath("/cerimonialistas");
  return {};
}

export async function setStatusMembro(
  membroId: string,
  status: "ativo" | "inativo"
): Promise<Resultado> {
  if (status !== "ativo" && status !== "inativo") {
    return { error: "Status inválido" };
  }

  const ctx = await empresaDoOwner();
  if ("error" in ctx) return { error: ctx.error };

  // A proprietária nunca pode ser desativada
  const { error } = await ctx.supabase
    .from("membros_equipe")
    .update({ status })
    .eq("id", membroId)
    .eq("empresa_id", ctx.empresaId)
    .eq("is_owner", false);

  if (error) return { error: "Não foi possível alterar o status" };
  revalidatePath("/cerimonialistas");
  return {};
}
