// Leitura do financeiro do evento. SÓ SERVIDOR (next/headers).
//
// Traduz o banco para o modelo que financeiro-core.ts entende. Nenhuma
// regra mora aqui: esta camada só busca e mapeia. Status, ordem, totais
// e alertas vêm do core.
//
// A categoria de verba é o OBJETIVO do Planejamento — a mesma que ela já
// usa para distribuir a verba lá. O vínculo objetivo→fornecedor sai do
// campo tipo 'fornecedor' da decisão de contratação, que já existe.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  CategoriaVerba,
  Lancamento,
  OrigemPagamento,
  TipoLancamento,
} from "@/lib/financeiro-core";
import { hojeBR } from "@/lib/tempo";

type Linha = Record<string, unknown>;

const COLUNAS = `id, event_id, type, value, due_date, paid, paid_at, description,
  category, supplier_id, conta, origem_pagamento, tipo_lancamento, objetivo_id,
  payment_method, installment_number, installment_total,
  comprovante_path, comprovante_nome, comprovante_dados,
  suppliers(name, cpf)`;

export type FinanceiroDoEvento = {
  lancamentos: Lancamento[];
  categorias: CategoriaVerba[];
  verbaTotal: number | null;
  contrato: { valor: number; parcelas: number; extras: number };
  saldoCaixa: { emMaos: number; recebidoDaCliente: number; compromissado30d: number };
  /** hoje calculado no SERVIDOR — o navegador pode estar em outro fuso */
  hoje: string;
};

function mapearLancamento(t: Linha, nomeCliente: string): Lancamento {
  const sup = t.suppliers as { name: string; cpf?: string | null } | null;
  const forn = sup?.name ?? null;
  const entrada = t.type === "receita";
  return {
    id: t.id as string,
    direcao: entrada ? "entrada" : "saida",
    // a categoria visível: o rótulo do objetivo quando houver, senão o
    // que o lançamento traz
    categoria: (t.categoria_nome as string) ?? rotuloCategoria(t.category as string),
    fornecedor: forn ?? (entrada ? nomeCliente : "—"),
    titulo: (t.description as string) ?? "Lançamento",
    valor: Number(t.value),
    vencimento: (t.due_date as string).slice(0, 10),
    pagoEm: t.paid ? ((t.paid_at as string) ?? (t.due_date as string)).slice(0, 10) : null,
    tipo: ((t.tipo_lancamento as string) ?? "parcela") as TipoLancamento,
    origem: ((t.origem_pagamento as string) ?? "cliente_direto") as OrigemPagamento,
    supplierId: (t.supplier_id as string) ?? null,
    objetivoId: (t.objetivo_id as string) ?? null,
    comprovante: t.comprovante_path
      ? {
          nome: (t.comprovante_nome as string) ?? "comprovante",
          path: t.comprovante_path as string,
        }
      : null,
    formaPagamento: (t.payment_method as string) ?? null,
    cnpj: sup?.cpf ?? null,
  };
}

const ROTULOS: Record<string, string> = {
  entrada: "Entrada",
  contrato: "Contrato",
  buffet: "Buffet",
  decoracao: "Decoração",
  fotografia: "Fotografia",
  som_dj: "Som e DJ",
  transporte: "Transporte",
  equipe: "Equipe",
  outro: "Outro",
};

const rotuloCategoria = (c: string | null) =>
  (c && ROTULOS[c]) || (c ? c.replace(/_/g, " ") : "Outro");

export const getFinanceiroDoEvento = cache(
  async (eventId: string): Promise<FinanceiroDoEvento> => {
    const supabase = createClient();
    const hoje = hojeBR();

    const [evRes, txRes, verbaRes, saldoRes, vinculoRes, objetivosRes] =
      await Promise.all([
      supabase
        .from("events")
        .select("verba_total, clients(name)")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select(COLUNAS)
        .eq("event_id", eventId)
        .order("due_date", { ascending: true }),
      supabase
        .from("evento_fornecedor_orcamento")
        .select("id, supplier_id, valor_alocado, valor_estimado_inicial, suppliers(name)")
        .eq("event_id", eventId),
      supabase.rpc("saldo_do_caixa_evento", { p_event_id: eventId }),
      // objetivo ↔ fornecedor: o campo tipo fornecedor da decisão de
      // contratação diz de que categoria aquele fornecedor é
      supabase
        .from("evento_campo_valor")
        .select("valor_supplier_id, evento_decisao(evento_objetivo(id, nome))")
        .eq("event_id", eventId)
        .not("valor_supplier_id", "is", null),
      // as categorias de verba: já vêm preenchidas pelo método
      supabase
        .from("evento_objetivo")
        .select("id, nome, valor_previsto, ordem, ativo")
        .eq("event_id", eventId)
        .order("ordem"),
    ]);

    const ev = evRes.data as Linha | null;
    const nomeCliente =
      (ev?.clients as { name: string } | null)?.name ?? "a cliente";

    // mapa fornecedor → categoria
    const categoriaDo = new Map<string, { id: string; nome: string }>();
    for (const v of (vinculoRes.data ?? []) as Linha[]) {
      const obj = (
        v.evento_decisao as { evento_objetivo: { id: string; nome: string } | null } | null
      )?.evento_objetivo;
      if (obj && v.valor_supplier_id) {
        categoriaDo.set(v.valor_supplier_id as string, obj);
      }
    }

    const brutos = (txRes.data ?? []) as unknown as Linha[];
    const lancamentos = brutos.map((t) => {
      const cat = t.supplier_id ? categoriaDo.get(t.supplier_id as string) : null;
      return mapearLancamento(
        { ...t, categoria_nome: cat?.nome ?? null },
        nomeCliente
      );
    });

    /*
     * Verba por categoria.
     *
     * A base são as CATEGORIAS do Planejamento (evento_objetivo), não os
     * fornecedores: elas já nascem preenchidas com o método e é nelas que
     * a verba foi distribuída. Montar a partir do fornecedor mostraria só
     * quem já foi fechado — e o buraco do orçamento é justamente o que
     * ainda não foi.
     *
     * Dentro de cada uma entram os fornecedores fechados, e o que sobrar
     * sem categoria vai para uma linha própria em vez de sumir.
     */
    const objetivos = ((objetivosRes.data ?? []) as Linha[]).filter(
      (o) => o.ativo !== false
    );
    const verbas = (verbaRes.data ?? []) as unknown as Linha[];

    const itensDaCategoria = (objetivoId: string | null) =>
      verbas
        .filter((v) => {
          const cat = categoriaDo.get(v.supplier_id as string);
          return objetivoId ? cat?.id === objetivoId : !cat;
        })
        .map((v) => ({
          id: v.id as string,
          nome: (v.suppliers as { name: string } | null)?.name ?? "Fornecedor",
          fornecedor: (v.suppliers as { name: string } | null)?.name ?? null,
          contratado: v.valor_alocado === null ? 0 : Number(v.valor_alocado),
          estimado:
            v.valor_estimado_inicial === null
              ? null
              : Number(v.valor_estimado_inicial),
        }));

    const lancamentosDaCategoria = (objetivoId: string | null) =>
      lancamentos.filter((l) => {
        if (l.direcao !== "saida") return false;
        // o lançamento diz a categoria dele, se souber; senão herda a do
        // fornecedor
        if (l.objetivoId) return l.objetivoId === objetivoId;
        const cat = l.supplierId ? categoriaDo.get(l.supplierId) : null;
        return objetivoId ? cat?.id === objetivoId : !cat;
      });

    const categorias: CategoriaVerba[] = objetivos.map((o) => ({
      id: o.id as string,
      nome: o.nome as string,
      previsto: o.valor_previsto === null ? 0 : Number(o.valor_previsto),
      itens: itensDaCategoria(o.id as string),
      lancamentos: lancamentosDaCategoria(o.id as string),
    }));

    // fornecedor ou gasto que ainda não pertence a categoria nenhuma
    const soltos = itensDaCategoria(null);
    const lancamentosSoltos = lancamentosDaCategoria(null);
    if (soltos.length > 0 || lancamentosSoltos.length > 0) {
      categorias.push({
        id: "sem-categoria",
        nome: "Sem categoria",
        previsto: 0,
        itens: soltos,
        lancamentos: lancamentosSoltos,
      });
    }

    // Contrato de assessoria: soma do que ela combinou receber.
    const entradas = lancamentos.filter(
      (l) => l.direcao === "entrada" && l.tipo !== "extra"
    );
    const extras = lancamentos
      .filter((l) => l.direcao === "entrada" && l.tipo === "extra")
      .reduce((t, l) => t + l.valor, 0);

    const saldo = (saldoRes.data ?? null) as {
      recebido_da_cliente: number;
      pago_do_caixa: number;
      compromissado_30d: number;
    } | null;

    return {
      lancamentos,
      categorias,
      verbaTotal: ev?.verba_total == null ? null : Number(ev.verba_total),
      contrato: {
        valor: entradas.reduce((t, l) => t + l.valor, 0),
        parcelas: entradas.length,
        extras,
      },
      saldoCaixa: {
        recebidoDaCliente: Number(saldo?.recebido_da_cliente ?? 0),
        emMaos:
          Number(saldo?.recebido_da_cliente ?? 0) - Number(saldo?.pago_do_caixa ?? 0),
        compromissado30d: Number(saldo?.compromissado_30d ?? 0),
      },
      hoje,
    };
  }
);

/** Os números do fechamento, para a tela de encerrar o evento. */
export const getNumerosDoFechamento = cache(async (eventId: string) => {
  const supabase = createClient();
  const { data } = await supabase.rpc("numeros_do_fechamento", {
    p_event_id: eventId,
  });
  return (data ?? null) as {
    verba_total: number | null;
    alocado: number;
    pago_fornecedores: number;
    a_pagar_fornecedores: number;
    receita_assessoria: number;
    a_receber_assessoria: number;
    custos_diretos: number;
    ja_fechado: boolean;
  } | null;
});

/** "Quanto esse fornecedor cobrou da última vez?" */// getHistoricoPreco saiu do código: ninguém a chamava. A RPC
// historico_preco_fornecedor continua no banco ("quanto ele cobrou da
// última vez", pronta) — quando alguma tela quiser o número, é só chamar.
