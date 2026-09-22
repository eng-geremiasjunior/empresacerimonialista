import "server-only";

// O disparo de e-mail do painel (22/09/2026).
//
// Antes, o botão "E-mail" da ficha era um `mailto:` — abria o Gmail dele,
// sem a cara do produto e sem ficar registrado em lugar nenhum. Agora a
// mensagem sai pelo mesmo molde da régua de ativação (email-ativacao-
// textos.ts), do mesmo remetente, e a auditoria guarda que saiu, para
// quem e com que assunto.
//
// Só o dono manda, e só para a DONA da conta: nada de escolher
// destinatário à mão — e-mail digitado errado vira mensagem da marca na
// caixa de um estranho.
//
// O texto nunca é montado aqui: quem escreve é ele, na tela. Este módulo
// só confere os limites, monta o HTML e entrega ao Resend.

import { enviarViaResend } from "@/lib/email";
import { REMETENTE, RESPONDER_PARA, casca } from "@/lib/email-ativacao-textos";
import { exigirSuperAdmin, registrarAcaoAdmin, servico } from "@/lib/supabase/admin-painel";
import {
  destinoAceito,
  LIMITES_DO_EMAIL,
  type EmailDoPainel,
} from "@/lib/admin/email-do-painel";

export type { EmailDoPainel };

function limpar(t: string, limite: number): string {
  return t.replace(/\s+/g, " ").trim().slice(0, limite);
}

/** A dona da conta: o único destinatário possível. */
async function donaDaConta(empresaId: string): Promise<{ userId: string; email: string; nome: string }> {
  const db = servico();
  const { data: empresa, error } = await db
    .from("empresas")
    .select("owner_user_id")
    .eq("id", empresaId)
    .maybeSingle();
  if (error || !empresa?.owner_user_id) throw new Error("Não encontrei a dona desta conta.");
  const userId = empresa.owner_user_id as string;
  const { data } = await db.auth.admin.getUserById(userId);
  const email = data?.user?.email ?? "";
  if (!email) throw new Error("Esta conta não tem e-mail cadastrado.");
  const nome = String((data?.user?.user_metadata as Record<string, unknown> | undefined)?.name ?? "");
  return { userId, email, nome };
}

/** O HTML pronto, do jeitinho que vai chegar na caixa dela. */
export function montarEmailDoPainel(dados: EmailDoPainel, nome: string): { assunto: string; html: string } {
  const paragrafos = dados.texto
    .split(/\n+/)
    .map((p) => limpar(p, LIMITES_DO_EMAIL.paragrafo))
    .filter(Boolean)
    .slice(0, LIMITES_DO_EMAIL.paragrafos);
  if (!paragrafos.length) throw new Error("Escreva o texto do e-mail.");
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  const rotulo = limpar(dados.destaqueRotulo ?? "", LIMITES_DO_EMAIL.destaque);
  const valor = limpar(dados.destaqueValor ?? "", LIMITES_DO_EMAIL.destaque);
  return {
    assunto: limpar(dados.assunto, LIMITES_DO_EMAIL.assunto),
    html: casca({
      titulo: limpar(dados.titulo, LIMITES_DO_EMAIL.titulo),
      saudacao: primeiro ? `Oi, ${primeiro}!` : "Oi!",
      paragrafos,
      destaque: rotulo && valor ? { rotulo, valor } : null,
      botao: {
        texto: limpar(dados.botaoTexto, LIMITES_DO_EMAIL.botao),
        caminho: dados.botaoCaminho,
      },
      // sem link de saída: isto não é régua, é uma mensagem escrita à mão
      sair: null,
    }),
  };
}

/** A prévia: mesmo caminho do envio, sem Resend nenhum. */
export async function previaEmailDaContaDb(
  empresaId: string,
  dados: EmailDoPainel
): Promise<{ html: string; assunto: string; para: string }> {
  await exigirSuperAdmin();
  const dona = await donaDaConta(empresaId);
  const { html, assunto } = montarEmailDoPainel(dados, dona.nome);
  return { html, assunto, para: dona.email };
}

export async function enviarEmailDaContaDb(
  empresaId: string,
  dados: EmailDoPainel
): Promise<{ para: string; assunto: string }> {
  const quem = await exigirSuperAdmin();
  if (!destinoAceito(dados.botaoCaminho)) {
    throw new Error("Escolha para onde o botão leva.");
  }
  const dona = await donaDaConta(empresaId);
  const { html, assunto } = montarEmailDoPainel(dados, dona.nome);
  if (!assunto) throw new Error("Escreva o assunto.");

  const r = await enviarViaResend({
    to: dona.email,
    subject: assunto,
    html,
    fromNome: REMETENTE(),
    replyTo: RESPONDER_PARA(),
    tags: [{ name: "tipo", value: "painel_do_dono" }],
  });
  if (!r.ok) throw new Error(r.error ?? "O e-mail não saiu.");

  // a auditoria guarda o FATO e o assunto; o texto inteiro não, para a
  // ficha não virar caixa de entrada
  await registrarAcaoAdmin(servico(), quem, {
    acao: "email_enviado",
    empresaId,
    depois: { para: dona.email, assunto, botao: dados.botaoCaminho },
  });
  return { para: dona.email, assunto };
}
