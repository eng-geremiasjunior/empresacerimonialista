import "server-only";

// O Pagar.me, só o pedaço que a assinatura usa.
//
// Regras que valem para tudo aqui dentro:
//
// - A chave secreta NUNCA sai do servidor. O cartão também nunca chega
//   nele: o navegador troca o cartão por um token direto com o gateway
//   (chave PÚBLICA, endpoint /tokens), e só o token vem para cá.
// - Toda resposta é conferida antes de virar dado nosso. Webhook é
//   aviso, não verdade: quando um chega, a gente RELÊ a assinatura no
//   gateway e grava o que ELE disser.
// - Erro do gateway vira mensagem em português para a tela, e o texto
//   cru vai para o log — a cerimonialista não tem o que fazer com
//   "unprocessable_entity".

const BASE = "https://api.pagar.me/core/v5";

function chave(): string {
  const k = process.env.PAGARME_SECRET_KEY;
  if (!k) throw new Error("PAGARME_SECRET_KEY ausente");
  return k;
}

/** Basic com a chave secreta no usuário e senha vazia (padrão da v5). */
function autorizacao(): string {
  return "Basic " + Buffer.from(`${chave()}:`).toString("base64");
}

async function chamar<T>(
  caminho: string,
  init?: RequestInit
): Promise<{ ok: true; dados: T } | { ok: false; erro: string; cru?: unknown }> {
  try {
    const r = await fetch(`${BASE}${caminho}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: autorizacao(),
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const corpo = (await r.json().catch(() => null)) as unknown;
    if (!r.ok) {
      console.error("[vela:pagarme]", caminho, r.status, JSON.stringify(corpo)?.slice(0, 500));
      return { ok: false, erro: mensagemDoErro(r.status, corpo), cru: corpo };
    }
    return { ok: true, dados: corpo as T };
  } catch (e) {
    console.error("[vela:pagarme] rede:", caminho, e);
    return { ok: false, erro: "Não conseguimos falar com a operadora agora. Tente de novo." };
  }
}

function mensagemDoErro(status: number, corpo: unknown): string {
  const c = corpo as { message?: string; errors?: Record<string, string[]> } | null;
  const primeiro = c?.errors ? Object.values(c.errors)[0]?.[0] : null;
  if (status === 401 || status === 403) {
    return "A integração de pagamento não está configurada corretamente.";
  }
  if (status === 422) {
    // o mais comum aqui é cartão recusado ou dado inválido
    return primeiro?.toLowerCase().includes("card")
      ? "O cartão não foi aceito. Confira os dados ou tente outro."
      : "Não foi possível concluir. Confira os dados e tente de novo.";
  }
  if (status >= 500) return "A operadora está instável agora. Tente em alguns minutos.";
  return "Não foi possível concluir o pagamento.";
}

// ------------------------------------------------------------------
// Tipos — só os campos que a gente usa de verdade
// ------------------------------------------------------------------

export type AssinaturaGateway = {
  id: string;
  status: string; // active, canceled, future...
  next_billing_at?: string | null;
  customer?: { id?: string; name?: string; email?: string };
  card?: { last_four_digits?: string; brand?: string };
  current_cycle?: { end_at?: string | null };
};

export type ClienteGateway = { id: string; name?: string; email?: string };

// ------------------------------------------------------------------
// Operações
// ------------------------------------------------------------------

/** O cliente no gateway — um por empresa, reaproveitado nas trocas. */
/**
 * Cliente que já existe e nasceu SEM documento: o gateway recusa a
 * cobrança dele para sempre, e reaproveitá-lo faria a segunda tentativa
 * falhar igual à primeira, com a mesma mensagem, sem ninguém entender.
 */
export async function atualizarCliente(
  clienteId: string,
  dados: { nome: string; email: string; documento: string }
) {
  const d = dados.documento.replace(/\D/g, "");
  return chamar<ClienteGateway>(`/customers/${clienteId}`, {
    method: "PUT",
    body: JSON.stringify({
      name: dados.nome,
      email: dados.email,
      document: d,
      document_type: d.length > 11 ? "CNPJ" : "CPF",
      type: d.length > 11 ? "company" : "individual",
    }),
  });
}

export async function criarCliente(dados: {
  nome: string;
  email: string;
  documento?: string | null;
}) {
  return chamar<ClienteGateway>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: dados.nome,
      email: dados.email,
      ...(dados.documento
        ? {
            document: dados.documento.replace(/\D/g, ""),
            document_type: dados.documento.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF",
            type: dados.documento.replace(/\D/g, "").length > 11 ? "company" : "individual",
          }
        : {}),
    }),
  });
}

/**
 * A assinatura mensal, sem plano cadastrado no painel (assinatura
 * avulsa): o item carrega o preço, então mudar o valor é mudar o código
 * aqui e não mexer em plano no gateway.
 */
export async function criarAssinatura(dados: {
  clienteId: string;
  cardToken: string;
  valorCentavos: number;
  descricao: string;
}) {
  return chamar<AssinaturaGateway>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer_id: dados.clienteId,
      card_token: dados.cardToken,
      payment_method: "credit_card",
      billing_type: "prepaid",
      interval: "month",
      interval_count: 1,
      installments: 1,
      items: [
        {
          description: dados.descricao,
          quantity: 1,
          pricing_scheme: { price: dados.valorCentavos, scheme_type: "unit" },
        },
      ],
    }),
  });
}

/** A verdade sobre uma assinatura — é o que o webhook manda reler. */
export async function lerAssinatura(assinaturaId: string) {
  return chamar<AssinaturaGateway>(`/subscriptions/${assinaturaId}`);
}

/** Trocar o cartão sem refazer a assinatura. */
export async function trocarCartao(assinaturaId: string, cardToken: string) {
  return chamar<AssinaturaGateway>(`/subscriptions/${assinaturaId}/card`, {
    method: "PATCH",
    body: JSON.stringify({ card_token: cardToken }),
  });
}

/** Cancelar. O gateway para de cobrar; o acesso, quem decide é a gente. */
export async function cancelarAssinatura(assinaturaId: string) {
  return chamar<AssinaturaGateway>(`/subscriptions/${assinaturaId}`, {
    method: "DELETE",
  });
}

/** O preço, num lugar só. Em centavos, como o gateway quer. */
export function valorMensalCentavos(): number {
  const v = Number(process.env.PAGARME_VALOR_MENSAL_CENTAVOS);
  return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
}

export function valorMensalReais(): number {
  return valorMensalCentavos() / 100;
}
