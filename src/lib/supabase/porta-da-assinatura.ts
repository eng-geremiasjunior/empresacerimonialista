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
  if (!data) return true;

  const linha = data as {
    status?: string | null;
    ultimo_pagamento_em?: string | null;
    // ausente enquanto a 154 não tiver sido aplicada — e ausente é o
    // mesmo que "sem teste", que é o comportamento anterior a ela
    teste_termina_em?: string | null;
  };
  if (linha.status === "ativa" || linha.status === "pausada") return false;
  if (linha.ultimo_pagamento_em) return false;
  if (linha.status === "trial" && testeVivo(linha.teste_termina_em ?? null)) return false;
  return true;
}

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
