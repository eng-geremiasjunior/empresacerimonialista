// O aviso por e-mail da resposta do suporte (16/09/2026).
//
// A resposta do dono só aparecia na caixinha do sistema: quem não
// entrava de novo nunca sabia que tinha sido respondida. Agora ela sai
// também por e-mail, com o texto inteiro — a pessoa lê na hora, sem
// precisar entrar — e um botão que abre o sistema com a caixinha aberta.
//
// Quem fala é o eOrganizei (a mesma voz dos e-mails do teste grátis), não
// a cerimonialista: o suporte é a relação entre ela e nós.

import { appUrl, enviarViaResend, type ResultadoEnvio } from "@/lib/email";
import { REMETENTE, RESPONDER_PARA } from "@/lib/email-ativacao-textos";
import { escaparHtml } from "@/lib/email-base";

function primeiroNome(nome: string | null | undefined): string {
  const p = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

/** O endereço que abre o sistema com a caixinha do suporte aberta. */
export function linkDaCaixinha(): string {
  return `${appUrl()}/eventos/dashboard?suporte=abrir`;
}

export function htmlRespostaSuporte(nome: string | null, texto: string): { assunto: string; html: string } {
  const n = primeiroNome(nome);
  const responde = RESPONDER_PARA();
  const par = (t: string) => `<p style="margin:0 0 14px;line-height:1.6">${t}</p>`;
  // o texto é de gente: escapado, e as quebras de linha viram <br>
  const resposta = escaparHtml(texto.trim()).replace(/\r?\n/g, "<br>");
  const continuar = responde
    ? "Para continuar a conversa, responda este e-mail ou use o Suporte, no canto do sistema."
    : "Para continuar a conversa, use o Suporte, no canto do sistema.";

  return {
    // sem nome e sem trecho da resposta no assunto: assunto aparece em
    // notificação de celular, em tela bloqueada
    assunto: "Respondemos a sua mensagem no eOrganizei",
    html: `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#221E1B">
    <p style="color:#928A81;margin:0 0 20px;font-size:13px"><span style="color:#6E3F5F;font-weight:700">e</span>organizei</p>
    ${par(`Oi${n ? `, ${escaparHtml(n)}` : ""}! Respondemos a sua mensagem no Suporte:`)}
    <div style="margin:0 0 18px;padding:14px 16px;border-left:3px solid #6E3F5F;background:#F6F3F1;border-radius:6px;line-height:1.6">${resposta}</div>
    <p style="margin:22px 0">
      <a href="${escaparHtml(linkDaCaixinha())}" style="display:inline-block;background:#6E3F5F;color:#FAF8F5;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Abrir o eOrganizei</a>
    </p>
    ${par(continuar)}
    <p style="margin:18px 0 0;line-height:1.6;font-weight:600"><span style="color:#6E3F5F">e</span>organizei</p>
    <p style="margin:28px 0 0;color:#928A81;font-size:12px;line-height:1.5">Você recebe este e-mail porque escreveu para o Suporte do eOrganizei.</p>
  </div>`,
  };
}

export async function enviarEmailRespostaSuporte(p: {
  para: string;
  nome: string | null;
  texto: string;
}): Promise<ResultadoEnvio> {
  const { assunto, html } = htmlRespostaSuporte(p.nome, p.texto);
  return enviarViaResend({
    to: p.para,
    subject: assunto,
    html,
    replyTo: RESPONDER_PARA(),
    tags: [{ name: "tipo", value: "resposta_suporte" }],
  });
}
