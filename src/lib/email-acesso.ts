// Os e-mails de acesso que o dono manda pela tela Logins (02/10/2026):
// o link para criar uma senha nova e o link para confirmar o e-mail.
//
// O link é nosso (token_hash → /auth/confirm, que abre em qualquer
// aparelho), não o do "esqueci a senha" pedido pelo servidor: esse chega
// com os tokens depois do "#" da URL, que a rota não lê — o link caía na
// porta de erro. Quem fala é o eOrganizei, curto, um botão, o endereço
// por extenso embaixo.

import { enviarViaResend, type ResultadoEnvio } from "@/lib/email";
import { REMETENTE, RESPONDER_PARA } from "@/lib/email-ativacao-textos";
import { escaparHtml } from "@/lib/email-base";

function html(p: { frase: string; botao: string; link: string; rodape: string }): string {
  return `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#221E1B">
    <p style="color:#928A81;margin:0 0 20px;font-size:13px"><span style="color:#6E3F5F;font-weight:700">e</span>organizei</p>
    <p style="margin:0 0 14px;line-height:1.6">${escaparHtml(p.frase)}</p>
    <p style="margin:22px 0">
      <a href="${escaparHtml(p.link)}" style="display:inline-block;background:#6E3F5F;color:#FAF8F5;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escaparHtml(p.botao)}</a>
    </p>
    <p style="margin:0 0 14px;color:#928A81;font-size:12px;line-height:1.5;word-break:break-all">${escaparHtml(p.link)}</p>
    <p style="margin:18px 0 0;line-height:1.6;font-weight:600"><span style="color:#6E3F5F">e</span>organizei</p>
    <p style="margin:28px 0 0;color:#928A81;font-size:12px;line-height:1.5">${escaparHtml(p.rodape)}</p>
  </div>`;
}

async function mandar(para: string, assunto: string, corpo: string, tipo: string): Promise<ResultadoEnvio> {
  return enviarViaResend({
    to: para,
    subject: assunto,
    html: corpo,
    fromNome: REMETENTE(),
    replyTo: RESPONDER_PARA(),
    tags: [{ name: "tipo", value: tipo }],
  });
}

export function enviarLinkDeNovaSenha(p: { para: string; link: string }): Promise<ResultadoEnvio> {
  return mandar(
    p.para,
    "Crie uma senha nova no eOrganizei",
    html({
      frase: "Use o botão para criar uma senha nova e entrar no eOrganizei.",
      botao: "Criar senha nova",
      link: p.link,
      rodape: "Se você não pediu uma senha nova, é só ignorar: a senha de hoje continua valendo.",
    }),
    "senha_nova_pelo_painel"
  );
}

export function enviarLinkDeConfirmacao(p: { para: string; link: string }): Promise<ResultadoEnvio> {
  return mandar(
    p.para,
    "Confirme o seu e-mail no eOrganizei",
    html({
      frase: "Use o botão para confirmar este e-mail e entrar no eOrganizei.",
      botao: "Confirmar o e-mail",
      link: p.link,
      rodape: "Você recebe este e-mail porque este endereço foi usado para entrar no eOrganizei. Se não foi você, é só ignorar.",
    }),
    "confirmacao_pelo_painel"
  );
}
