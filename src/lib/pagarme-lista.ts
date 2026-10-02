import "server-only";

// A Pagar.me da lista de presentes (182+). Separada da assinatura de
// propósito: a chave pode ser outra (PAGARME_LISTA_SECRET_KEY aponta para
// o AMBIENTE DE TESTE no desenvolvimento; sem ela, vale a de produção), e
// nada daqui passa pelo gateway_log — o corpo tem CPF, renda e conta
// bancária de gente, e não fica em lugar nenhum nosso.

import { so, type DadosDoRecebedor } from "@/lib/lista-presentes";

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
  try {
    const r = await fetch(BASE + caminho, {
      method: metodo,
      headers: { Authorization: "Basic " + Buffer.from(`${chave()}:`).toString("base64"), "Content-Type": "application/json" },
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
  status: string;
  charges?: { id: string; status: string; paid_at?: string; last_transaction?: TransacaoPix }[];
};

/**
 * O pedido do presente: Pix, um item, e o split — a família recebe a parte
 * dela (sem a tarifa), a plataforma fica com a taxa e paga a tarifa do Pix
 * e os centavos que sobrarem. O CPF e o celular do convidado vão SÓ para a
 * Pagar.me (nada disso fica aqui; o erro não ecoa o corpo).
 */
export async function criarPedidoPix(p: {
  pagamentoId: string;
  eventoId: string;
  titulo: string;
  presenteId: string | null;
  total: number;
  familia: number;
  plataforma: number;
  recebedorDaFamilia: string;
  convidado: { nome: string; email: string; cpf: string; celular: string };
  expiraEmSegundos: number;
}) {
  const plataforma = recebedorDaPlataforma();
  // A loja de TESTE da Pagar.me não cria recebedor (412 "not allowed to
  // create a recipient", medido em 02/10/2026): lá o pedido sai sem a
  // divisão, só para provar o caminho do Pix (gerar, esperar, confirmar).
  // Na produção a divisão é obrigatória: sem ela, nenhum pedido sai.
  const semDivisao = !plataforma && emTeste() && process.env.VERCEL_ENV !== "production";
  if (!plataforma && !semDivisao) return { ok: false as const, status: 0, erro: "sem recebedor da plataforma" };
  if (p.familia + p.plataforma !== p.total) return { ok: false as const, status: 0, erro: "divisão não fecha" };
  const divisao = plataforma
    ? [
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
      ]
    : null;
  const cel = so(p.convidado.celular);
  return chamar<PedidoGateway>("POST", "/orders", {
    code: p.pagamentoId,
    items: [{ amount: p.total, description: p.titulo.slice(0, 250), quantity: 1, code: (p.presenteId ?? "presente").slice(0, 52) }],
    customer: {
      name: p.convidado.nome.trim().slice(0, 64),
      email: p.convidado.email.trim(),
      document: so(p.convidado.cpf),
      type: "individual",
      phones: { mobile_phone: { country_code: "55", area_code: cel.slice(0, 2), number: cel.slice(2) } },
    },
    payments: [
      {
        payment_method: "pix",
        pix: { expires_in: p.expiraEmSegundos, additional_information: [{ name: "Presente", value: p.titulo.slice(0, 60) }] },
        ...(divisao ? { split: divisao } : {}),
      },
    ],
    metadata: { pagamento: p.pagamentoId, evento: p.eventoId },
  });
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
 */
export function estadoDoPedido(pedido: Pick<PedidoGateway, "status">, expiraEm: string | null): "aguardando" | "pago" | "expirado" | "falhou" {
  const vencido = !!expiraEm && Date.now() > new Date(expiraEm).getTime() + 5 * 60_000;
  if (pedido.status === "paid") return "pago";
  if (pedido.status === "canceled" || pedido.status === "failed") return vencido || pedido.status === "canceled" ? "expirado" : "falhou";
  return vencido ? "expirado" : "aguardando";
}
