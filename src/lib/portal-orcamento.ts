// O Orçamento da noiva que abriu a conta sozinha (04/10/2026). Puro:
// importável no servidor e no navegador.
//
// Os números saem do MESMO motor do Financeiro da cerimonialista
// (financeiro-tela.ts: montarItens, numerosDaVerba, linhasDeFornecedor) e
// das mesmas tabelas (transactions, evento_fornecedor_orcamento): se ela
// convidar uma cerimonialista, as duas veem a mesma conta. Aqui mora só o
// que é da tela dela: o prazo em palavras e a divisão do orçamento pelos
// capítulos do planejamento.

import { diasAte, fmtData } from "./financeiro-core";

/**
 * O prazo do pagamento na voz do portal ("vence em 4 dias"). `perto` = até
 * 31 dias, a mesma régua do planejamento: só o que está perto ganha cor.
 * `hoje` vem do servidor (hojeBR): o relógio do navegador não entra.
 */
export function quandoPagar(
  vencimento: string,
  pagoEm: string | null,
  hoje: string
): { texto: string; perto: boolean; atrasada: boolean } {
  if (pagoEm) return { texto: `pago ${fmtData(pagoEm).slice(0, 5)}`, perto: false, atrasada: false };
  const n = diasAte(vencimento, hoje);
  if (n < 0) return { texto: n === -1 ? "venceu ontem" : `venceu há ${-n} dias`, perto: true, atrasada: true };
  if (n === 0) return { texto: "vence hoje", perto: true, atrasada: false };
  if (n === 1) return { texto: "vence amanhã", perto: true, atrasada: false };
  if (n <= 31) return { texto: `vence em ${n} dias`, perto: true, atrasada: false };
  return { texto: `vence em ${fmtData(vencimento).slice(0, 5)}`, perto: false, atrasada: false };
}

/**
 * Quanto do orçamento cabe a cada assunto do método, pela faixa ideal de
 * cada um, depois de separar a reserva de imprevistos (10% quando ela não
 * disse outra). É a MESMA conta do "Sugerir distribuição" da
 * cerimonialista (planejamento/actions.ts, sugerirDistribuicao) — lá ela
 * grava num clique; aqui só se mostra, nada é gravado.
 */
export function distribuirVerba(
  verba: number,
  reservaPct: number | null,
  objetivos: { id: string; ativo: boolean; faixaIdeal: number | null }[]
): Map<string, number> {
  const previsto = new Map<string, number>();
  const base = verba * (1 - (reservaPct ?? 10) / 100);
  const ativos = objetivos.filter((o) => o.ativo && o.faixaIdeal !== null);
  const somaIdeais = ativos.reduce((s, o) => s + (o.faixaIdeal ?? 0), 0);
  if (base <= 0 || somaIdeais <= 0) return previsto;
  for (const o of ativos) previsto.set(o.id, Math.round((base * (o.faixaIdeal ?? 0)) / somaIdeais) || 0);
  return previsto;
}

/** Data AAAA-MM-DD + n meses, no mesmo dia (31/01 + 1 mês = 28/02 ou 29/02). */
export function somarMeses(iso: string, n: number): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}
