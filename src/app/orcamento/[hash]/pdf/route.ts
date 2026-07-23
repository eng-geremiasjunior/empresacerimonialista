// PDF público do orçamento (sem login) — o hash é a credencial, mesmo
// modelo do link público. É a versão estática da proposta: mesmas seções,
// mesma paleta do template escolhido pela empresa.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarPdfOrcamento, type ConteudoPdf } from "@/lib/gerar-pdf-orcamento";
import { resolverTema } from "@/lib/orcamento-temas";
import { IMAGEM_PADRAO } from "@/lib/landing-imagens";
import type { OrcamentoPublicoData } from "@/lib/orcamento-publico";
import type { Orcamento, OrcamentoItem } from "@/lib/orcamentos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGEM = 4 * 1024 * 1024;

// Converte a imagem em data URI. Devolve null em QUALQUER falha: uma
// imagem inacessível passada ao @react-pdf derruba o PDF inteiro, e é
// melhor entregar a proposta sem foto do que não entregar.
async function comoDataUri(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const tipo = r.headers.get("content-type") ?? "";
    if (!tipo.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGEM) return null;
    return `data:${tipo};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
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
  const origem = new URL(req.url).origin;
  const absoluta = (u: string) => (u.startsWith("http") ? u : `${origem}${u}`);

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

  const inst = d.institucional;
  const conteudo: ConteudoPdf | null = inst
    ? {
        sobreNos: inst.sobre_nos_texto,
        anosExperiencia: inst.stat_anos_experiencia,
        eventosRealizados: inst.stat_eventos_realizados,
        dedicacao: inst.stat_dedicacao_percentual,
        equipeTexto: inst.stat_equipe_texto,
        entradaPercentual: inst.condicao_entrada_percentual,
        parcelasMaximo: inst.condicao_parcelas_maximo,
        descontoAVista: inst.condicao_desconto_a_vista_percentual,
        prazoParcelas: inst.condicao_prazo_parcelas_texto,
        responsabilidades: inst.responsabilidades_dia_evento ?? [],
        posEvento: inst.pos_evento_cards ?? [],
        etapas: d.etapas ?? [],
        faq: d.faq ?? [],
      }
    : null;

  // Imagens em paralelo; cada uma cai para null se falhar.
  const [logo, hero, ...fotos] = await Promise.all([
    d.logo_url ? comoDataUri(absoluta(d.logo_url)) : Promise.resolve(null),
    comoDataUri(absoluta(d.hero_imagem_url || IMAGEM_PADRAO.hero)),
    ...(d.fotos ?? []).slice(0, 4).map((f) => comoDataUri(absoluta(f.url))),
  ]);

  const pdf = await gerarPdfOrcamento({
    orcamento,
    itens,
    empresa: { nome: d.nome_empresa, logo_url: logo },
    contatoEmpresa:
      [inst?.whatsapp_contato, inst?.email_contato].filter(Boolean).join(" · ") ||
      null,
    tema: resolverTema(d.template_orcamento),
    conteudo,
    heroImagem: hero,
    fotos: fotos.filter((f): f is string => Boolean(f)),
  });

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="proposta.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
