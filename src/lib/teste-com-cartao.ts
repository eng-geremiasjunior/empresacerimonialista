// O teste de sete dias COM CARTÃO (decisão do dono, 21/09/2026).
//
// O cartão entra no cadastro e é conferido sem cobrar; a assinatura fica
// agendada na operadora para o dia seguinte ao fim do teste, e só nesse
// dia sai a primeira cobrança. Quem cancela antes não paga nada.
//
// Este módulo é a régua ÚNICA dos números: o que a tela do cadastro
// escreve ("primeira cobrança em 28 de setembro, R$ 27,90") é o que a
// action agenda na operadora, calculado pela mesma função, no mesmo
// instante. Preço anunciado e preço cobrado não podem divergir — é disso
// que nasce contestação de cartão.
//
// Nenhum número vive aqui: o plano vem do catálogo (147) e o primeiro
// degrau, da escada da promoção (153), pela mesma régua do checkout.

import "server-only";

import {
  comTetoDoPlano,
  getCatalogoDePlanos,
  getEscadaDaPromocao,
  PLANO_DA_PROMOCAO,
  PROMOCAO_LANCAMENTO,
  reais,
  type EscadaDaPromocao,
  type PlanoDoCatalogo,
} from "@/lib/planos";
import { fimDoTeste } from "@/lib/supabase/teste-gratis";
import { somarDias } from "@/lib/tempo";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "28 de setembro" */
export function dataLongaBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}` : iso;
}

export type OfertaDoTeste = {
  dias: number;
  /** o último dia do teste, inclusive */
  termina: string;
  /** o dia da primeira cobrança: o seguinte ao fim do teste */
  comecaEm: string;
  plano: PlanoDoCatalogo;
  /** o que sai na primeira cobrança (o primeiro degrau, quando desconta) */
  valorPrimeiro: number;
  naPromocao: boolean;
  escada: EscadaDaPromocao | null;
  /** já em palavras, para a tela e para o e-mail */
  texto: {
    comecaEm: string;
    termina: string;
    /** "R$ 27,90/mês nos 3 primeiros meses, depois R$ 59,90" ou "R$ 59,90/mês" */
    preco: string;
    primeiraCobranca: string;
  };
};

/**
 * A oferta de quem se cadastra AGORA: em que dia a cobrança começa e por
 * quanto. `null` só quando o catálogo está vazio — aí não há o que agendar.
 */
export async function ofertaDoTeste(dias: number, agora = new Date()): Promise<OfertaDoTeste | null> {
  const planos = await getCatalogoDePlanos();
  const plano =
    planos.find((p) => p.codigo === PLANO_DA_PROMOCAO) ??
    [...planos].sort((a, b) => a.valorMensal - b.valorMensal)[0] ??
    null;
  if (!plano || plano.valorMensal <= 0) return null;

  const escada =
    plano.codigo === PLANO_DA_PROMOCAO ? await getEscadaDaPromocao(PROMOCAO_LANCAMENTO) : null;
  const primeiro = escada?.degraus[0] ?? null;
  const valorDoDegrau = primeiro ? comTetoDoPlano(primeiro.valorMensal, plano.valorMensal) : null;
  // a mesma régua do checkout: degrau que não desconta (ou que zera) não é promoção
  const naPromocao =
    valorDoDegrau !== null && valorDoDegrau > 0 && valorDoDegrau < plano.valorMensal;
  const valorPrimeiro = naPromocao ? (valorDoDegrau as number) : plano.valorMensal;

  const termina = fimDoTeste(dias, agora);
  const comecaEm = somarDias(termina, 1);

  const meses = primeiro?.meses ?? 0;
  const preco = naPromocao
    ? `${reais(valorPrimeiro)}/mês ${meses === 1 ? "no primeiro mês" : `nos ${meses} primeiros meses`}, depois ${reais(plano.valorMensal)}`
    : `${reais(plano.valorMensal)}/mês`;

  return {
    dias,
    termina,
    comecaEm,
    plano,
    valorPrimeiro,
    naPromocao,
    escada: naPromocao ? escada : null,
    texto: {
      comecaEm: dataLongaBR(comecaEm),
      termina: dataLongaBR(termina),
      preco,
      primeiraCobranca: reais(valorPrimeiro),
    },
  };
}
