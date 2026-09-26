// Leitura do financeiro do evento. SÓ SERVIDOR (next/headers).
//
// Traduz o banco para o modelo que financeiro-core.ts e financeiro-tela.ts
// entendem. Nenhuma regra mora aqui: esta camada só busca e mapeia.
// Status, ordem, totais e alertas vêm dos módulos puros.
//
// A categoria de verba é o OBJETIVO do Planejamento — a mesma que ela já
// usa para distribuir a verba lá. O contrato do fornecedor pode dizer a
// categoria dele direto (167); quando não diz, ela ainda é deduzida do
// campo tipo 'fornecedor' da decisão de contratação, como antes.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  CategoriaVerba,
  Lancamento,
  OrigemPagamento,
  TipoLancamento,
} from "@/lib/financeiro-core";
import type {
  ContratoFornecedor,
  RegistroFinanceiro,
} from "@/lib/financeiro-tela";
import { hojeBR } from "@/lib/tempo";

type Linha = Record<string, unknown>;

const COLUNAS = `id, event_id, type, value, due_date, paid, paid_at, description,
  category, supplier_id, conta, origem_pagamento, tipo_lancamento, objetivo_id,
  payment_method, installment_number, installment_total,
  comprovante_path, comprovante_nome, comprovante_dados,
  suppliers(name, cpf)`;

/** + quem da família marcou como pago pelo portal (178) */
const COLUNAS_178 = `${COLUNAS}, pago_pela_familia_nome`;

/** Coluna ou tabela que a migração 167 traz e o banco ainda não tem. */
const AUSENTE = new Set(["42703", "42P01", "PGRST204", "PGRST205"]);
const faltaMigracao = (erro: { code?: string } | null) =>
  Boolean(erro?.code && AUSENTE.has(erro.code));

export type FinanceiroDoEvento = {
  lancamentos: Lancamento[];
  categorias: CategoriaVerba[];
  /** as categorias de verba do Planejamento, com o previsto de cada uma */
  objetivos: { id: string; nome: string; previsto: number }[];
  /** o contrato fechado com cada fornecedor */
  contratos: ContratoFornecedor[];
  verbaTotal: number | null;
  contrato: { valor: number; parcelas: number; extras: number };
  /** o contrato de assessoria: o que ela cobra da cliente */
  assessoria: { contrato: number | null; assinadoEm: string | null };
  saldoCaixa: { emMaos: number; recebidoDaCliente: number; compromissado30d: number };
  /** o histórico de lançamentos (167) — vazio enquanto a migração não rodou */
  registros: RegistroFinanceiro[];
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
    // de que dinheiro é: a verba do evento ou a receita dela
    conta: t.conta === "fornecedor" ? "verba" : "assessoria",
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
    pagoPelaFamilia: t.paid ? ((t.pago_pela_familia_nome as string) ?? null) : null,
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

/**
 * Os contratos por fornecedor. Tenta com as colunas da 167 e, se elas
 * ainda não existem, repete sem — a tela continua de pé antes de você
 * aplicar a migração, só sem data de assinatura e sem categoria própria.
 */
async function lerTransacoes(
  supabase: ReturnType<typeof createClient>,
  eventId: string
) {
  const novo = await supabase
    .from("transactions")
    .select(COLUNAS_178)
    .eq("event_id", eventId)
    .order("due_date", { ascending: true });
  if (!novo.error || !faltaMigracao(novo.error)) return novo;
  return supabase
    .from("transactions")
    .select(COLUNAS)
    .eq("event_id", eventId)
    .order("due_date", { ascending: true });
}

async function lerContratos(
  supabase: ReturnType<typeof createClient>,
  eventId: string
): Promise<Linha[]> {
  const comNovas = await supabase
    .from("evento_fornecedor_orcamento")
    .select(
      "id, supplier_id, valor_alocado, valor_estimado_inicial, assinado_em, objetivo_id, suppliers(name)"
    )
    .eq("event_id", eventId);
  if (!comNovas.error) return (comNovas.data ?? []) as unknown as Linha[];
  if (!faltaMigracao(comNovas.error)) return [];

  const antigo = await supabase
    .from("evento_fornecedor_orcamento")
    .select("id, supplier_id, valor_alocado, valor_estimado_inicial, suppliers(name)")
    .eq("event_id", eventId);
  return (antigo.data ?? []) as unknown as Linha[];
}

async function lerEvento(
  supabase: ReturnType<typeof createClient>,
  eventId: string
): Promise<Linha | null> {
  const completo = await supabase
    .from("events")
    .select("verba_total, contract_value, contrato_assinado_em, clients(name)")
    .eq("id", eventId)
    .maybeSingle();
  if (!completo.error) return completo.data as Linha | null;
  if (!faltaMigracao(completo.error)) return null;

  const basico = await supabase
    .from("events")
    .select("verba_total, contract_value, clients(name)")
    .eq("id", eventId)
    .maybeSingle();
  return basico.data as Linha | null;
}

async function lerRegistros(
  supabase: ReturnType<typeof createClient>,
  eventId: string
): Promise<RegistroFinanceiro[]> {
  const { data, error } = await supabase
    .from("evento_financeiro_registro")
    .select("id, em, autor, tipo, texto, detalhe, transaction_id")
    .eq("event_id", eventId)
    .order("em", { ascending: false })
    .limit(80);
  // sem a 167 aplicada, o histórico simplesmente não existe ainda
  if (error) return [];
  return ((data ?? []) as Linha[]).map((r) => ({
    id: r.id as string,
    em: r.em as string,
    autor: (r.autor as string) ?? "Equipe",
    tipo: (r.tipo as string) ?? "lancamento",
    texto: (r.texto as string) ?? "",
    detalhe: (r.detalhe as string) ?? null,
    transactionId: (r.transaction_id as string) ?? null,
  }));
}

export const getFinanceiroDoEvento = cache(
  async (eventId: string): Promise<FinanceiroDoEvento> => {
    const supabase = createClient();
    const hoje = hojeBR();

    const [ev, txRes, contratosBrutos, saldoRes, vinculoRes, objetivosRes, registros] =
      await Promise.all([
        lerEvento(supabase, eventId),
        lerTransacoes(supabase, eventId),
        lerContratos(supabase, eventId),
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
        lerRegistros(supabase, eventId),
      ]);

    const nomeCliente =
      (ev?.clients as { name: string } | null)?.name ?? "a cliente";

    const objetivos = ((objetivosRes.data ?? []) as Linha[]).filter(
      (o) => o.ativo !== false
    );
    const nomeDoObjetivo = new Map<string, string>(
      objetivos.map((o) => [o.id as string, o.nome as string])
    );

    // mapa fornecedor → categoria, deduzido do Planejamento
    const categoriaDo = new Map<string, { id: string; nome: string }>();
    for (const v of (vinculoRes.data ?? []) as Linha[]) {
      const obj = (
        v.evento_decisao as { evento_objetivo: { id: string; nome: string } | null } | null
      )?.evento_objetivo;
      if (obj && v.valor_supplier_id) {
        categoriaDo.set(v.valor_supplier_id as string, obj);
      }
    }
    // o que o contrato diz vale mais que a dedução
    for (const c of contratosBrutos) {
      const objetivoId = (c.objetivo_id as string) ?? null;
      if (objetivoId && c.supplier_id && nomeDoObjetivo.has(objetivoId)) {
        categoriaDo.set(c.supplier_id as string, {
          id: objetivoId,
          nome: nomeDoObjetivo.get(objetivoId)!,
        });
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

    const contratos: ContratoFornecedor[] = contratosBrutos.map((c) => {
      const cat = categoriaDo.get(c.supplier_id as string) ?? null;
      return {
        id: c.id as string,
        supplierId: c.supplier_id as string,
        fornecedor: (c.suppliers as { name: string } | null)?.name ?? "Fornecedor",
        categoria: cat?.nome ?? null,
        objetivoId: cat?.id ?? null,
        // null = veio do Planejamento sem contrato fechado (083); não
        // vira 0 para não inventar economia
        valor: c.valor_alocado === null ? null : Number(c.valor_alocado),
        assinadoEm: (c.assinado_em as string) ?? null,
      };
    });

    /*
     * Verba por categoria.
     *
     * A base são as CATEGORIAS do Planejamento (evento_objetivo), não os
     * fornecedores: elas já nascem preenchidas com o método e é nelas que
     * a verba foi distribuída. Montar a partir do fornecedor mostraria só
     * quem já foi fechado — e o buraco do orçamento é justamente o que
     * ainda não foi.
     */
    const itensDaCategoria = (objetivoId: string | null) =>
      contratos
        .filter((c) =>
          objetivoId ? c.objetivoId === objetivoId : c.objetivoId == null
        )
        .map((c) => ({
          id: c.id,
          nome: c.fornecedor,
          fornecedor: c.fornecedor,
          contratado: c.valor ?? 0,
          estimado: null,
        }));

    const lancamentosDaCategoria = (objetivoId: string | null) =>
      lancamentos.filter((l) => {
        if (l.direcao !== "saida") return false;
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

    // Contrato de assessoria: o que ela combinou receber.
    const entradas = lancamentos.filter(
      (l) => l.conta === "assessoria" && l.direcao === "entrada" && l.tipo !== "extra"
    );
    const extras = lancamentos
      .filter(
        (l) => l.conta === "assessoria" && l.direcao === "entrada" && l.tipo === "extra"
      )
      .reduce((t, l) => t + l.valor, 0);

    const saldo = (saldoRes.data ?? null) as {
      recebido_da_cliente: number;
      pago_do_caixa: number;
      compromissado_30d: number;
    } | null;

    return {
      lancamentos,
      categorias,
      objetivos: objetivos.map((o) => ({
        id: o.id as string,
        nome: o.nome as string,
        previsto: o.valor_previsto === null ? 0 : Number(o.valor_previsto),
      })),
      contratos,
      verbaTotal: ev?.verba_total == null ? null : Number(ev.verba_total),
      contrato: {
        valor: entradas.reduce((t, l) => t + l.valor, 0),
        parcelas: entradas.length,
        extras,
      },
      assessoria: {
        contrato: ev?.contract_value == null ? null : Number(ev.contract_value),
        assinadoEm: (ev?.contrato_assinado_em as string) ?? null,
      },
      saldoCaixa: {
        recebidoDaCliente: Number(saldo?.recebido_da_cliente ?? 0),
        emMaos:
          Number(saldo?.recebido_da_cliente ?? 0) - Number(saldo?.pago_do_caixa ?? 0),
        compromissado30d: Number(saldo?.compromissado_30d ?? 0),
      },
      registros,
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
