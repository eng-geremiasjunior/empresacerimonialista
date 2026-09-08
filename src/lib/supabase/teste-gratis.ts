import { createClient } from "@/lib/supabase/server";

/**
 * O portão do teste grátis (154).
 *
 * Ligar e desligar o cadastro sem cartão, e mudar de quantos dias ele é,
 * é decisão do dono no /admin — não é publicação de código. A regra mora
 * na tabela `teste_gratis`, do mesmo jeito que a escada de preço mora na
 * `plano_promocao`: se ele fechar a torneira às onze da noite, a página
 * de vendas volta ao checkout na recarga seguinte, sem ninguém no
 * teclado.
 *
 * FECHADO É O PADRÃO SEGURO. Sem linha, com erro de leitura, com a
 * migração ainda não aplicada — em todos esses casos esta função devolve
 * fechado, e o sistema se comporta exatamente como antes da 154. Um
 * banco fora do ar não pode virar uma porta escancarada.
 *
 * O portão governa só quem CHEGA. Quem já tem `teste_termina_em` corre
 * os dias dela até o fim mesmo com a porta fechada — quem decide isso é
 * `precisaAssinar`, lendo a data, não esta função.
 */
export type PortaoDoTeste = { aberto: boolean; dias: number };

export const PORTAO_FECHADO: PortaoDoTeste = { aberto: false, dias: 7 };

export async function portaoDoTeste(): Promise<PortaoDoTeste> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teste_gratis")
    .select("aberto, dias")
    .maybeSingle();

  if (error || !data) return PORTAO_FECHADO;

  const linha = data as { aberto: boolean | null; dias: number | null };
  const dias = Number(linha.dias);
  return {
    aberto: linha.aberto === true,
    // dias fora da faixa não existe (o CHECK do banco impede), mas se um
    // dia existir, sete é o combinado — nunca zero, que daria um teste
    // que nasce vencido
    dias: Number.isFinite(dias) && dias >= 1 && dias <= 90 ? Math.trunc(dias) : 7,
  };
}

/**
 * O último dia do teste de quem se cadastra AGORA, em ISO (só a data).
 *
 * Conta em horário de Brasília: quem cria a conta às 22h de uma
 * segunda-feira tem até o domingo inteiro, não até a segunda seguinte de
 * madrugada, porque o `current_date` do Postgres compara data com data.
 */
export function fimDoTeste(dias: number, agora = new Date()): string {
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const d = new Date(
    Date.UTC(brasilia.getUTCFullYear(), brasilia.getUTCMonth(), brasilia.getUTCDate())
  );
  // "7 dias" conta o dia de hoje: cadastro no dia 1 termina no dia 7.
  d.setUTCDate(d.getUTCDate() + (dias - 1));
  return d.toISOString().slice(0, 10);
}

/** Quantos dias ainda faltam, contando hoje. Zero ou menos = acabou. */
export function diasQueRestam(fim: string, agora = new Date()): number {
  const brasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const hoje = Date.UTC(
    brasilia.getUTCFullYear(),
    brasilia.getUTCMonth(),
    brasilia.getUTCDate()
  );
  const [a, m, d] = fim.split("-").map(Number);
  if (!a || !m || !d) return 0;
  return Math.round((Date.UTC(a, m - 1, d) - hoje) / 86400000) + 1;
}
