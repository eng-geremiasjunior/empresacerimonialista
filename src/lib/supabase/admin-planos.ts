import "server-only";

// Os preços, editados pelo dono (22/09/2026).
//
// Preço e tetos já eram DADO desde a 147 (`plano_catalogo`) e a escada de
// lançamento desde a 153 (`plano_promocao`) — a página de vendas, a tela
// de assinatura e a cobrança leem de lá em tempo real. O que faltava era
// a mão: mudar o preço exigia um UPDATE à mão no banco. Isto aqui é essa
// mão, com as travas do resto do painel. A auditoria não é feita aqui:
// o gatilho trg_registrar_preco (123) já grava antes e depois das duas
// tabelas, inclusive de quem mexer direto no SQL.
//
// O QUE UMA MUDANÇA DE PREÇO ALCANÇA: quem assinar DAQUI PARA FRENTE.
// Quem já assina continua com o valor gravado na assinatura dela e na
// operadora — de propósito: preço combinado é contrato, e subir o preço
// de quem já está dentro por um UPDATE seria o pior defeito possível.

import { exigirSuperAdmin, servico, tabelaAusente } from "@/lib/supabase/admin-painel";
import { ehCodigoDoPlano } from "@/lib/planos";

export type PlanoEditavel = {
  codigo: string;
  nome: string;
  valorMensal: number;
  eventosEmAndamento: number | null;
  logins: number | null;
  ordem: number;
  ativo: boolean;
};

export type DegrauEditavel = {
  codigo: string;
  ordem: number;
  valorMensal: number;
  meses: number;
  ativo: boolean;
};

/** O teto de sanidade do preço: acima disto só pode ser dedo escorregado. */
export const VALOR_MAXIMO = 9999;

const FALTA_A_147 = "Reaplique a migração 147 no Supabase para editar os planos.";

/* ------------------------------------------------------------------ */
/* leitura                                                             */
/* ------------------------------------------------------------------ */

/** Todos os planos, inclusive os desligados — é o dono que edita. */
export async function getPlanosParaEditar(): Promise<PlanoEditavel[]> {
  await exigirSuperAdmin();
  const { data, error } = await servico()
    .from("plano_catalogo")
    .select("codigo, nome, valor_mensal, eventos_em_andamento, logins, ordem, ativo")
    .order("ordem", { ascending: true });
  if (error) {
    if (tabelaAusente(error)) return [];
    throw new Error(`Não foi possível ler os planos: ${error.message}`);
  }
  return (data ?? []).map((l) => ({
    codigo: String(l.codigo),
    nome: String(l.nome),
    valorMensal: Number(l.valor_mensal),
    eventosEmAndamento: l.eventos_em_andamento as number | null,
    logins: l.logins as number | null,
    ordem: Number(l.ordem),
    ativo: Boolean(l.ativo),
  }));
}

/** Os degraus da escada, inclusive os desligados. */
export async function getDegrausParaEditar(): Promise<DegrauEditavel[]> {
  await exigirSuperAdmin();
  const { data, error } = await servico()
    .from("plano_promocao")
    .select("codigo, ordem, valor_mensal, meses, ativo")
    .order("codigo", { ascending: true })
    .order("ordem", { ascending: true });
  if (error) {
    if (tabelaAusente(error)) return [];
    throw new Error(`Não foi possível ler a promoção: ${error.message}`);
  }
  return (data ?? []).map((l) => ({
    codigo: String(l.codigo),
    ordem: Number(l.ordem),
    valorMensal: Number(l.valor_mensal),
    meses: Number(l.meses),
    ativo: Boolean(l.ativo),
  }));
}

/* ------------------------------------------------------------------ */
/* escrita                                                             */
/* ------------------------------------------------------------------ */

function conferirValor(valor: number, nome = "O preço"): void {
  if (!Number.isFinite(valor) || valor < 0) throw new Error(`${nome} não pode ser negativo.`);
  if (valor > VALOR_MAXIMO) throw new Error(`${nome} passa de R$ ${VALOR_MAXIMO}. Confira o que digitou.`);
}

function conferirTeto(v: number | null, nome: string): void {
  if (v === null) return;
  if (!Number.isInteger(v) || v < 1) throw new Error(`${nome}: use um número inteiro a partir de 1, ou deixe vazio para sem limite.`);
}

export async function salvarPlanoDb(
  codigo: string,
  dados: { nome: string; valorMensal: number; eventosEmAndamento: number | null; logins: number | null; ativo: boolean }
): Promise<void> {
  await exigirSuperAdmin();
  if (!ehCodigoDoPlano(codigo)) throw new Error("Plano desconhecido.");
  const nome = dados.nome.trim().slice(0, 40);
  if (!nome) throw new Error("O plano precisa de um nome.");
  conferirValor(dados.valorMensal);
  conferirTeto(dados.eventosEmAndamento, "Eventos em andamento");
  conferirTeto(dados.logins, "Logins");

  const db = servico();
  const { error } = await db
    .from("plano_catalogo")
    .update({
      nome,
      valor_mensal: dados.valorMensal,
      eventos_em_andamento: dados.eventosEmAndamento,
      logins: dados.logins,
      ativo: dados.ativo,
      updated_at: new Date().toISOString(),
    })
    .eq("codigo", codigo);
  if (error) throw new Error(tabelaAusente(error) ? FALTA_A_147 : `Não foi possível salvar: ${error.message}`);

}

export async function salvarDegrauDb(
  codigo: string,
  ordem: number,
  dados: { valorMensal: number; meses: number; ativo: boolean }
): Promise<void> {
  await exigirSuperAdmin();
  // o banco recusa degrau de R$ 0,00 (153): promoção é preço, não conta
  // gratuita — e a operadora não cobra zero
  if (!(dados.valorMensal > 0)) throw new Error("O degrau precisa de um valor maior que zero.");
  conferirValor(dados.valorMensal, "O valor do degrau");
  if (!Number.isInteger(dados.meses) || dados.meses < 1) throw new Error("Os meses do degrau começam em 1.");

  const db = servico();
  const { error } = await db
    .from("plano_promocao")
    .update({ valor_mensal: dados.valorMensal, meses: dados.meses, ativo: dados.ativo })
    .eq("codigo", codigo)
    .eq("ordem", ordem);
  if (error) throw new Error(`Não foi possível salvar o degrau: ${error.message}`);

}

/**
 * Quantas contas pagam hoje o preço antigo — o número que ele precisa ver
 * ANTES de mudar: elas não mudam de valor, e é isso que a tela avisa.
 */
export async function getQuantasAssinam(): Promise<number> {
  await exigirSuperAdmin();
  const { count } = await servico()
    .from("assinaturas")
    .select("id", { count: "exact", head: true })
    .in("status", ["ativa", "inadimplente"]);
  return count ?? 0;
}
