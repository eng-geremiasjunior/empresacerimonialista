// O cartão, num lugar só.
//
// Duas telas cobram: a de dentro do app (quem já é cliente) e a pública,
// de quem chega do anúncio e ainda não tem conta. Tokenização e régua de
// validação vivem AQUI porque código de dinheiro duplicado é código que
// diverge — e a metade que divergir vai ser a que ninguém testou.
//
// O cartão vai do formulário DIRETO para o gateway (chave pública), que
// devolve um token de uso único; só o token chega ao nosso servidor. O
// número nunca passa pelo nosso banco nem pelos nossos logs.

import { documentoValido } from "@/lib/documento";
import { cepValido, telefoneValido, ufValida } from "@/lib/contato";
import type { Cobranca } from "@/components/assinatura/DadosDeCobranca";

export type FormularioDoCartao = {
  numero: string;
  nome: string;
  mes: string;
  ano: string;
  cvv: string;
};

/** Troca o cartão por um token, direto com o gateway. */
export async function tokenizar(
  cartao: FormularioDoCartao
): Promise<{ token?: string; erro?: string }> {
  const pk = process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY;
  if (!pk) return { erro: "Pagamento não configurado. Fale com o suporte." };
  try {
    const r = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${pk}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "card",
        card: {
          number: cartao.numero.replace(/\s/g, ""),
          holder_name: cartao.nome,
          exp_month: Number(cartao.mes),
          exp_year: Number(cartao.ano),
          cvv: cartao.cvv,
        },
      }),
    });
    const d = (await r.json()) as { id?: string; message?: string };
    if (!r.ok || !d.id) {
      return { erro: "Confira os dados do cartão e tente de novo." };
    }
    return { token: d.id };
  } catch {
    return { erro: "Não conseguimos falar com a operadora. Tente de novo." };
  }
}

/**
 * O que falta antes de ir à operadora — a mesma régua do servidor, aqui,
 * para o erro ser instantâneo e específico. Botão desabilitado sem dizer
 * por quê é adivinha; clique que responde "informe o bairro" é resposta.
 *
 * Uma função por etapa: quem erra o CPF descobre no passo 1, não depois
 * de digitar o cartão.
 */
export function faltaNosDadosPessoais(c: Cobranca): string | null {
  if (!c.nome.trim()) return "Informe o nome de quem vai pagar.";
  if (!c.email.includes("@")) return "Informe um e-mail válido para a cobrança.";
  if (!telefoneValido(c.telefone)) return "Informe um telefone válido, com DDD.";
  if (!documentoValido(c.documento)) return "Informe um CPF ou CNPJ válido.";
  return null;
}

export function faltaNoEndereco(c: Cobranca): string | null {
  if (!cepValido(c.cep)) return "Informe um CEP válido.";
  if (!c.rua.trim()) return "Informe a rua.";
  if (!c.numero.trim()) return "Informe o número do endereço.";
  if (!c.bairro.trim()) return "Informe o bairro.";
  if (!c.cidade.trim()) return "Informe a cidade.";
  if (!ufValida(c.estado)) return "Escolha o estado.";
  return null;
}

export function faltaNoCartao(form: FormularioDoCartao): string | null {
  if (form.numero.replace(/\s/g, "").length < 13) return "Confira o número do cartão.";
  if (!form.nome.trim()) return "Informe o nome como está no cartão.";
  const mes = Number(form.mes);
  if (!form.mes || mes < 1 || mes > 12) return "Confira o mês de validade.";
  if (!form.ano) return "Confira o ano de validade.";
  if (form.cvv.length < 3) return "Confira o CVV.";
  return null;
}

/**
 * A conferência final, antes de tokenizar: composta das três. Continua
 * existindo mesmo com as etapas validando uma a uma — o botão só é
 * liberado por elas, mas quem envia é esta.
 */
export function faltaNoFormulario(
  form: FormularioDoCartao,
  cobranca: Cobranca | null
): string | null {
  const cartao = faltaNoCartao(form);
  if (cartao) return cartao;
  if (!cobranca) return null; // troca de cartão não recadastra o pagador
  return faltaNosDadosPessoais(cobranca) ?? faltaNoEndereco(cobranca);
}
