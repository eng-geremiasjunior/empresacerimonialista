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
export async function linkDaProvaDeVida(id: string): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  if (process.env.NODE_ENV !== "production" && !emTeste()) return { ok: false, erro: "sem chave de teste" };
  if (emTeste()) {
    // no ambiente de teste a Pagar.me oferece uma rota simulada
    try {
      const r = await fetch(`https://api.mundipagg.com/lifecycle/v1/kycs-mock/qr-code?customId=${encodeURIComponent(id)}&status=approved&statusReason=ok`, { method: "POST", cache: "no-store" });
      const j = (await r.json()) as { url?: string };
      return j.url ? { ok: true, url: j.url } : { ok: false, erro: "sem link" };
    } catch {
      return { ok: false, erro: "rede" };
    }
  }
  const r = await chamar<{ url?: string }>("POST", `/recipients/${encodeURIComponent(id)}/kyc_link`);
  if (!r.ok) return { ok: false, erro: r.erro };
  return r.dados.url ? { ok: true, url: r.dados.url } : { ok: false, erro: "sem link" };
}
