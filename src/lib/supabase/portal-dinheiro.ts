// A tela Dinheiro do portal v2 (178), lida pela sessão da família.
//
// Lado da cerimonialista: `portal_dinheiro` (verba do evento, a mesma que
// a equipe vê no Financeiro; nunca a assessoria). Lado "só de vocês":
// `familia_gasto` e `familia_orcamento`, que a RLS só abre para quem é
// cliente do evento. Os pedidos (ajuste, gasto enviado) as duas pontas
// leem.

import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type ParcelaDaCarol = {
  id: string;
  supplierId: string | null;
  descricao: string;
  valor: number;
  vencimento: string | null;
  pago: boolean;
  pagoEm: string | null;
  /** a Carol paga pelo caixa: a família não marca */
  peloCaixa: boolean;
  familiaNome: string | null;
  temComprovante: boolean;
  comprovante: { nome: string; url: string } | null;
};

export type FornecedorDaCarol = {
  /** supplier_id, ou "avulsa" para o que não tem fornecedor */
  id: string;
  nome: string;
  categoria: string | null;
  contratado: number | null;
  parcelas: ParcelaDaCarol[];
};

export type PedidoDeDinheiro = {
  id: string;
  tipo: "ajuste" | "gasto";
  supplierId: string | null;
  rotulo: string;
  texto: string | null;
  valor: number | null;
  pago: boolean;
  autor: string | null;
  estado: "aguardando" | "lancado" | "respondido";
  resposta: string | null;
  criadoEm: string;
};

export type GastoDaFamilia = {
  id: string;
  nome: string;
  categoria: string | null;
  valor: number;
  pago: boolean;
};

export type DinheiroDoPortal = {
  fornecedores: FornecedorDaCarol[];
  pedidos: PedidoDeDinheiro[];
  gastos: GastoDaFamilia[];
  orcamento: number | null;
};

type ParcelaBruta = {
  id: string;
  supplier_id: string | null;
  fornecedor: string | null;
  categoria: string | null;
  descricao: string | null;
  valor: number;
  vencimento: string | null;
  pago: boolean;
  pago_em: string | null;
  origem: string | null;
  familia_nome: string | null;
  tem_comprovante: boolean;
  comprovante_path: string | null;
  comprovante_nome: string | null;
};

type FornecedorBruto = {
  supplier_id: string;
  nome: string;
  categoria: string | null;
  contratado: number | null;
};

export const getDinheiroDoPortal = cache(async (eventId: string): Promise<DinheiroDoPortal> => {
  const supabase = createClient();
  const [dinRes, pedRes, gasRes, orcRes] = await Promise.all([
    supabase.rpc("portal_dinheiro", { p_event_id: eventId }),
    supabase
      .from("dinheiro_pedido")
      .select("id, tipo, supplier_id, rotulo, texto, valor, pago, autor_nome, estado, resposta, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase
      .from("familia_gasto")
      .select("id, nome, categoria, valor, pago")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabase.from("familia_orcamento").select("valor").eq("event_id", eventId).maybeSingle(),
  ]);

  const bruto = (dinRes.data ?? null) as { fornecedores: FornecedorBruto[]; parcelas: ParcelaBruta[] } | null;
  const parcelasBrutas = bruto?.parcelas ?? [];

  // o comprovante que a família subiu (pasta dela): link assinado por 1 h
  const caminhos = parcelasBrutas.map((p) => p.comprovante_path).filter((x): x is string => !!x);
  const urls = new Map<string, string>();
  if (caminhos.length) {
    const { data: assinadas } = await supabase.storage.from("comprovantes").createSignedUrls(caminhos, 60 * 60);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
  }

  const parcela = (p: ParcelaBruta): ParcelaDaCarol => ({
    id: p.id,
    supplierId: p.supplier_id,
    descricao: p.descricao?.trim() || "Parcela",
    valor: Number(p.valor),
    vencimento: p.vencimento ? p.vencimento.slice(0, 10) : null,
    pago: p.pago,
    pagoEm: p.pago && p.pago_em ? p.pago_em.slice(0, 10) : null,
    peloCaixa: p.origem === "caixa",
    familiaNome: p.familia_nome,
    temComprovante: p.tem_comprovante,
    comprovante:
      p.comprovante_path && urls.has(p.comprovante_path)
        ? { nome: p.comprovante_nome ?? "comprovante", url: urls.get(p.comprovante_path)! }
        : null,
  });

  // um cartão por fornecedor: os contratos e quem só tem parcela
  const porId = new Map<string, FornecedorDaCarol>();
  for (const f of bruto?.fornecedores ?? []) {
    porId.set(f.supplier_id, {
      id: f.supplier_id,
      nome: f.nome,
      categoria: f.categoria,
      contratado: f.contratado === null ? null : Number(f.contratado),
      parcelas: [],
    });
  }
  for (const p of parcelasBrutas) {
    const id = p.supplier_id ?? "avulsa";
    if (!porId.has(id)) {
      porId.set(id, {
        id,
        nome: p.supplier_id ? p.fornecedor ?? "Fornecedor" : "Outros gastos",
        categoria: p.supplier_id ? p.categoria : null,
        contratado: null,
        parcelas: [],
      });
    }
    porId.get(id)!.parcelas.push(parcela(p));
  }

  const fornecedores = [...porId.values()]
    // o que não tem valor nenhum ainda não é dinheiro na tela
    .filter((f) => f.parcelas.length > 0 || (f.contratado ?? 0) > 0)
    .sort((a, b) => (a.id === "avulsa" ? 1 : b.id === "avulsa" ? -1 : a.nome.localeCompare(b.nome, "pt-BR")));

  const pedidos: PedidoDeDinheiro[] = ((pedRes.data ?? []) as {
    id: string;
    tipo: "ajuste" | "gasto";
    supplier_id: string | null;
    rotulo: string;
    texto: string | null;
    valor: number | null;
    pago: boolean;
    autor_nome: string | null;
    estado: PedidoDeDinheiro["estado"];
    resposta: string | null;
    created_at: string;
  }[]).map((p) => ({
    id: p.id,
    tipo: p.tipo,
    supplierId: p.supplier_id,
    rotulo: p.rotulo,
    texto: p.texto,
    valor: p.valor === null ? null : Number(p.valor),
    pago: p.pago,
    autor: p.autor_nome,
    estado: p.estado,
    resposta: p.resposta,
    criadoEm: p.created_at,
  }));

  const gastos: GastoDaFamilia[] = ((gasRes.data ?? []) as {
    id: string;
    nome: string;
    categoria: string | null;
    valor: number;
    pago: boolean;
  }[]).map((g) => ({ ...g, valor: Number(g.valor) }));

  const orc = (orcRes.data as { valor: number | null } | null)?.valor;

  return {
    fornecedores,
    pedidos,
    gastos,
    orcamento: orc === null || orc === undefined ? null : Number(orc),
  };
});
