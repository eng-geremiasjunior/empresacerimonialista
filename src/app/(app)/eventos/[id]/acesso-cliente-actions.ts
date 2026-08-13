"use server";

// Gestão do acesso da cliente ao portal.
//
// A autorização acontece AQUI, em TypeScript, e não só na RLS: a criação
// do login usa service role (que passa por cima da RLS), então a guarda
// precisa ser explícita antes de chamar o módulo admin. Mesmo raciocínio
// de cerimonialistas/actions.ts.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import {
  criarAcessoPortal,
  regerarSenhaProvisoria,
  type PapelPortal,
} from "@/lib/portal-admin";

export type AcessoResult =
  | { error: string }
  | { success: true; senhaProvisoria?: string; mensagem: string };

const PAPEIS: PapelPortal[] = [
  "noiva",
  "noivo",
  "debutante",
  "mae",
  "pai",
  "outro",
];

/** Confirma pela sessão que quem chama pode editar este evento. */
async function podeEditar(eventId: string): Promise<{ empresaId?: string; membroId?: string; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: pode } = await supabase.rpc("pode_editar_evento", {
    p_event_id: eventId,
  });
  if (!pode) return { error: "Você não pode gerenciar este evento." };

  // empresa e membro vêm da SESSÃO, nunca do formulário
  const { empresaId, membroId } = await getMeuCargo();
  if (!empresaId) return { error: "Sua conta não está ligada a uma empresa." };

  return { empresaId, membroId: membroId ?? undefined };
}

export async function criarAcessoDaCliente(
  eventId: string,
  form: { nome: string; email: string; papel: string; clientId?: string | null }
): Promise<AcessoResult> {
  const guarda = await podeEditar(eventId);
  if (guarda.error) return { error: guarda.error };

  const nome = form.nome.trim();
  const email = form.email.trim().toLowerCase();
  if (!nome) return { error: "Informe o nome de quem vai acessar." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Informe um e-mail válido." };
  }
  const papel = (PAPEIS as string[]).includes(form.papel)
    ? (form.papel as PapelPortal)
    : "outro";

  const r = await criarAcessoPortal({
    eventId,
    empresaId: guarda.empresaId!,
    nome,
    email,
    papel,
    clientId: form.clientId ?? null,
    criadoPor: guarda.membroId ?? null,
  });

  if ("error" in r) return { error: r.error };

  revalidatePath(`/eventos/${eventId}/editar`);
  return {
    success: true,
    senhaProvisoria: r.senhaProvisoria,
    mensagem: r.ehEquipe
      ? "Acesso vinculado. Como este e-mail já é do sistema, a senha continua a mesma — é só abrir /portal."
      : r.jaTinhaLogin
        ? "Acesso vinculado. A senha provisória foi renovada."
        : "Acesso criado.",
  };
}

export async function revogarAcessoDaCliente(
  eventId: string,
  acessoId: string
): Promise<AcessoResult> {
  const guarda = await podeEditar(eventId);
  if (guarda.error) return { error: guarda.error };

  const supabase = createClient();
  // Revoga, não apaga: o que ela escreveu continua atribuído a ela.
  const { error } = await supabase
    .from("evento_acesso")
    .update({ status: "revogado", updated_at: new Date().toISOString() })
    .eq("id", acessoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível revogar o acesso." };
  revalidatePath(`/eventos/${eventId}/editar`);
  return { success: true, mensagem: "Acesso revogado." };
}

export async function reativarAcessoDaCliente(
  eventId: string,
  acessoId: string
): Promise<AcessoResult> {
  const guarda = await podeEditar(eventId);
  if (guarda.error) return { error: guarda.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("evento_acesso")
    .update({ status: "ativo", updated_at: new Date().toISOString() })
    .eq("id", acessoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível reativar o acesso." };
  revalidatePath(`/eventos/${eventId}/editar`);
  return { success: true, mensagem: "Acesso reativado." };
}

export async function novaSenhaProvisoria(
  eventId: string,
  acessoId: string
): Promise<AcessoResult> {
  const guarda = await podeEditar(eventId);
  if (guarda.error) return { error: guarda.error };

  const supabase = createClient();
  const { data: acesso } = await supabase
    .from("evento_acesso")
    .select("user_id")
    .eq("id", acessoId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!acesso?.user_id) return { error: "Acesso não encontrado." };

  // Nunca gerar senha provisória para um login da equipe: trocaria a senha
  // real da pessoa e a prenderia na tela de primeiro acesso.
  const { data: membro } = await supabase
    .from("membros_equipe")
    .select("id")
    .eq("user_id", acesso.user_id)
    .maybeSingle();
  if (membro) {
    return {
      error:
        "Este acesso usa um login da equipe. A senha dele é a mesma do sistema e não deve ser trocada por aqui.",
    };
  }

  const r = await regerarSenhaProvisoria(acesso.user_id);
  if (r.error) return { error: r.error };

  return {
    success: true,
    senhaProvisoria: r.senhaProvisoria,
    mensagem: "Nova senha provisória gerada.",
  };
}
