// O e-mail que confirma a conta da festa (187, desde 01/10/2026).
//
// Até aqui a conta da família nascia confirmada, e um e-mail digitado
// errado virava uma conta que ninguém recupera (o "esqueci a senha" vai
// para um endereço que não existe) — com o evento dentro. Agora a conta
// só abre quando alguém clica no link que chegou NAQUELE endereço.
//
// Quem fala é o eOrganizei (a voz dos e-mails do suporte e do teste):
// curto, um botão, o endereço por extenso embaixo. Nada do que foi
// digitado no formulário entra no e-mail (nem o nome): o endereço pode ser
// de outra pessoa, e o formulário não pode virar canal de texto de
// terceiros.

import { enviarViaResend, type ResultadoEnvio } from "@/lib/email";
import { REMETENTE, RESPONDER_PARA } from "@/lib/email-ativacao-textos";
import { escaparHtml } from "@/lib/email-base";

export function htmlConfirmacaoDaConta(link: string): { assunto: string; html: string } {
  return {
    assunto: "Confirme o seu e-mail no eOrganizei",
    html: `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#221E1B">
    <p style="color:#928A81;margin:0 0 20px;font-size:13px"><span style="color:#6E3F5F;font-weight:700">e</span>organizei</p>
    <p style="margin:0 0 14px;line-height:1.6">Falta um passo para abrir a conta da sua festa: confirmar este e-mail.</p>
    <p style="margin:22px 0">
      <a href="${escaparHtml(link)}" style="display:inline-block;background:#6E3F5F;color:#FAF8F5;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Confirmar o e-mail</a>
    </p>
    <p style="margin:0 0 14px;color:#928A81;font-size:12px;line-height:1.5;word-break:break-all">${escaparHtml(link)}</p>
    <p style="margin:18px 0 0;line-height:1.6;font-weight:600"><span style="color:#6E3F5F">e</span>organizei</p>
    <p style="margin:28px 0 0;color:#928A81;font-size:12px;line-height:1.5">Você recebe este e-mail porque este endereço foi usado para criar a conta de uma festa no eOrganizei. Se não foi você, é só ignorar: sem a confirmação, a conta não abre.</p>
  </div>`,
  };
}

export async function enviarConfirmacaoDaConta(p: { para: string; link: string }): Promise<ResultadoEnvio> {
  const { assunto, html } = htmlConfirmacaoDaConta(p.link);
  return enviarViaResend({
    to: p.para,
    subject: assunto,
    html,
    fromNome: REMETENTE(),
    replyTo: RESPONDER_PARA(),
    tags: [{ name: "tipo", value: "confirmacao_conta_familia" }],
  });
}
