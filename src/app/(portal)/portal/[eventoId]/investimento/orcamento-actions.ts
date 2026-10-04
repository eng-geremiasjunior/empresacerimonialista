"use server";

// O Orçamento da noiva que abriu a conta sozinha (04/10/2026): definir
// quanto querem gastar, lançar um gasto, marcar um pagamento como feito
// (ou desfazer) e apagar um gasto. As escritas são as do Financeiro da
// cerimonialista — salvarVerbaTotal, salvarContratoFornecedor,
// lancarNaVerba, gerarParcelasDoFornecedor —, nas mesmas tabelas: se ela
// convidar uma cerimonialista, o dinheiro passa junto com o evento.
//
// Só a dona da conta de família (donaDaFesta); a RLS (pode_editar_evento)
// confere de novo em cada escrita.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";
import { salvarVerbaTotal } from "@/app/(app)/eventos/[id]/financeiro/lancamento-actions";
import {
  gerarParcelasDoFornecedor,
  lancarNaVerba,
  salvarContratoFornecedor,
} from "@/app/(app)/eventos/[id]/financeiro/tela-actions";
import { hojeBR } from "@/lib/tempo";

type Retorno = { ok: true } | { error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const TETO = 10_000_000;

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/investimento`);
  revalidatePath(`/portal/${eventoId}`);
}

async function guarda(eventoId: string): Promise<{ empresaId: string } | { error: string }> {
  if (!UUID.test(eventoId)) return { error: "Pedido inválido." };
  const dona = await donaDaFesta(eventoId);
  return dona ?? { error: "Só quem abriu a conta mexe no orçamento." };
}

const valorOk = (v: number) => Number.isFinite(v) && v > 0 && v <= TETO;

export async function salvarOrcamentoDaNoiva(eventoId: string, valor: number | null): Promise<Retorno> {
  const g = await guarda(eventoId);
  if ("error" in g) return g;
  if (valor !== null && !valorOk(valor)) return { error: "Confira o valor." };
  const r = await salvarVerbaTotal(eventoId, valor);
  if ("error" in r) return { error: "Não foi possível salvar agora. Tente de novo." };
  revalidar(eventoId);
  return { ok: true };
}

export type NovoGasto = {
  /** "Buffet", "Vestido" */
  oQue: string;
  /** "" = sem fornecedor (só à vista) */
  fornecedor: string;
  objetivoId: string | null;
  valor: number;
  modo: "avista" | "parcelado";
  /** à vista: a data do pagamento; parcelado: a da 1ª parcela */
  data: string;
  /** à vista: já foi pago */
  jaPago: boolean;
  /** parcelado: a entrada, paga hoje (0 = sem entrada) */
  entrada: number;
  /** parcelado: em quantas vezes o resto */
  vezes: number;
  /**
   * "somar": o valor entra no contrato do fornecedor (gasto novo).
   * "manter": só os pagamentos de um contrato que já existe (o que veio do
   * planejamento com valor e sem data de pagamento).
   */
  contrato: "somar" | "manter";
};

export async function lancarGastoDaNoiva(eventoId: string, g: NovoGasto): Promise<Retorno> {
  const dona = await guarda(eventoId);
  if ("error" in dona) return dona;

  const oQue = g.oQue.trim().slice(0, 80);
  const fornecedor = g.fornecedor.trim().slice(0, 80);
  const hoje = hojeBR();
  if (!oQue) return { error: "Diga o que é o gasto." };
  if (!valorOk(g.valor)) return { error: "Confira o valor." };
  if (!DATA.test(g.data)) return { error: "Confira a data." };
  if (g.objetivoId !== null && !UUID.test(g.objetivoId)) return { error: "Pedido inválido." };
  if (g.modo === "avista" && g.jaPago && g.data > hoje) {
    return { error: "Pagamento feito não pode ter data depois de hoje." };
  }
  if (g.modo === "parcelado") {
    if (!fornecedor) return { error: "No parcelado, diga com quem é (a loja ou o fornecedor)." };
    if (!Number.isInteger(g.vezes) || g.vezes < 1 || g.vezes > 24) return { error: "Parcele de 1 a 24 vezes." };
    if (!Number.isFinite(g.entrada) || g.entrada < 0 || g.entrada >= g.valor) {
      return { error: "A entrada precisa ser menor que o total." };
    }
  }

  const supabase = createClient();
  // o assunto precisa ser deste evento
  if (g.objetivoId) {
    const { data: obj } = await supabase
      .from("evento_objetivo")
      .select("id")
      .eq("id", g.objetivoId)
      .eq("event_id", eventoId)
      .maybeSingle();
    if (!obj) return { error: "Pedido inválido." };
  }

  let supplierId: string | null = null;
  if (fornecedor) {
    // o mesmo nome é o mesmo fornecedor: sem cadastro em dobro
    const padrao = fornecedor.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data: achados } = await supabase
      .from("suppliers")
      .select("id")
      .eq("empresa_id", dona.empresaId)
      .ilike("name", padrao)
      .limit(1);
    supplierId = (achados?.[0] as { id: string } | undefined)?.id ?? null;

    if (g.contrato === "somar") {
      const { data: atual } = supplierId
        ? await supabase
            .from("evento_fornecedor_orcamento")
            .select("valor_alocado")
            .eq("event_id", eventoId)
            .eq("supplier_id", supplierId)
            .maybeSingle()
        : { data: null };
      const antes = Number((atual as { valor_alocado: number | null } | null)?.valor_alocado ?? 0);
      const c = await salvarContratoFornecedor(eventoId, {
        supplierId,
        nome: fornecedor,
        objetivoId: g.objetivoId,
        valor: Number((antes + g.valor).toFixed(2)),
        assinadoEm: hoje,
      });
      if ("error" in c || !c.id) return { error: "Não foi possível salvar agora. Tente de novo." };
      supplierId = c.id;
    } else if (!supplierId) {
      return { error: "Não encontramos esse fornecedor." };
    }
  }

  const base = {
    supplierId,
    objetivoId: g.objetivoId,
    // a noiva paga direto ao fornecedor: não passa por caixa de ninguém
    doCaixa: false,
  };
  if (g.modo === "avista") {
    const r = await lancarNaVerba(eventoId, { ...base, descricao: oQue, valor: g.valor, vencimento: g.data, jaPaga: g.jaPago });
    if ("error" in r) return { error: "Não foi possível salvar agora. Tente de novo." };
  } else {
    if (g.entrada > 0) {
      const r = await lancarNaVerba(eventoId, {
        ...base,
        descricao: `Entrada · ${oQue}`,
        valor: g.entrada,
        vencimento: hoje,
        jaPaga: true,
      });
      if ("error" in r) return { error: "Não foi possível salvar agora. Tente de novo." };
    }
    const r = await gerarParcelasDoFornecedor(eventoId, {
      supplierId: supplierId!,
      objetivoId: g.objetivoId,
      restante: Number((g.valor - g.entrada).toFixed(2)),
      quantidade: g.vezes,
      primeiroVencimento: g.data,
      nomeBase: oQue,
      jaLancadas: 0,
      doCaixa: false,
    });
    if ("error" in r) return { error: "Não foi possível salvar as parcelas. Tente de novo." };
  }

  revalidar(eventoId);
  return { ok: true };
}

/** Um toque: pago hoje, no valor todo. */
export async function marcarPagoDaNoiva(eventoId: string, transacaoId: string): Promise<Retorno> {
  const g = await guarda(eventoId);
  if ("error" in g) return g;
  if (!UUID.test(transacaoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({ paid: true, paid_at: hojeBR() })
    .eq("id", transacaoId)
    .eq("event_id", eventoId)
    .eq("conta", "fornecedor")
    .eq("type", "despesa")
    .eq("paid", false)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível marcar agora. Tente de novo." };
  revalidar(eventoId);
  return { ok: true };
}

export async function desfazerPagoDaNoiva(eventoId: string, transacaoId: string): Promise<Retorno> {
  const g = await guarda(eventoId);
  if ("error" in g) return g;
  if (!UUID.test(transacaoId)) return { error: "Pedido inválido." };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({ paid: false, paid_at: null, payment_method: null })
    .eq("id", transacaoId)
    .eq("event_id", eventoId)
    .eq("conta", "fornecedor")
    .eq("type", "despesa")
    .eq("paid", true)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível desfazer agora. Tente de novo." };
  revalidar(eventoId);
  return { ok: true };
}

/**
 * Apagar um gasto lançado por engano: o do fornecedor leva o contrato e
 * todos os pagamentos dele neste evento (o fornecedor fica no cadastro);
 * o sem fornecedor é um lançamento só. O histórico financeiro (167) guarda
 * o rastro pelo gatilho.
 */
export async function apagarGastoDaNoiva(
  eventoId: string,
  alvo: { tipo: "fornecedor" | "avulso"; chave: string }
): Promise<Retorno> {
  const g = await guarda(eventoId);
  if ("error" in g) return g;
  if (!UUID.test(alvo.chave)) return { error: "Pedido inválido." };
  const supabase = createClient();
  if (alvo.tipo === "avulso") {
    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", alvo.chave)
      .eq("event_id", eventoId)
      .eq("conta", "fornecedor")
      .is("supplier_id", null)
      .select("id");
    if (error || !data?.length) return { error: "Não foi possível apagar agora. Tente de novo." };
  } else {
    const { error: e1 } = await supabase
      .from("transactions")
      .delete()
      .eq("event_id", eventoId)
      .eq("conta", "fornecedor")
      .eq("supplier_id", alvo.chave);
    const { error: e2 } = await supabase
      .from("evento_fornecedor_orcamento")
      .delete()
      .eq("event_id", eventoId)
      .eq("supplier_id", alvo.chave);
    if (e1 || e2) return { error: "Não foi possível apagar agora. Tente de novo." };
  }
  revalidar(eventoId);
  return { ok: true };
}
