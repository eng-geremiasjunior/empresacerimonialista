// Envio pela WhatsApp Business Cloud API (Meta).
// SERVER-SIDE APENAS — o access token nunca pode chegar ao navegador.
//
// Tudo aqui é CONDICIONAL às variáveis de ambiente: sem elas, as funções
// devolvem { ok:false, configurado:false } e quem chama segue a vida.
// O RECEBIMENTO do webhook não depende disto para funcionar.

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
export function paraFormatoMeta(telefone: string): string | null {
  const d = (telefone || "").replace(/\D/g, "");
  if (d.length < 10) return null; // sem DDD não dá para enviar
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
