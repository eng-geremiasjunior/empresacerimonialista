import { createClient } from "@/lib/supabase/server";

/**
 * A porta do sistema: esta conta já pagou para entrar?
 *
 * Decisão do dono (07/09/2026): não existe nada gratuito. O preço de
 * lançamento de R$ 27,90 é a entrada barata que substitui o teste grátis
 * — "27 reais hoje em dia é troco de pão, e dou garantias pra isso, a
 * pessoa cancela quando quiser".
 *
 * Antes disto, quem criava conta caía no painel e ficava com o plano
 * `piloto` (1 evento) para sempre, sem cartão e sem prazo: `congela_em`
 * (151) só existe depois de um cancelamento, e quem nunca assinou nunca
 * cancelou. O anúncio prometia R$ 27,90 e entregava um sistema de graça.
 *
 * A RÉGUA É PAGAMENTO, NÃO STATUS — de propósito. Cartão recusado numa
 * conta nova grava `inadimplente` (assinatura/actions.ts, o
 * `atual?.status ?? "inadimplente"`), e `teto_do_plano` conta
 * `inadimplente` como pagante: pela régua do status, uma tentativa
 * recusada abriria o sistema inteiro sem um centavo ter entrado.
 *
 * Quem passa:
 *  - `ativa` — está pagando agora;
 *  - `pausada` — a cortesia que o dono concede (a conta dele é assim);
 *  - qualquer conta com `ultimo_pagamento_em` — já pagou alguma vez, e é
 *    o caso da assinante cujo cartão falhou ESTE mês: ela não perde o
 *    sistema por um boleto atrasado, quem cuida disso é a cobrança;
 *  - qualquer conta com `cancelada_em` — quem cancelou continua vendo o
 *    que é dela até congelar, e esse prazo quem decide é a 151.
 *
 * Erro de leitura NÃO tranca a porta. Uma falha de trinta segundos no
 * banco não pode trancar do lado de fora quem está pagando.
 */
export async function precisaAssinar(): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assinaturas")
    .select("status, ultimo_pagamento_em, cancelada_em")
    .maybeSingle();

  if (error) return false;
  if (!data) return true;

  const linha = data as {
    status: string | null;
    ultimo_pagamento_em: string | null;
    cancelada_em: string | null;
  };
  if (linha.status === "ativa" || linha.status === "pausada") return false;
  if (linha.ultimo_pagamento_em || linha.cancelada_em) return false;
  return true;
}
