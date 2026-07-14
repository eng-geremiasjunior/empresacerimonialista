// Envio de e-mail via Resend (server-side apenas).
// Pré-requisitos no .env.local: RESEND_API_KEY (obrigatório),
// EMAIL_FROM (opcional; sem domínio verificado use onboarding@resend.dev,
// que só entrega para o e-mail da própria conta Resend) e
// NEXT_PUBLIC_APP_URL (base dos links; default http://localhost:3000).

import { formatDate, formatTime } from "@/lib/format";

export type EmailConfirmacao = {
  to: string;
  supplierName: string;
  eventLabel: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  hash: string;
};

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function enviarEmailConfirmacao(
  dados: EmailConfirmacao
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY não configurada no .env.local" };
  }

  const link = `${appUrl()}/confirmacao/${dados.hash}`;
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
    <p style="color:#6b7280;margin:0 0 20px">Vela — gestão de eventos</p>
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Vela <onboarding@resend.dev>",
      to: [dados.to],
      subject: `Confirme sua presença — ${dados.eventLabel}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
  }
  return { ok: true };
}
