"use server";

import { convidarClienteDoEvento } from "@/lib/portal-convite";
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
  NIVEIS_PORTAL,
  NIVEL_PORTAL_LABELS,
  criarAcessoPortal,
  regerarSenhaProvisoria,
  type NivelPortal,
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

/** Nível vindo do formulário: só um dos cinco; fora disso, o padrão do banco. */
function nivelDoForm(v: string | undefined): NivelPortal | undefined {
  return v && (NIVEIS_PORTAL as string[]).includes(v) ? (v as NivelPortal) : undefined;
}

/**
 * Um nível diferente de 'casal' só é gravado com a 190 no banco: sem ela,
 * a mãe ou o padrinho ainda leriam valores e alergias direto pela API, e o
 * rótulo do formulário prometeria o que o banco não cumpre. A RPC
 * portal_opcoes_das_escolhas é a última coisa que a 190 cria; se ela não
 * responde, o acesso não é criado.
 */
async function nivelNoAr(eventId: string, nivel: NivelPortal | undefined): Promise<string | null> {
  if (!nivel || nivel === "casal") return null;
  const supabase = createClient();
  const { error } = await supabase.rpc("portal_opcoes_das_escolhas", { p_event_id: eventId });
  if (!error) return null;
  return `“${NIVEL_PORTAL_LABELS[nivel]}” ainda não está disponível. Por enquanto, use “${NIVEL_PORTAL_LABELS.casal}”.`;
}

/** O aviso de quando a pessoa já entrava no evento e o nível ficou. */
function avisoNivelMantido(n: NivelPortal | undefined): string {
  return n ? ` Essa pessoa já tinha acesso: o que vê no portal continua “${NIVEL_PORTAL_LABELS[n]}”.` : "";
}

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
  form: { nome: string; email: string; papel: string; nivel?: string; clientId?: string | null }
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
  const nivel = nivelDoForm(form.nivel);
  const semNivel = await nivelNoAr(eventId, nivel);
  if (semNivel) return { error: semNivel };

  const r = await criarAcessoPortal({
    eventId,
    empresaId: guarda.empresaId!,
    nome,
    email,
    papel,
    nivel,
    clientId: form.clientId ?? null,
    criadoPor: guarda.membroId ?? null,
  });

  if ("error" in r) return { error: r.error };

  revalidatePath(`/eventos/${eventId}/editar`);
  return {
    success: true,
    senhaProvisoria: r.senhaProvisoria,
    mensagem:
      (r.ehEquipe
        ? "Acesso vinculado. Como este e-mail já é do sistema, a senha continua a mesma — é só abrir /portal."
        : r.jaTinhaLogin
          ? "Acesso vinculado. A senha provisória foi renovada."
          : "Acesso criado.") + avisoNivelMantido(r.nivelMantido),
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

/**
 * Convite por e-mail (173): o acesso nasce e a cliente recebe o link para
 * CRIAR a própria senha — ninguém dita senha provisória. Mesma guarda do
 * criarAcessoDaCliente.
 */
export async function convidarParaOPortal(
  eventId: string,
  form: { nome: string; email: string; papel: string; nivel?: string }
): Promise<{ error: string } | { success: true; mensagem: string; textoWhatsapp: string }> {
  const guarda = await podeEditar(eventId);
  if (guarda.error) return { error: guarda.error };
  const papel = (PAPEIS as string[]).includes(form.papel) ? (form.papel as PapelPortal) : "outro";
  const nivel = nivelDoForm(form.nivel);
  const semNivel = await nivelNoAr(eventId, nivel);
  if (semNivel) return { error: semNivel };
  const r = await convidarClienteDoEvento(eventId, {
    automatico: false,
    email: form.email,
    nome: form.nome,
    papel,
    nivel,
    criadoPor: guarda.membroId ?? null,
  });
  if (!r.ok) return { error: r.motivo };
  revalidatePath(`/eventos/${eventId}/editar`);
  revalidatePath(`/eventos/${eventId}/area-do-cliente`);
  return {
    success: true,
    mensagem: `Convite enviado para ${r.para}.${avisoNivelMantido(r.nivelMantido)}`,
    textoWhatsapp: r.textoWhatsapp,
  };
}
