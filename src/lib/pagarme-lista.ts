import "server-only";

// A Pagar.me da lista de presentes (182+). Separada da assinatura de
// propósito: a chave pode ser outra (PAGARME_LISTA_SECRET_KEY aponta para
// o AMBIENTE DE TESTE no desenvolvimento; sem ela, vale a de produção), e
// nada daqui passa pelo gateway_log — o corpo tem CPF, renda e conta
// bancária de gente, e não fica em lugar nenhum nosso.

import { so, type DadosDoRecebedor, type EnderecoDeCobranca } from "@/lib/lista-presentes";

const BASE = "https://api.pagar.me/core/v5";

function chave(): string {
  const k = process.env.PAGARME_LISTA_SECRET_KEY || process.env.PAGARME_SECRET_KEY;
  if (!k) throw new Error("PAGARME_SECRET_KEY ausente");
  // fora da produção, só a chave de teste: cadastro de mentira nunca vai
  // para a Pagar.me de verdade
  if (process.env.NODE_ENV !== "production" && !k.startsWith("sk_test_")) {
    throw new Error("PAGARME_LISTA_SECRET_KEY de teste ausente");
  }
  // e o contrário: a chave de teste no site de verdade marcaria "pago" sem
  // dinheiro nenhum (o simulador da loja de teste paga sozinho) — o
  // NODE_ENV não separa, porque a prévia da Vercel também é "production"
  if (process.env.VERCEL_ENV === "production" && k.startsWith("sk_test_")) {
    throw new Error("chave de teste da Pagar.me no site de produção");
  }
  return k;
}
export const emTeste = () => {
  try {
    return chave().startsWith("sk_test_");
  } catch {
    return false;
  }
};

async function chamar<T>(metodo: "GET" | "POST", caminho: string, corpo?: unknown): Promise<{ ok: true; dados: T } | { ok: false; status: number; erro: string }> {
  // sem chave nada sai daqui — e isso não é "rede": quem chama sabe que
  // nenhum pedido chegou à Pagar.me (no cartão, a diferença importa)
  let k: string;
  try {
    k = chave();
  } catch (e) {
    console.error("[eorganizei:lista] pagarme sem chave", (e as Error).message);
    return { ok: false, status: 0, erro: "sem chave" };
  }
  try {
    const r = await fetch(BASE + caminho, {
      method: metodo,
      headers: { Authorization: "Basic " + Buffer.from(`${k}:`).toString("base64"), "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
      cache: "no-store",
    });
    const texto = await r.text();
    if (!r.ok) {
      // só o status e a mensagem do gateway — nunca o corpo que enviamos
      let msg = "";
      try {
        const j = JSON.parse(texto) as { message?: string; errors?: Record<string, string[]> };
        msg = [j.message, ...Object.keys(j.errors ?? {})].filter(Boolean).join(" · ");
      } catch {
        msg = texto.slice(0, 120);
      }
      console.error("[eorganizei:lista] pagarme", metodo, caminho.split("/")[1], r.status, msg.slice(0, 200));
      return { ok: false, status: r.status, erro: msg };
    }
    return { ok: true, dados: JSON.parse(texto) as T };
  } catch (e) {
    console.error("[eorganizei:lista] pagarme rede", (e as Error).message);
    return { ok: false, status: 0, erro: "rede" };
  }
}

export type RecebedorGateway = { id: string; status: string; kyc_details?: { status?: string; status_reason?: string } };

/** Cria o recebedor da família: transferência mensal (dia 5), sem antecipação. */
export async function criarRecebedor(d: DadosDoRecebedor & { email: string; codigo: string }) {
  const cpf = so(d.cpf);
  const cel = so(d.celular);
  return chamar<RecebedorGateway>("POST", "/recipients", {
    code: d.codigo,
    register_information: {
      name: d.nome.trim(),
      email: d.email,
      document: cpf,
      type: "individual",
      mother_name: d.nomeDaMae.trim(),
      birthdate: d.nascimento.trim(),
      monthly_income: Math.round(Number(so(d.rendaMensal)) * 100),
      professional_occupation: d.profissao.trim(),
      address: {
        street: d.rua.trim(),
        // a Pagar.me exige os dois preenchidos (422 com string vazia); não
        // pedimos ponto de referência à família
        complementary: d.complemento.trim() || "Não informado",
        street_number: d.numero.trim(),
        neighborhood: d.bairro.trim(),
        city: d.cidade.trim(),
        state: d.uf.trim().toUpperCase(),
        zip_code: so(d.cep),
        reference_point: "Não informado",
      },
      phone_numbers: [{ ddd: cel.slice(0, 2), number: cel.slice(2), type: "mobile" }],
    },
    default_bank_account: {
      holder_name: d.nome.trim().slice(0, 30),
      holder_type: "individual",
      holder_document: cpf,
      bank: d.banco,
      branch_number: so(d.agencia),
      branch_check_digit: so(d.agenciaDigito) || undefined,
      account_number: so(d.conta),
      account_check_digit: d.contaDigito.trim().toUpperCase(),
      type: d.tipoConta,
    },
    // cada transferência custa R$ 3,67: uma por mês (a família pode pedir antes)
    transfer_settings: { transfer_enabled: true, transfer_interval: "Monthly", transfer_day: 5 },
    // o dinheiro do cartão fica os 15 dias que seguram a janela do estorno
    automatic_anticipation_settings: { enabled: false },
  });
}

export async function lerRecebedor(id: string) {
  return chamar<RecebedorGateway>("GET", `/recipients/${encodeURIComponent(id)}`);
}

/** O link da prova de vida (selfie + documento), feita no celular de quem vai receber. */
export async function linkDaProvaDeVida(id: string): Promise<{ ok: true; url: string } | { ok: false; status: number; erro: string }> {
  if (process.env.NODE_ENV !== "production" && !emTeste()) return { ok: false, status: 0, erro: "sem chave de teste" };
  if (emTeste()) {
    // no ambiente de teste a Pagar.me oferece uma rota simulada
    try {
      const r = await fetch(`https://api.mundipagg.com/lifecycle/v1/kycs-mock/qr-code?customId=${encodeURIComponent(id)}&status=approved&statusReason=ok`, { method: "POST", cache: "no-store" });
      const j = (await r.json()) as { url?: string };
      return j.url ? { ok: true, url: j.url } : { ok: false, status: r.status, erro: "sem link" };
    } catch {
      return { ok: false, status: 0, erro: "rede" };
    }
  }
  const r = await chamar<{ url?: string }>("POST", `/recipients/${encodeURIComponent(id)}/kyc_link`);
  if (!r.ok) return { ok: false, status: r.status, erro: r.erro };
  return r.dados.url ? { ok: true, url: r.dados.url } : { ok: false, status: 0, erro: "sem link" };
}

// ------------------------------------------------------------ o presente (Pix com split)

/**
 * O recebedor do eOrganizei no split (a taxa da lista). Produção: o da
 * conta (re_cmthn64qv0noo0l9tgj560kij, empresa, ativo — lido pela API em
 * 27/09/2026). No teste, PAGARME_LISTA_RECEBEDOR_PLATAFORMA, se um dia a
 * loja de teste puder ter recebedor (hoje responde 412); sem ele, o pedido
 * de teste sai sem divisão (criarPedidoPix).
 */
function recebedorDaPlataforma(): string | null {
  const doAmbiente = process.env.PAGARME_LISTA_RECEBEDOR_PLATAFORMA?.trim();
  if (doAmbiente) return doAmbiente;
  return emTeste() ? null : "re_cmthn64qv0noo0l9tgj560kij";
}

export type TransacaoPix = {
  qr_code?: string;
  qr_code_url?: string;
  expires_at?: string;
  status?: string;
  /** quando a transação falha: só as mensagens do gateway (sem dado do comprador) */
  gateway_response?: { errors?: { message?: string }[] };
};
export type PedidoGateway = {
  id: string;
  /** o id do nosso pagamento (o code que mandamos ao criar o pedido) */
  code?: string;
  status: string;
  charges?: { id: string; status: string; paid_at?: string; last_transaction?: TransacaoPix }[];
};

export type DadosDoPedido = {
  pagamentoId: string;
  eventoId: string;
  titulo: string;
  presenteId: string | null;
  total: number;
  familia: number;
  plataforma: number;
  recebedorDaFamilia: string;
  convidado: { nome: string; email: string; cpf: string; celular: string };
};

/**
 * O split, igual no Pix e no cartão: a família recebe a parte dela (sem
 * tarifa nenhuma); a plataforma fica com as taxas e paga a tarifa da
 * Pagar.me e os centavos que sobrarem. Os dois respondem por contestação,
 * cada um pela sua parte (decisão dele, 03/10/2026).
 */
function divisaoDoPresente(p: DadosDoPedido):
  | { ok: true; divisao: Record<string, unknown>[] | null }
  | { ok: false; status: 0; erro: string } {
  const plataforma = recebedorDaPlataforma();
  // A loja de TESTE da Pagar.me não cria recebedor (412 "not allowed to
  // create a recipient", medido em 02/10/2026): lá o pedido sai sem a
  // divisão, só para provar o caminho (gerar, esperar, confirmar). Na
  // produção a divisão é obrigatória: sem ela, nenhum pedido sai.
  const semDivisao = !plataforma && emTeste() && process.env.VERCEL_ENV !== "production";
  if (!plataforma && !semDivisao) return { ok: false, status: 0, erro: "sem recebedor da plataforma" };
  if (p.familia + p.plataforma !== p.total) return { ok: false, status: 0, erro: "divisão não fecha" };
  if (!plataforma) return { ok: true, divisao: null };
  return {
    ok: true,
    divisao: [
      {
        amount: p.familia,
        recipient_id: p.recebedorDaFamilia,
        type: "flat",
        options: { liable: true, charge_processing_fee: false, charge_remainder_fee: false },
      },
      {
        amount: p.plataforma,
        recipient_id: plataforma,
        type: "flat",
        options: { liable: true, charge_processing_fee: true, charge_remainder_fee: true },
      },
    ],
  };
}

function corpoDoPedido(p: DadosDoPedido, pagamento: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const cel = so(p.convidado.celular);
  return {
    code: p.pagamentoId,
    items: [{ amount: p.total, description: p.titulo.slice(0, 250), quantity: 1, code: (p.presenteId ?? "presente").slice(0, 52) }],
    customer: {
      name: p.convidado.nome.trim().slice(0, 64),
      email: p.convidado.email.trim(),
      document: so(p.convidado.cpf),
      type: "individual",
      phones: { mobile_phone: { country_code: "55", area_code: cel.slice(0, 2), number: cel.slice(2) } },
      ...extra,
    },
    payments: [pagamento],
    metadata: { pagamento: p.pagamentoId, evento: p.eventoId },
  };
}

/**
 * O pedido do presente no Pix: um item e o split. O CPF e o celular do
 * convidado vão SÓ para a Pagar.me (nada disso fica aqui; o erro não ecoa
 * o corpo).
 */
export async function criarPedidoPix(p: DadosDoPedido & { expiraEmSegundos: number }) {
  const d = divisaoDoPresente(p);
  if (!d.ok) return d;
  return chamar<PedidoGateway>(
    "POST",
    "/orders",
    corpoDoPedido(p, {
      payment_method: "pix",
      pix: { expires_in: p.expiraEmSegundos, additional_information: [{ name: "Presente", value: p.titulo.slice(0, 60) }] },
      ...(d.divisao ? { split: d.divisao } : {}),
    })
  );
}

/**
 * O pedido do presente no cartão (03/10/2026): o token de uso único que o
 * navegador trocou direto com a Pagar.me (o número do cartão nunca passa
 * por aqui), as parcelas e o endereço da fatura, que o antifraude e a
 * validação da Pagar.me exigem. Cobra na hora (auth_and_capture): a
 * resposta já diz pago, recusado ou em análise. O IP do convidado vai só
 * para o antifraude da Pagar.me — aqui ele nunca é gravado.
 */
export async function criarPedidoCartao(
  p: DadosDoPedido & {
    cartao: { token: string; parcelas: number; endereco: EnderecoDeCobranca };
    ip: string | null;
  }
) {
  const d = divisaoDoPresente(p);
  if (!d.ok) return d;
  const e = p.cartao.endereco;
  const endereco = {
    line_1: [e.numero.trim(), e.rua.trim(), e.bairro.trim()].filter(Boolean).join(", ").slice(0, 256),
    line_2: e.complemento.trim().slice(0, 128),
    zip_code: so(e.cep),
    city: e.cidade.trim().slice(0, 64),
    state: e.uf.trim().toUpperCase(),
    country: "BR",
  };
  return chamar<PedidoGateway>("POST", "/orders", {
    ...corpoDoPedido(
      p,
      {
        payment_method: "credit_card",
        credit_card: {
          installments: p.cartao.parcelas,
          statement_descriptor: "EORGANIZEI",
          operation_type: "auth_and_capture",
          card_token: p.cartao.token,
          card: { billing_address: endereco },
        },
        ...(d.divisao ? { split: d.divisao } : {}),
      },
      { address: endereco }
    ),
    ...(p.ip ? { ip: p.ip } : {}),
  });
}

/**
 * A chave PÚBLICA com que o navegador troca o cartão por token: a de teste
 * quando a lista roda na loja de teste (PAGARME_LISTA_PUBLIC_KEY, só no
 * .env.local), a de produção (a mesma da assinatura) no site de verdade.
 * Só sai o que começa com pk_ e é do mesmo ambiente da chave secreta; sem
 * isso, a lista fica só no Pix.
 */
export function chavePublicaDaLista(): string | null {
  // sem a secreta que vale aqui, o cartão nem aparece (o servidor não cobraria)
  let secreta: string;
  try {
    secreta = chave();
  } catch {
    return null;
  }
  const teste = secreta.startsWith("sk_test_");
  const k = ((teste ? process.env.PAGARME_LISTA_PUBLIC_KEY : process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY) ?? "").trim();
  if (!k.startsWith("pk_")) return null;
  return k.startsWith("pk_test_") === teste ? k : null;
}

export async function lerPedido(id: string) {
  return chamar<PedidoGateway>("GET", `/orders/${encodeURIComponent(id)}`);
}

/** O Pix pago que a Pagar.me devolveu (estorno) ou que foi contestado. */
export function foiEstornado(pedido: Pick<PedidoGateway, "charges">): boolean {
  return (pedido.charges ?? []).some((c) => c.status === "refunded" || c.status === "chargedback");
}

/**
 * O estado do pedido na nossa língua. Pix vencido que ainda diz "pending"
 * lá também é vencido aqui — mas "expirado" e "falhou" não são finais: se
 * a Pagar.me confirmar depois, quem grava aceita a volta para "pago".
 * Cartão não vence: recusado ou cancelado (o antifraude) é "falhou", e o
 * que está em análise espera a Pagar.me decidir.
 */
export function estadoDoPedido(
  pedido: Pick<PedidoGateway, "status">,
  expiraEm: string | null,
  meio: "pix" | "cartao" = "pix"
): "aguardando" | "pago" | "expirado" | "falhou" {
  if (meio === "cartao") {
    if (pedido.status === "paid") return "pago";
    if (pedido.status === "failed" || pedido.status === "canceled") return "falhou";
    return "aguardando";
  }
  const vencido = !!expiraEm && Date.now() > new Date(expiraEm).getTime() + 5 * 60_000;
  if (pedido.status === "paid") return "pago";
  if (pedido.status === "canceled" || pedido.status === "failed") return vencido || pedido.status === "canceled" ? "expirado" : "falhou";
  return vencido ? "expirado" : "aguardando";
}
