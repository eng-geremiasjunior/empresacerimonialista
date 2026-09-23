import { createClient } from "@/lib/supabase/server";
import { somarDias } from "@/lib/tempo";

/**
 * A porta do sistema: esta conta já pagou para entrar?
 *
 * O PLANO GRATUITO (23/09/2026, decisão do dono e da esposa) reabre a
 * porta para quem não paga: a conta sem assinatura — e a do teste que
 * venceu sem virar pagamento — entra, e o banco dá a ela a regra que
 * sempre existiu para quem não é pagante nem testa (154: 1 evento, 1
 * login). O "nada gratuito" de 07/09 (abaixo) deixou de valer; o que a
 * porta ainda barra é o buraco que ela veio fechar: a linha que
 * `teto_do_plano` trataria como PAGANTE sem um centavo ter entrado
 * (`inadimplente` de cartão recusado; `cancelada` com vencimento pela
 * frente) — essas dariam o teto cheio de graça.
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
 *  - quem cancelou DEPOIS de ter pago — coberto pelo `ultimo_pagamento_em`
 *    acima; continua vendo o que é dela até congelar, e esse prazo quem
 *    decide é a 151.
 *
 * `cancelada_em` sozinho NÃO abre a porta, e isso é um conserto: uma
 * assinatura nova que o gateway devolve como 'canceled' grava
 * `cancelada_em` sem um centavo ter entrado. Pela régua anterior, um
 * cartão que nascesse cancelado na operadora abria o sistema inteiro de
 * graça — que é exatamente o buraco que esta trava veio fechar.
 *
 * Erro de leitura NÃO tranca a porta. Uma falha de trinta segundos no
 * banco não pode trancar do lado de fora quem está pagando.
 *
 * O TESTE DE SETE DIAS (154, 08/09/2026) abriu uma quarta entrada, e ela
 * é por DATA, não por status. `minha_assinatura()` devolve
 * `coalesce(status,'trial')`, então toda conta sem linha já se apresenta
 * como 'trial' para a tela: se a porta abrisse pela string, abriria para
 * todo mundo que nunca assinou — que é o buraco que este arquivo veio
 * fechar. Quem decide é `teste_termina_em`, escrita uma vez no cadastro
 * e nunca renovada. Vencida a data, a linha continua ali e a porta
 * fecha sozinha: o teste não precisa de rotina para acabar.
 *
 * Fechar o portão no /admin NÃO corta quem já entrou: esta função nem
 * olha o portão, só a data que a conta recebeu. Encurtar prazo prometido
 * é o tipo de coisa que gera contestação de cartão.
 */
export async function precisaAssinar(): Promise<boolean> {
  const supabase = createClient();
  // `*` e não a lista de colunas, de propósito. Pedir
  // `teste_termina_em` pelo nome antes de a 154 ter sido aplicada é um
  // erro do PostgREST — e a linha abaixo trata erro como "não tranca a
  // porta", o que abriria o sistema inteiro de graça para todo mundo
  // durante a janela entre publicar o código e rodar a migração. Com
  // `*` não existe acoplamento a nome de coluna: a chave é só a linha
  // dela, que a RLS já limita.
  const { data, error } = await supabase.from("assinaturas").select("*").maybeSingle();

  if (error) return false;
  // sem linha = o plano Gratuito (23/09/2026)
  if (!data) return false;

  const linha = data as {
    status?: string | null;
    ultimo_pagamento_em?: string | null;
    // ausente enquanto a 154 não tiver sido aplicada — e ausente é o
    // mesmo que "sem teste", que é o comportamento anterior a ela
    teste_termina_em?: string | null;
    gateway_subscription_id?: string | null;
    proximo_vencimento?: string | null;
  };
  if (linha.status === "ativa" || linha.status === "pausada") return false;
  if (linha.ultimo_pagamento_em) return false;
  if (linha.status === "trial" && testeVivo(linha.teste_termina_em ?? null)) return false;
  // O TESTE COM CARTÃO (21/09/2026): no dia da primeira cobrança é a
  // operadora quem decide, e ela decide ao longo do dia — o aviso chega
  // quando chega, e a rotina diária confere de manhã. Fechar a porta à
  // meia-noite do 8º dia deixaria do lado de fora, com o cartão cobrado,
  // quem tem evento naquele dia. Com a cobrança agendada, a porta fica
  // aberta por até três dias depois da data marcada; se a cobrança não
  // passar, fecha sozinha depois disso, e a tela de assinatura diz o que
  // fazer.
  if (
    linha.status === "trial" &&
    linha.gateway_subscription_id &&
    linha.proximo_vencimento &&
    testeVivo(somarDias(linha.proximo_vencimento, DIAS_DE_FOLGA_DA_COBRANCA))
  ) {
    return false;
  }
  // O teste que venceu sem pagamento vira o Gratuito: o banco já não o
  // conta como pagante nem como teste, e dá 1 evento (23/09/2026).
  if (linha.status === "trial") return false;
  // Trancado só o que o teto trataria como pagante sem pagamento: o
  // inadimplente que nunca pagou, e a cancelada que ainda tem vencimento
  // pela frente. Cancelada vencida cai no Gratuito como as outras.
  if (linha.status === "inadimplente") return true;
  if (linha.status === "cancelada" && linha.proximo_vencimento && testeVivo(linha.proximo_vencimento)) {
    return true;
  }
  return false;
}

/** Quantos dias depois da primeira cobrança agendada a porta ainda espera a operadora. */
export const DIAS_DE_FOLGA_DA_COBRANCA = 3;

/**
 * O último dia conta inteiro. Comparação de texto ISO, não de `Date`, e
 * em BRASÍLIA — a mesma régua que `teto_do_plano` usa desde a 154
 * (`(now() at time zone 'America/Sao_Paulo')::date`). Se um lado
 * contasse em UTC, das 21h à meia-noite do último dia a porta diria
 * "entra" e os tetos do banco já diriam "acabou", justamente na noite
 * em que a promoção de fechamento deveria converter.
 */
export function testeVivo(fim: string | null, agora = new Date()): boolean {
  if (!fim) return false;
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const hoje = brasilia.toISOString().slice(0, 10);
  return fim >= hoje;
}
