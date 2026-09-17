// Envio de e-mail via Resend (server-side apenas).
//
// Variáveis: RESEND_API_KEY (obrigatória), EMAIL_FROM (remetente, opcional)
// e NEXT_PUBLIC_APP_URL (base dos links). Precisam existir no ambiente de
// PRODUÇÃO da Vercel, não só no .env.local — foi o que segurou o módulo
// inteiro até aqui.
//
// Sobre o remetente: o domínio eorganizei.com.br foi verificado no Resend
// em 03/09/2026 (DKIM e SPF), e o padrão abaixo já aponta para ele. Antes
// disso a conta ficava em modo de teste e a API recusava (403) qualquer
// destinatário que não fosse o dono — fornecedor, cliente e convidado não
// recebiam nada. Em produção, um EMAIL_FROM esquecido em resend.dev é
// recusado AQUI, antes da API, com mensagem em português: melhor a
// cerimonialista saber na hora que mandar o link por WhatsApp.
//
// Sobre a resposta: contato@eorganizei.com.br envia, mas não recebe (o MX
// de entrada nunca foi apontado). Por isso cada envio diz para onde vai a
// resposta (`replyTo`): o e-mail da cerimonialista quando a mensagem sai em
// nome dela, o da cliente quando avisa a cerimonialista. EMAIL_REPLY_TO
// continua valendo como padrão global para quem não informa nada.

import { formatDate, formatTime } from "@/lib/format";
import { registrarEnvioDeEmail } from "@/lib/registro-do-sistema";

// A base dos links mora em lib/app-url.ts: o WhatsApp também precisa
// dela e não deve importar o módulo do Resend para isso.
import { appUrl, linkPublico } from "@/lib/app-url";
// Reexportado porque oito arquivos ja importavam daqui.
export { appUrl };

const REMETENTE_PADRAO = "eorganizei <contato@eorganizei.com.br>";

/** O endereço dentro de "Nome <endereco>"; sem os sinais, é o texto inteiro. */
function enderecoDe(remetenteCompleto: string): string {
  const m = /<([^>]+)>/.exec(remetenteCompleto);
  return (m ? m[1] : remetenteCompleto).trim();
}

/**
 * Remetente. Sem nome, é o configurado (EMAIL_FROM) ou o padrão do domínio
 * próprio. Com nome, vira "<Nome> via eOrganizei <contato@eorganizei.com.br>":
 * a cliente vê a marca da cerimonialista na caixa de entrada, mas o
 * ENDEREÇO nunca muda — é o domínio verificado que garante a entrega.
 *
 * Aspas, sinais de menor/maior e quebras de linha saem do nome porque
 * quebram o cabeçalho; vírgula e afins exigem o nome entre aspas.
 */
export function remetente(fromNome?: string | null): string {
  const base = process.env.EMAIL_FROM?.trim() || REMETENTE_PADRAO;
  const nome = fromNome
    ?.replace(/["<>\\\r\n]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  if (!nome) return base;
  const exibicao = `${nome} via eOrganizei`;
  const cabecalho = /[,;:@()[\]]/.test(exibicao) ? `"${exibicao}"` : exibicao;
  return `${cabecalho} <${enderecoDe(base)}>`;
}

/** true quando ainda estamos no domínio de teste (não entrega a terceiros). */
export function envioEmModoTeste() {
  return /resend\.dev/i.test(remetente());
}

/**
 * Padrão global de resposta (EMAIL_REPLY_TO), usado só quando o envio não
 * informa o próprio `replyTo`. SEM PADRÃO, de propósito: um endereço
 * chutado aqui manda a resposta para um buraco com a nossa assinatura em
 * cima. Ausente = a resposta cai onde o cabeçalho From aponta.
 */
export function respostaPara(): string | null {
  return process.env.EMAIL_REPLY_TO?.trim() || null;
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

export type EnvioEmail = {
  to: string;
  subject: string;
  html: string;
  /** para onde vai a resposta; vazio ou ausente cai no padrão global */
  replyTo?: string | null;
  /** nome que aparece antes de "via eOrganizei"; o endereço não muda */
  fromNome?: string | null;
  /** `content` em base64 — o PDF do termo, o contrato dela */
  attachments?: { filename: string; content: string }[];
  /** só letras ASCII, números, "_" e "-" em nome e valor — regra do Resend */
  tags?: { name: string; value: string }[];
  /**
   * O que é este e-mail, para o registro do painel do dono ("orcamento",
   * "confirmacao_fornecedor"). Sem ele, vale a tag "finalidade" ou "tipo".
   */
  tipo?: string;
};

export type ResultadoEnvio =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

/**
 * Único ponto de saída de e-mail do sistema. Antes cada função montava a
 * própria chamada, com o remetente repetido em cinco lugares — trocar o
 * domínio significava lembrar dos cinco.
 *
 * Devolve o id que o Resend dá à mensagem: é por ele que um recibo de
 * entrega (webhook) volta a casar com o envio.
 */
export async function enviarViaResend(dados: EnvioEmail): Promise<ResultadoEnvio> {
  // O registro do painel do dono (tela Sistema): só o tipo e o resultado.
  const tipo =
    dados.tipo ??
    dados.tags?.find((t) => t.name === "finalidade" || t.name === "tipo")?.value ??
    "outro";

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await registrarEnvioDeEmail({ tipo, ok: false, provedorId: null, erro: "sem_chave" });
    return {
      ok: false,
      error: "O envio de e-mails ainda não está configurado nesta conta.",
    };
  }

  // Em produção o domínio de teste não entrega a ninguém além do dono da
  // conta; recusar antes da API poupa a chamada e diz o motivo certo.
  if (process.env.VERCEL_ENV === "production" && envioEmModoTeste()) {
    console.error("[eorganizei:email] EMAIL_FROM aponta para resend.dev em produção — envio recusado");
    await registrarEnvioDeEmail({ tipo, ok: false, provedorId: null, erro: "remetente_de_teste" });
    return {
      ok: false,
      error: "O remetente de e-mail ainda está no domínio de teste — nada foi entregue. Envie o link por WhatsApp enquanto isso.",
    };
  }

  const replyTo = dados.replyTo?.trim() || respostaPara();

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente(dados.fromNome),
        to: [dados.to],
        subject: dados.subject,
        html: dados.html,
        // as chaves só entram quando existem: mandar reply_to nulo é erro 422
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(dados.attachments?.length ? { attachments: dados.attachments } : {}),
        ...(dados.tags?.length ? { tags: dados.tags } : {}),
      }),
    });
  } catch (e) {
    // a rede caiu antes da resposta: registra e devolve o erro como antes
    await registrarEnvioDeEmail({ tipo, ok: false, provedorId: null, erro: "sem_resposta" });
    throw e;
  }

  if (!res.ok) {
    const corpo = await res.text();
    // o detalhe técnico fica no log do servidor, não na tela dela
    console.error(`[eorganizei:email] Resend ${res.status}: ${corpo.slice(0, 300)}`);
    await registrarEnvioDeEmail({ tipo, ok: false, provedorId: null, erro: `http_${res.status}` });
    return { ok: false, error: erroLegivel(res.status, corpo) };
  }

  let id: string | null = null;
  try {
    const corpo = (await res.json()) as { id?: unknown } | null;
    if (typeof corpo?.id === "string") id = corpo.id;
  } catch {
    // o envio saiu; só o id se perdeu — não é motivo para dizer que falhou
  }
  await registrarEnvioDeEmail({ tipo, ok: true, provedorId: id, erro: null });
  return { ok: true, id };
}

/**
 * O que o Resend sabe de um envio, em palavras do painel.
 *
 * "entregue" é o provedor da pessoa ter aceitado a mensagem — não é
 * leitura. Abertura e clique (quando o rastreio está ligado) também caem
 * em "entregue": o pixel de abertura mente (o Mail da Apple abre tudo
 * sozinho), e o painel não afirma o que não sabe.
 */
export type SituacaoDoEmail = "entregue" | "enviado" | "atrasado" | "nao_chegou" | "spam";

export function situacaoPeloEvento(evento: unknown): SituacaoDoEmail | null {
  switch (evento) {
    case "delivered":
    case "opened":
    case "clicked":
      return "entregue";
    case "sent":
    case "queued":
    case "scheduled":
      return "enviado";
    case "delivery_delayed":
      return "atrasado";
    case "bounced":
    case "failed":
    case "canceled":
      return "nao_chegou";
    case "complained":
      return "spam";
    default:
      return null;
  }
}

/** Situação final: não muda mais, não precisa perguntar de novo. */
export function situacaoFinal(s: SituacaoDoEmail | null): boolean {
  return s === "entregue" || s === "nao_chegou" || s === "spam";
}

// A chave de envio (RESEND_API_KEY) costuma ser "só envio": o Resend
// recusa a leitura com 401. Ler a situação pede uma chave com acesso de
// leitura (RESEND_API_KEY_LEITURA). Recusada uma vez, o processo para de
// perguntar — cada conversa aberta seria mais uma chamada perdida.
let leituraRecusada = false;

/**
 * Pergunta ao Resend a situação de um envio. Nulo quando não deu para
 * saber (sem chave de leitura, fora do ar, limite de chamadas): o painel
 * mostra o que já tinha, sem inventar.
 */
export async function situacaoDoEmail(id: string): Promise<SituacaoDoEmail | null> {
  const apiKey = process.env.RESEND_API_KEY_LEITURA?.trim() || process.env.RESEND_API_KEY;
  if (!apiKey || !id || leituraRecusada) return null;
  try {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 401 || res.status === 403) {
      leituraRecusada = true;
      console.warn("[eorganizei:email] a chave do Resend não lê envios: situação do e-mail indisponível");
      return null;
    }
    if (!res.ok) return null;
    const corpo = (await res.json()) as { last_event?: unknown } | null;
    return situacaoPeloEvento(corpo?.last_event);
  } catch {
    return null;
  }
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
    <p style="color:#6b7280;margin:0 0 20px">e<span style="color:#6E3F5F">organizei</span> — gestão de eventos</p>
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
    tipo: "confirmacao_fornecedor",
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
    <p style="color:#6b7280;margin:0 0 20px">e<span style="color:#6E3F5F">organizei</span> — gestão de eventos</p>
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
    tipo: "solicitacao_fornecedor",
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
    <p style="color:#6b7280;margin:0 0 20px">e<span style="color:#6E3F5F">organizei</span> — agendamento de reunião</p>
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
    tipo: "convite_agendamento",
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
  /** e-mail da cerimonialista: é para lá que a resposta da cliente vai */
  replyTo?: string | null;
};

// Aviso ao cliente de que há um orçamento para ele responder (Etapa 5).
// Sai em nome da empresa dela ("<Empresa> via eOrganizei") e a resposta
// cai na caixa dela, não na nossa.
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
    tipo: "proposta",
    to: dados.to,
    subject: `Seu orçamento — ${dados.nomeEmpresa}`,
    html,
    fromNome: dados.nomeEmpresa,
    replyTo: dados.replyTo ?? null,
    tags: [{ name: "finalidade", value: "orcamento_enviado" }],
  });
}
