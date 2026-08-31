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

/**
 * A caixa-preta: cada chamada ao gateway fica em gateway_log, e a tela
 * /admin/gateway mostra. Nasceu porque três cobranças recusadas foram
 * diagnosticadas por print do painel — o corpo do erro morria no console
 * da Vercel, que o dono não abre.
 *
 * Disparo-e-esquece de verdade: falha do log NUNCA falha o pagamento.
 * Em sucesso o corpo não é guardado (tem documento e endereço de gente
 * dentro); em erro é o corpo que diagnostica, então ele fica.
 */
function registrarChamada(linha: {
  metodo: string;
  caminho: string;
  status: number | null;
  ok: boolean;
  resposta: unknown;
  excecao: string | null;
  duracaoMs: number;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  // Truncar JSON pelo meio produz JSON inválido — se o corpo for grande,
  // ele vira texto dentro de um objeto, nunca um parse quebrado.
  let resposta: unknown = null;
  if (!linha.ok) {
    try {
      const s = JSON.stringify(linha.resposta ?? null);
      resposta =
        s && s.length > 4000
          ? { truncado: s.slice(0, 4000) }
          : (linha.resposta ?? null);
    } catch {
      resposta = { erro_ao_serializar: true };
    }
  }
  void fetch(`${url}/rest/v1/gateway_log`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      gateway: "pagarme",
      metodo: linha.metodo,
      caminho: linha.caminho,
      status: linha.status,
      ok: linha.ok,
      resposta,
      excecao: linha.excecao,
      duracao_ms: Math.round(linha.duracaoMs),
    }),
  }).catch(() => {});
}

async function chamar<T>(
  caminho: string,
  init?: RequestInit
): Promise<{ ok: true; dados: T } | { ok: false; erro: string; cru?: unknown }> {
  const metodo = init?.method ?? "GET";
  const inicio = Date.now();
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
    registrarChamada({
      metodo,
      caminho,
      status: r.status,
      ok: r.ok,
      resposta: corpo,
      excecao: null,
      duracaoMs: Date.now() - inicio,
    });
    if (!r.ok) {
      console.error("[vela:pagarme]", caminho, r.status, JSON.stringify(corpo)?.slice(0, 500));
      return { ok: false, erro: mensagemDoErro(r.status, corpo), cru: corpo };
    }
    return { ok: true, dados: corpo as T };
  } catch (e) {
    registrarChamada({
      metodo,
      caminho,
      status: null,
      ok: false,
      resposta: null,
      excecao: String(e).slice(0, 300),
      duracaoMs: Date.now() - inicio,
    });
    console.error("[vela:pagarme] rede:", caminho, e);
    return { ok: false, erro: "Não conseguimos falar com a operadora agora. Tente de novo." };
  }
}

function mensagemDoErro(status: number, corpo: unknown): string {
  const c = corpo as { message?: string; errors?: Record<string, string[]> } | null;
  const primeiro = c?.errors ? Object.values(c.errors)[0]?.[0] : null;
  // O detalhe cru da operadora vai junto, entre parênteses. Três cobranças
  // recusadas foram diagnosticadas por print do painel porque a tela só
  // dizia "não foi possível" — o campo que faltava estava no corpo do
  // erro o tempo todo, e ninguém via.
  const detalhe = primeiro ? ` (detalhe da operadora: ${primeiro.slice(0, 140)})` : "";
  if (status === 401 || status === 403) {
    return "A integração de pagamento não está configurada corretamente.";
  }
  if (status === 422) {
    // o mais comum aqui é cartão recusado ou dado inválido
    return primeiro?.toLowerCase().includes("card")
      ? `O cartão não foi aceito. Confira os dados ou tente outro.${detalhe}`
      : `Não foi possível concluir. Confira os dados e tente de novo.${detalhe}`;
  }
  if (status >= 500) return "A operadora está instável agora. Tente em alguns minutos.";
  return `Não foi possível concluir o pagamento.${detalhe}`;
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
 * Os dados de quem paga, como o gateway quer.
 *
 * Foram descobertos um a um, no susto, cada um custando uma cobrança
 * recusada: primeiro o documento ("The customer Document is required"),
 * depois o telefone ("At least one customer phone is required"). Por
 * isso agora vai tudo de uma vez — inclusive o endereço, que o
 * antifraude usa e que a nota fiscal vai querer um dia.
 */
export type DadosDoPagador = {
  nome: string;
  email: string;
  documento: string;
  telefone: string;
  endereco: {
    cep: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
};

function corpoDoCliente(d: DadosDoPagador) {
  const doc = d.documento.replace(/\D/g, "");
  const tel = d.telefone.replace(/\D/g, "");
  const cep = d.endereco.cep.replace(/\D/g, "");
  return {
    name: d.nome,
    email: d.email,
    document: doc,
    document_type: doc.length > 11 ? "CNPJ" : "CPF",
    type: doc.length > 11 ? "company" : "individual",
    phones: {
      mobile_phone: {
        country_code: "55",
        area_code: tel.slice(0, 2),
        number: tel.slice(2),
      },
    },
    address: {
      line_1: [d.endereco.numero, d.endereco.rua, d.endereco.bairro]
        .filter(Boolean)
        .join(", "),
      line_2: d.endereco.complemento || "",
      zip_code: cep,
      city: d.endereco.cidade,
      state: d.endereco.estado.toUpperCase(),
      country: "BR",
    },
  };
}

/**
 * Cliente que já existe e nasceu incompleto: o gateway recusa a cobrança
 * dele para sempre, e reaproveitá-lo faria a segunda tentativa falhar
 * igual à primeira, com a mesma mensagem, sem ninguém entender.
 */
export async function atualizarCliente(clienteId: string, dados: DadosDoPagador) {
  return chamar<ClienteGateway>(`/customers/${clienteId}`, {
    method: "PUT",
    body: JSON.stringify(corpoDoCliente(dados)),
  });
}

export async function criarCliente(dados: DadosDoPagador) {
  return chamar<ClienteGateway>("/customers", {
    method: "POST",
    body: JSON.stringify(corpoDoCliente(dados)),
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
  /** endereço de cobrança do CARTÃO — o terceiro campo descoberto no
      susto: `validation_error | billing | "value" is required`. O token
      só carrega os dados do plástico; o billing_address vai aqui, junto
      do card_token, na criação da assinatura. */
  enderecoCobranca: {
    cep: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
}) {
  const e = dados.enderecoCobranca;
  return chamar<AssinaturaGateway>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer_id: dados.clienteId,
      // A doc sugere o token dentro de `card`; a EVIDÊNCIA diz outra
      // coisa: as quatro assinaturas que chegaram a existir no gateway
      // foram criadas com card_token no topo — e a única tentativa com
      // ele dentro de `card` foi recusada na validação, sem nem criar
      // cobrança. O topo fica; só o endereço de cobrança vive em `card`.
      card_token: dados.cardToken,
      card: {
        billing_address: {
          line_1: [e.numero, e.rua, e.bairro].filter(Boolean).join(", "),
          line_2: e.complemento || "",
          zip_code: e.cep.replace(/\D/g, ""),
          city: e.cidade,
          state: e.estado.toUpperCase(),
          country: "BR",
        },
      },
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
