// Os dois e-mails do pedido de orçamento — SERVIDOR APENAS.
//
// Um para a cerimonialista ("chegou um pedido") e um para quem pediu
// ("recebemos"). São curtos de propósito: não é régua de automação, é
// aviso. Quem conversa com a cliente é ela, no canal dela.
//
// DUAS REGRAS QUE MANDAM AQUI:
//
//  1. O assunto nunca leva dado pessoal. Assunto aparece na notificação
//     do celular, na tela de bloqueio, no preview de quem passa do lado.
//     "Novo pedido de orçamento pela sua vitrine" diz o que ela precisa;
//     o nome está dentro.
//  2. A confirmação NÃO devolve nada do que a pessoa escreveu — nem o
//     nome. O formulário é aberto ao mundo e o e-mail de destino é
//     digitado por quem envia: se a confirmação repetisse o nome, qualquer
//     um poderia fazer o nosso domínio entregar um texto seu na caixa de
//     um terceiro. E se a pessoa errou o e-mail por uma letra, o estranho
//     que recebe não fica sabendo de nada dela. Vai só o fato de que o
//     pedido chegou, e para quem.

import { appUrl, enviarViaResend } from "@/lib/email";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataBR(iso: string | null): string {
  if (!iso) return "data a definir";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export type PedidoParaEmail = {
  nome: string;
  whatsapp: string;
  email: string | null;
  tipoEvento: EventType;
  dataEvento: string | null;
  cidade: string | null;
  convidados: number | null;
  mensagem: string | null;
  /** Reenvio do mesmo contato para o mesmo evento. */
  repetido: boolean;
};

/**
 * Para a cerimonialista. Leva tudo o que ela precisa para responder sem
 * abrir o sistema — inclusive o botão que já abre a conversa no WhatsApp,
 * porque é de lá que ela vai responder mesmo.
 *
 * `replyTo` é o e-mail de quem pediu, quando houver: responder o aviso
 * cai na caixa da pessoa certa, não na nossa.
 */
export async function enviarEmailPedidoParaCerimonialista(dados: {
  to: string;
  nomeEmpresa: string;
  pedido: PedidoParaEmail;
}): Promise<{ ok: boolean; error?: string }> {
  const p = dados.pedido;
  const digitos = p.whatsapp.replace(/\D/g, "");
  const wa = `https://wa.me/55${digitos}`;
  const linhas: string[] = [
    `<strong>${escapar(p.nome)}</strong>`,
    `${EVENT_TYPE_LABELS[p.tipoEvento] ?? p.tipoEvento} · ${dataBR(p.dataEvento)}`,
  ];
  if (p.cidade) linhas.push(escapar(p.cidade));
  if (p.convidados) linhas.push(`${p.convidados.toLocaleString("pt-BR")} convidados`);
  if (p.email) linhas.push(escapar(p.email));

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#17162A">
      <p style="font-size:15px;line-height:1.6">
        ${p.repetido
          ? "Um contato que já havia pedido orçamento mandou o formulário de novo:"
          : "Alguém pediu um orçamento pela sua vitrine profissional:"}
      </p>
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin:16px 0;font-size:15px;line-height:1.7">
        ${linhas.join("<br />")}
      </div>
      ${p.mensagem
        ? `<p style="font-size:14px;line-height:1.6;color:#4b5563">“${escapar(p.mensagem)}”</p>`
        : ""}
      <p style="margin:24px 0">
        <a href="${wa}"
           style="background:#17162A;color:#fff;padding:12px 22px;border-radius:9px;text-decoration:none;font-weight:600;display:inline-block">
          Responder no WhatsApp
        </a>
      </p>
      <p style="font-size:13px;color:#6B6884">
        O pedido também está no eOrganizei, em Gestão comercial:<br />
        ${appUrl()}/orcamentos/pedidos
      </p>
    </div>
  `;

  return enviarViaResend({
    to: dados.to,
    subject: "Novo pedido de orçamento pela sua vitrine",
    html,
    fromNome: dados.nomeEmpresa,
    replyTo: p.email,
    tags: [{ name: "finalidade", value: "pedido_recebido" }],
  });
}

/**
 * Para quem pediu. Sai em nome dela, e a resposta cai na caixa dela.
 *
 * Não promete prazo ("respondemos em 24h" é promessa que o sistema não
 * pode cumprir por ela) e não diz que alguém já viu. Diz o que é
 * verdade: chegou, e ela entra em contato.
 */
export async function enviarEmailConfirmacaoPedido(dados: {
  to: string;
  nomeEmpresa: string;
  /** E-mail da cerimonialista, para onde vai a resposta. */
  replyTo?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const empresa = escapar(dados.nomeEmpresa);
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#17162A">
      <p style="font-size:15px">Olá!</p>
      <p style="font-size:15px;line-height:1.6">
        Recebemos o seu pedido de orçamento. <strong>${empresa}</strong> vai
        analisar as informações do seu evento e entra em contato com você
        pelo WhatsApp ou por e-mail.
      </p>
      <p style="font-size:15px;line-height:1.6">
        Se quiser adiantar alguma coisa, é só responder este e-mail.
      </p>
      <p style="font-size:13px;color:#6B6884;margin-top:28px">
        Você recebeu esta mensagem porque pediu um orçamento na página de
        ${empresa}.
      </p>
    </div>
  `;

  return enviarViaResend({
    to: dados.to,
    subject: `Recebemos seu pedido — ${dados.nomeEmpresa}`,
    html,
    fromNome: dados.nomeEmpresa,
    replyTo: dados.replyTo ?? null,
    tags: [{ name: "finalidade", value: "pedido_confirmacao" }],
  });
}
