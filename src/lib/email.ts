// Envio de e-mail via Resend (server-side apenas).
//
// Variáveis: RESEND_API_KEY (obrigatória), EMAIL_FROM (remetente) e
// NEXT_PUBLIC_APP_URL (base dos links). As três precisam existir no
// ambiente de PRODUÇÃO da Vercel, não só no .env.local — foi o que
// segurou o módulo inteiro até aqui.
//
// Sobre o remetente: sem um domínio próprio verificado no Resend, a conta
// fica em modo de teste e a API recusa qualquer destinatário que não seja
// o dono da conta (403). Ou seja, fornecedor, noiva e convidado não
// recebem nada — e o erro precisa dizer isso em português, para a
// cerimonialista saber que tem que mandar o link por WhatsApp enquanto
// não estiver liberado.

import { formatDate, formatTime } from "@/lib/format";

// A base dos links mora em lib/app-url.ts: o WhatsApp também precisa
// dela e não deve importar o módulo do Resend para isso.
import { appUrl, linkPublico } from "@/lib/app-url";
// Reexportado porque oito arquivos ja importavam daqui.
export { appUrl };

/**
 * Remetente configurado. O padrão é o domínio próprio, verificado no
 * Resend em 03/09/2026 (DKIM e SPF) — antes disso era o domínio de teste,
 * que a API recusava para qualquer destinatário que não fosse o dono da
 * conta. EMAIL_FROM continua vencendo quando existe.
 *
 * O endereço envia, mas ainda não recebe: o MX de entrada está pendente.
 * Resposta da cliente a este e-mail não chega a lugar nenhum enquanto
 * isso — decisão consciente, anotada aqui para não virar surpresa.
 */
export function remetente() {
  return process.env.EMAIL_FROM?.trim() || "eOrganizei <contato@eorganizei.com.br>";
}

/** true quando ainda estamos no domínio de teste (não entrega a terceiros). */
export function envioEmModoTeste() {
  return /resend\.dev/i.test(remetente());
}

function erroLegivel(status: number, corpo: string): string {
  if (status === 403 && /only send testing emails|own email address/i.test(corpo)) {
    return "O envio de e-mails ainda não foi liberado para esta conta — nada foi entregue. Envie o link por WhatsApp enquanto isso.";
  }
  if (status === 422 && /domain is not verified/i.test(corpo)) {
    return "O endereço de envio ainda não foi verificado — nada foi entregue. Envie o link por WhatsApp enquanto isso.";
  }
  if (status === 429) {
    return "Muitos e-mails enviados em pouco tempo. Tente de novo em alguns minutos.";
  }
  return `Não foi possível enviar o e-mail agora (erro ${status}).`;
}

/**
 * Único ponto de saída de e-mail do sistema. Antes cada função montava a
 * própria chamada, com o remetente repetido em cinco lugares — trocar o
 * domínio significava lembrar dos cinco.
 */
export async function enviarViaResend(dados: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "O envio de e-mails ainda não está configurado nesta conta.",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remetente(),
      to: [dados.to],
      subject: dados.subject,
      html: dados.html,
    }),
  });

  if (!res.ok) {
    const corpo = await res.text();
    // o detalhe técnico fica no log do servidor, não na tela dela
    console.error(`[vela:email] Resend ${res.status}: ${corpo.slice(0, 300)}`);
    return { ok: false, error: erroLegivel(res.status, corpo) };
  }
  return { ok: true };
}

export type EmailConfirmacao = {
  to: string;
  supplierName: string;
  eventLabel: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  hash: string;
};

export async function enviarEmailConfirmacao(
  dados: EmailConfirmacao
): Promise<{ ok: boolean; error?: string }> {
  const link = linkPublico(`/confirmacao/${dados.hash}`);
  const detalhes = [
    `<strong>Data:</strong> ${formatDate(dados.eventDate)}`,
    dados.eventTime ? `<strong>Horário:</strong> ${formatTime(dados.eventTime)}` : null,
    dados.eventLocation ? `<strong>Local:</strong> ${dados.eventLocation}` : null,
  ]
    .filter(Boolean)
    .join("<br/>");

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
    <h2 style="font-size:18px;margin:0 0 4px">Confirmação de presença</h2>
    <p style="color:#6b7280;margin:0 0 20px">eOrganizei — gestão de eventos</p>
    <p>Olá, <strong>${dados.supplierName}</strong>!</p>
    <p>Você está escalado para o evento:</p>
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-weight:600">${dados.eventLabel}</p>
      <p style="margin:0;color:#374151;line-height:1.7">${detalhes}</p>
    </div>
    <p>Por favor, confirme sua presença pelo link abaixo:</p>
    <p style="margin:20px 0">
      <a href="${link}"
         style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
        Responder confirmação
      </a>
    </p>
    <p style="color:#9ca3af;font-size:12px">Se o botão não funcionar, copie e cole este endereço no navegador:<br/>${link}</p>
  </div>`;

  return enviarViaResend({
    to: dados.to,
    subject: `Confirme sua presença — ${dados.eventLabel}`,
    html,
  });
}

// Pedido ao fornecedor (contrato assinado, horário de chegada,
// confirmação) por e-mail. Decisão de produto: o E-MAIL é o canal
// automático das solicitações — WhatsApp automático exigiria template
// aprovado pela Meta para cada variação, então o wa.me continua manual,
// pela fila de Solicitações. O link abre a MESMA página pública
// /fornecedor/<hash> onde ele responde sem login.
export type EmailSolicitacao = {
  to: string;
  supplierName: string;
  /** o pedido, do jeito que a fila o chama: "Enviar contrato assinado" */
  titulo: string;
  eventLabel: string;
  eventDate: string | null;
  hash: string;
};

export async function enviarEmailSolicitacao(
  dados: EmailSolicitacao
): Promise<{ ok: boolean; error?: string }> {
  const link = linkPublico(`/fornecedor/${dados.hash}`);
  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
    <h2 style="font-size:18px;margin:0 0 4px">${dados.titulo}</h2>
    <p style="color:#6b7280;margin:0 0 20px">eOrganizei — gestão de eventos</p>
    <p>Olá, <strong>${dados.supplierName}</strong>!</p>
    <p>A cerimonialista do evento abaixo pediu: <strong>${dados.titulo.toLowerCase()}</strong>.</p>
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:16px 0">
      <p style="margin:0 0 8px;font-weight:600">${dados.eventLabel}</p>
      ${dados.eventDate ? `<p style="margin:0;color:#374151"><strong>Data:</strong> ${formatDate(dados.eventDate)}</p>` : ""}
    </div>
    <p>Responda pelo link abaixo — não precisa de senha:</p>
    <p style="margin:20px 0">
      <a href="${link}"
         style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
        Ver o pedido e responder
      </a>
    </p>
    <p style="color:#9ca3af;font-size:12px">Se o botão não funcionar, copie e cole este endereço no navegador:<br/>${link}</p>
  </div>`;

  return enviarViaResend({
    to: dados.to,
    subject: `${dados.titulo} — ${dados.eventLabel}`,
    html,
  });
}

// Convite de agendamento por e-mail (Secretário). Abre a MESMA página
// pública /agendar/<hash> — não depende do webhook da Meta, então é o
// canal mais robusto enquanto o WhatsApp de produção não está liberado.
export type EmailConviteAgendamento = {
  to: string;
  supplierName: string;
  tarefa: string;
  eventLabel: string;
  duracaoMin: number;
  hash: string;
  prazoDias: number;
  slots: { data: string; hora: string }[];
};

export async function enviarConviteAgendamentoEmail(
  dados: EmailConviteAgendamento
): Promise<{ ok: boolean; error?: string }> {
  const link = linkPublico(`/agendar/${dados.hash}`);
  const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const previa = dados.slots
    .slice(0, 4)
    .map((s) => {
      const [, m, d] = s.data.split("-");
      const dia = DIAS[new Date(`${s.data}T00:00:00`).getDay()];
      return `${dia} ${d}/${m} · ${s.hora}`;
    })
    .join(" &nbsp;·&nbsp; ");

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
    <h2 style="font-size:18px;margin:0 0 4px">Escolha um horário</h2>
    <p style="color:#6b7280;margin:0 0 20px">eOrganizei — agendamento de reunião</p>
    <p>Olá, <strong>${dados.supplierName}</strong>!</p>
    <p>Para <strong>${dados.tarefa}</strong> (${dados.eventLabel}), escolha um horário com a cerimonialista — reunião de ${dados.duracaoMin} minutos.</p>
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin:16px 0;color:#374151">
      ${previa}${dados.slots.length > 4 ? " &nbsp;e mais…" : ""}
    </div>
    <p style="margin:22px 0">
      <a href="${link}"
         style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
        Escolher horário
      </a>
    </p>
    <p style="color:#9ca3af;font-size:12px">Válido por ${dados.prazoDias} dias. Se o botão não funcionar, copie e cole:<br/>${link}</p>
  </div>`;

  return enviarViaResend({
    to: dados.to,
    subject: `Escolha um horário — ${dados.tarefa}`,
    html,
  });
}

export type EmailOrcamento = {
  to: string;
  contatoNome: string;
  nomeEmpresa: string;
  hash: string;
};

// Aviso ao cliente de que há um orçamento para ele responder (Etapa 5).
export async function enviarEmailOrcamento(
  dados: EmailOrcamento
): Promise<{ ok: boolean; error?: string }> {
  const link = `${appUrl()}/orcamento/${dados.hash}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#17162A">
      <p style="font-size:15px">Olá, ${dados.contatoNome}!</p>
      <p style="font-size:15px;line-height:1.6">
        Você recebeu um orçamento de <strong>${dados.nomeEmpresa}</strong>.
        Acesse o link abaixo para ver a proposta completa e responder.
      </p>
      <p style="margin:28px 0">
        <a href="${link}"
           style="background:#17162A;color:#fff;padding:12px 22px;border-radius:9px;text-decoration:none;font-weight:600;display:inline-block">
          Ver orçamento
        </a>
      </p>
      <p style="font-size:12px;color:#6B6884">
        Se o botão não funcionar, copie e cole este endereço:<br />${link}
      </p>
    </div>
  `;

  return enviarViaResend({
    to: dados.to,
    subject: `Seu orçamento — ${dados.nomeEmpresa}`,
    html,
  });
}
