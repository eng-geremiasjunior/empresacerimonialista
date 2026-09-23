import "server-only";

// Quem parou no cartão (169, 22/09/2026).
//
// Desde 21/09 a conta só nasce com o cartão. A etapa 1 do cadastro (nome,
// negócio, e-mail, WhatsApp) fica guardada quando ela passa para o cartão;
// se a conta não nascer, ela aparece aqui para o dono chamar no WhatsApp.
// A linha nunca tem senha, CPF, endereço ou cartão.

import { exigirSuperAdmin, servico } from "@/lib/supabase/admin-painel";

export type CadastroInterrompido = {
  id: string;
  email: string;
  nome: string | null;
  negocio: string | null;
  whatsapp: string | null;
  instagram: string | null;
  eventos_3_meses: string | null;
  origem: Record<string, string> | null;
  tentativas: number;
  criado_em: string;
  atualizado_em: string;
  contatado_em: string | null;
};

export type LeituraDosInterrompidos =
  | { ok: true; pendentes: CadastroInterrompido[]; falados: CadastroInterrompido[] }
  | { ok: false; mensagem: string };

/** Os que não viraram conta nos últimos 30 dias: primeiro quem ele ainda não chamou. */
export async function getCadastrosInterrompidos(): Promise<LeituraDosInterrompidos> {
  await exigirSuperAdmin();
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await servico()
    .from("cadastro_interrompido")
    .select(
      "id, email, nome, negocio, whatsapp, instagram, eventos_3_meses, origem, tentativas, criado_em, atualizado_em, contatado_em"
    )
    .is("convertido_em", null)
    .gte("atualizado_em", desde)
    .order("atualizado_em", { ascending: false })
    .limit(60);
  if (error) {
    // sem a 169 aplicada, a tabela não existe: a Visão geral segue sem a seção
    return { ok: false, mensagem: error.message };
  }
  const linhas = (data ?? []) as CadastroInterrompido[];
  return {
    ok: true,
    pendentes: linhas.filter((l) => !l.contatado_em),
    falados: linhas.filter((l) => l.contatado_em),
  };
}

/** "Já falei" — ou desfazer, se ele marcou a pessoa errada. */
export async function marcarContatadoDb(id: string, falou: boolean): Promise<void> {
  await exigirSuperAdmin();
  const { error } = await servico()
    .from("cadastro_interrompido")
    .update({ contatado_em: falou ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
