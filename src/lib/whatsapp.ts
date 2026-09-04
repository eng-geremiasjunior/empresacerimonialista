// Envio pela WhatsApp Business Cloud API (Meta).
// SERVER-SIDE APENAS — o access token nunca pode chegar ao navegador.
//
// Tudo aqui é CONDICIONAL às variáveis de ambiente: sem elas, as funções
// devolvem { ok:false, configurado:false } e quem chama segue a vida.
// O RECEBIMENTO do webhook não depende disto para funcionar.

import { linkPublico } from "@/lib/app-url";

const API_VERSION = "v21.0";

export type EnvioWhatsapp =
  | { ok: true }
  | { ok: false; configurado: boolean; error: string };

type Credenciais = { token: string; phoneNumberId: string };

// Aceita os nomes mais comuns para não depender de um único rótulo na Vercel.
function credenciais(): Credenciais | null {
  const token =
    process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || "";
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_ID ||
    "";
  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId };
}

export function whatsappConfigurado(): boolean {
  return credenciais() !== null;
}

// Telefone para a API da Meta: só dígitos, com DDI 55 quando ausente.
//
// A armadilha: 55 também é DDD (Santa Maria/RS). "(55) 99999-0000" tem 11
// dígitos e começa com 55 — mas é DDD+número, não DDI+resto. Quem decide é
// o TAMANHO: número brasileiro local tem 10-11 dígitos e sempre ganha o
// DDI; só 12-13 dígitos começando com 55 já vêm com ele.
export function paraFormatoMeta(telefone: string): string | null {
  const d = (telefone || "").replace(/\D/g, "");
  if (d.length < 10) return null; // sem DDD não dá para enviar
  if (d.length <= 11) return `55${d}`; // DDD + número, mesmo começando com 55
  return d.startsWith("55") ? d : `55${d}`;
}

async function enviar(body: Record<string, unknown>): Promise<EnvioWhatsapp> {
  const cred = credenciais();
  if (!cred) {
    return {
      ok: false,
      configurado: false,
      error:
        "WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID não configurados",
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${cred.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cred.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, configurado: true, error: `${res.status} ${txt.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      configurado: true,
      error: e instanceof Error ? e.message : "falha de rede",
    };
  }
}

// Mensagem de texto simples (usada nas respostas automáticas do webhook).
export async function enviarMensagemWhatsapp(
  telefone: string,
  texto: string
): Promise<EnvioWhatsapp> {
  const to = paraFormatoMeta(telefone);
  if (!to) {
    return { ok: false, configurado: whatsappConfigurado(), error: "telefone inválido" };
  }
  return enviar({ to, type: "text", text: { preview_url: false, body: texto } });
}

// Confirmação de presença com BOTÕES. O id do botão carrega o MESMO hash
// de supplier_confirmations usado no link por e-mail — um só sistema de
// hash, respondendo por qualquer canal.
export async function enviarConfirmacaoWhatsapp(params: {
  telefone: string;
  supplierName: string;
  eventLabel: string;
  eventDate: string; // yyyy-MM-dd
  eventTime: string | null;
  eventLocation: string | null;
  hash: string;
}): Promise<EnvioWhatsapp> {
  const to = paraFormatoMeta(params.telefone);
  if (!to) {
    return { ok: false, configurado: whatsappConfigurado(), error: "telefone inválido" };
  }

  const [ano, mes, dia] = params.eventDate.split("-");
  const data = `${dia}/${mes}/${ano}`;
  const hora = params.eventTime ? ` às ${params.eventTime.slice(0, 5)}` : "";
  const local = params.eventLocation ? `\nLocal: ${params.eventLocation}` : "";

  return enviar({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          `Olá, ${params.supplierName}! Confirma presença em ${params.eventLabel}, ` +
          `dia ${data}${hora}?${local}`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: `confirmar_hash_${params.hash}`, title: "Confirmar" },
          },
          {
            type: "reply",
            reply: { id: `recusar_hash_${params.hash}`, title: "Não poderei" },
          },
        ],
      },
    },
  });
}

// Convite de AGENDAMENTO (Secretário Executivo): lista interativa com os
// horários livres da cerimonialista. O id de cada linha carrega
// agsl_<hash>_<slotId> — resposta estruturada, nunca texto livre. O link
// público vai no corpo para quem preferir escolher pelo navegador.
export async function enviarConviteAgendamentoWhatsapp(params: {
  telefone: string;
  supplierName: string;
  tarefa: string;
  eventLabel: string;
  duracaoMin: number;
  hash: string;
  prazoDias: number;
  slots: { id: string; data: string; hora: string }[];
}): Promise<EnvioWhatsapp> {
  const to = paraFormatoMeta(params.telefone);
  if (!to) {
    return { ok: false, configurado: whatsappConfigurado(), error: "telefone inválido" };
  }

  const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const rows = params.slots.slice(0, 10).map((s) => {
    const [a, m, d] = s.data.split("-");
    const dia = DIAS[new Date(`${s.data}T00:00:00`).getDay()];
    void a;
    return {
      id: `agsl_${params.hash}_${s.id}`,
      // título de linha tem limite de 24 caracteres na API da Meta
      title: `${dia} ${d}/${m} · ${s.hora}`,
      description: `${params.duracaoMin} min`,
    };
  });

  const link = linkPublico(`/agendar/${params.hash}`);

  return enviar({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text:
          `Olá, ${params.supplierName}! Para "${params.tarefa}" (${params.eventLabel}), ` +
          `escolha um horário com a cerimonialista (${params.duracaoMin} min).\n` +
          `Se preferir, escolha pelo link: ${link}\n` +
          `Válido por ${params.prazoDias} dias.`,
      },
      action: {
        button: "Escolher horário",
        sections: [{ title: "Horários livres", rows }],
      },
    },
  });
}

// Confirmação de um COMPROMISSO da Agenda (reunião, degustação, prova…).
// Button ids próprios (compromisso_confirmar_/compromisso_recusar_) para o
// webhook rotear ao compromisso, não ao vínculo de roteiro. O hash do
// compromisso vai no id — nunca interpretamos texto livre.
export async function enviarConfirmacaoCompromissoWhatsapp(params: {
  telefone: string;
  supplierName: string;
  titulo: string;
  eventLabel: string;
  data: string; // yyyy-MM-dd
  hora: string | null;
  local: string | null;
  hash: string;
}): Promise<EnvioWhatsapp> {
  const to = paraFormatoMeta(params.telefone);
  if (!to) {
    return { ok: false, configurado: whatsappConfigurado(), error: "telefone inválido" };
  }

  const [ano, mes, dia] = params.data.split("-");
  const dataBR = `${dia}/${mes}/${ano}`;
  const hora = params.hora ? ` às ${params.hora.slice(0, 5)}` : "";
  const local = params.local ? `\nLocal: ${params.local}` : "";

  return enviar({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          `Olá, ${params.supplierName}! Confirma presença em "${params.titulo}" ` +
          `(${params.eventLabel}), dia ${dataBR}${hora}?${local}`,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: `compromisso_confirmar_${params.hash}`,
              title: "Confirmar",
            },
          },
          {
            type: "reply",
            reply: {
              id: `compromisso_recusar_${params.hash}`,
              title: "Não poderei",
            },
          },
        ],
      },
    },
  });
}

// ------------------------------------------------------------------
// TEMPLATE (mensagem iniciada pelo negócio)
// ------------------------------------------------------------------
// Tudo acima nesta lib fala com FORNECEDOR, e sempre depois que ele
// escreveu primeiro — a janela de atendimento de 24h está aberta e a
// Meta aceita texto livre.
//
// Falar com a CERIMONIALISTA é o caso inverso: ela não escreveu nada, o
// eorganizei é que inicia. Fora da janela de 24h a Cloud API só entrega
// TEMPLATE aprovado, com as variáveis preenchidas na hora. Por isso esta
// função existe separada — e por isso o texto do lembrete não pode ser
// montado livremente: só as variáveis mudam.
//
// O template precisa estar aprovado no WhatsApp Manager, na categoria
// UTILITY (lembrete de tarefa de um sistema que ela assina é utilidade;
// classificado como marketing custa mais e a aprovação é mais dura).

export const TEMPLATE_IDIOMA_PADRAO = "pt_BR";

/**
 * Nome do template aprovado, ou null quando não há.
 *
 * Deliberadamente SEM padrão: o token da Meta já existe no ambiente muito
 * antes de o template ser aprovado, e um nome chutado faria a rotina bater
 * na API e tomar erro 132001 (template não encontrado) todo dia, para
 * sempre, sem ninguém ver. Ausente significa canal desligado.
 */
export function nomeTemplateLembrete(): string | null {
  return process.env.WHATSAPP_TEMPLATE_LEMBRETE?.trim() || null;
}

export function idiomaTemplate(): string {
  return process.env.WHATSAPP_TEMPLATE_IDIOMA?.trim() || TEMPLATE_IDIOMA_PADRAO;
}

/**
 * Envia um template aprovado. As variáveis entram na ordem {{1}}..{{n}}
 * do corpo.
 *
 * A Meta recusa parâmetro com quebra de linha, tabulação ou espaços em
 * sequência; quem monta o texto (avisos-core) já sanitiza, e aqui vai uma
 * segunda passada porque este é o último ponto antes da rede.
 */
export async function enviarTemplateWhatsapp(params: {
  telefone: string;
  template: string;
  idioma: string;
  variaveis: string[];
}): Promise<EnvioWhatsapp> {
  const to = paraFormatoMeta(params.telefone);
  if (!to) {
    return { ok: false, configurado: whatsappConfigurado(), error: "telefone inválido" };
  }

  const parameters = params.variaveis.map((v) => ({
    type: "text",
    text: String(v ?? "").replace(/\s+/g, " ").trim() || "-",
  }));

  return enviar({
    to,
    type: "template",
    template: {
      name: params.template,
      language: { code: params.idioma },
      components: parameters.length > 0 ? [{ type: "body", parameters }] : [],
    },
  });
}
