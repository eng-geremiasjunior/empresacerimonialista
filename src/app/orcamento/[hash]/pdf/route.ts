// PDF público do orçamento (sem login) — o hash é a credencial, mesmo
// modelo do link público. Usa a MESMA função de geração da Etapa 4.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarPdfOrcamento } from "@/lib/gerar-pdf-orcamento";
import type { OrcamentoPublicoData } from "@/lib/orcamento-publico";
import type { Orcamento, OrcamentoItem } from "@/lib/orcamentos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { hash: string } }
) {
  const supabase = createClient();

  // Só a RPC pública — nada da tabela é exposto por outro caminho.
  const { data } = await supabase.rpc("consultar_orcamento_publico", {
    p_hash: params.hash,
  });

  if (!data) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  const d = data as unknown as OrcamentoPublicoData;

  // Adapta o shape público ao esperado pelo gerador.
  const orcamento = {
    contato_nome: d.nome_contato,
    tipo_evento: d.tipo_evento,
    data_evento: d.data_evento,
    local_evento: d.local_evento,
    cidade_evento: d.cidade_evento,
    numero_convidados: d.numero_convidados,
    valor_total: d.valor_total,
    data_criacao: d.data_criacao,
    data_validade: d.data_validade,
    validade_dias: d.validade_dias,
  } as unknown as Orcamento;

  const itens = d.itens.map((i, idx) => ({
    id: `pub-${idx}`,
    nome: i.nome,
    descricao: i.descricao,
    tipo_calculo: i.tipo_calculo,
    valor_unitario: i.valor_unitario,
    quantidade_convidados_aplicada: i.quantidade_convidados,
    taxa_fixa: i.taxa_fixa ?? 0,
    valor_calculado: i.valor,
    ordem: idx,
  })) as unknown as OrcamentoItem[];

  const pdf = await gerarPdfOrcamento({
    orcamento,
    itens,
    empresa: { nome: d.nome_empresa, logo_url: d.logo_url },
    contatoEmpresa: null,
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="orcamento.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
