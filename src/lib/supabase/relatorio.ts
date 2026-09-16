import "server-only";

// A leitura do relatório da Gestão comercial. Pela sessão: a RLS entrega
// à dona e à coordenadora todas as propostas, os pedidos e o contador da
// vitrine da empresa (a tela recusa os outros cargos antes de chegar aqui).
//
// Só as colunas que a conta usa. Do aceite, valor e data: a assinatura, o
// IP e o nome de quem assinou não saem do banco para esta tela.
//
// A janela: toda proposta cuja validade termina depois de `desde`. Envio,
// abertura, aceite e recusa acontecem dentro da validade (que é a data de
// criação mais no máximo 90 dias), então a validade é a ponta que cobre
// tudo — e as propostas em aberto hoje entram por definição.

import { createClient } from "@/lib/supabase/server";
import type {
  AceiteDoRelatorio,
  ComentarioDoRelatorio,
  DadosDoRelatorio,
  MetricaDoRelatorio,
  PedidoDoRelatorio,
  PropostaDoRelatorio,
} from "@/lib/comercial/relatorio";

/** Teto por consulta. Passou disso, a tela avisa em vez de somar calada. */
const LIMITE = 1000;

const COLUNAS_PROPOSTA =
  "id, contato_nome, tipo_evento, data_evento, valor_total, status, data_criacao, data_validade, enviado_em, respondido_em, recusado_em, motivo_recusa, visitas, ultima_visita_em, evento_gerado_id, pedido_id";

const COLUNAS_PEDIDO =
  "id, nome, tipo_evento, data_evento, status, canal, origem_acesso, utm_campaign, orcamento_id, created_at, respondido_em, encerrado_em, motivo_encerramento";

export async function lerDadosDoRelatorio(
  desde: string,
  periodo: { inicio: string; fim: string }
): Promise<{ dados: DadosDoRelatorio; falhou: boolean; incompleto: boolean }> {
  const supabase = createClient();
  // meia-noite de Brasília do primeiro dia da janela
  const desdeInstante = `${desde}T00:00:00-03:00`;

  const [propostas, aceites, comentarios, pedidos, metricas] = await Promise.all([
    supabase
      .from("orcamentos")
      .select(COLUNAS_PROPOSTA)
      .neq("status", "rascunho")
      .gte("data_validade", desde)
      .order("data_validade", { ascending: false })
      .limit(LIMITE),
    supabase
      .from("orcamento_aceites")
      .select("orcamento_id, valor_total, created_at")
      .gte("created_at", desdeInstante)
      .order("created_at", { ascending: false })
      .limit(LIMITE),
    supabase
      .from("orcamento_comentarios")
      .select("orcamento_id, created_at")
      .gte("created_at", desdeInstante)
      .order("created_at", { ascending: false })
      .limit(LIMITE),
    // os abertos, de qualquer data, e o que chegou ou foi encerrado na janela
    supabase
      .from("pedido_orcamento")
      .select(COLUNAS_PEDIDO)
      .or(`status.eq.novo,created_at.gte."${desdeInstante}",encerrado_em.gte."${desdeInstante}"`)
      .order("created_at", { ascending: false })
      .limit(LIMITE),
    supabase
      .from("pagina_publica_metrica")
      .select("dia, origem_acesso, campanha, page_view, whatsapp_click, instagram_click, pedido_enviado")
      .gte("dia", periodo.inicio)
      .lte("dia", periodo.fim)
      .limit(LIMITE),
  ]);

  const respostas = { propostas, aceites, comentarios, pedidos, metricas };
  let falhou = false;
  let incompleto = false;
  for (const [nome, r] of Object.entries(respostas)) {
    if (r.error) {
      falhou = true;
      console.error(`[eorg:relatorio] ${nome}:`, r.error.code, (r.error.message ?? "").slice(0, 120));
    } else if ((r.data?.length ?? 0) >= LIMITE) {
      incompleto = true;
      console.warn(`[eorg:relatorio] ${nome}: chegou ao teto de ${LIMITE} linhas`);
    }
  }

  return {
    dados: {
      propostas: (propostas.data ?? []) as unknown as PropostaDoRelatorio[],
      aceites: (aceites.data ?? []) as unknown as AceiteDoRelatorio[],
      comentarios: (comentarios.data ?? []) as unknown as ComentarioDoRelatorio[],
      pedidos: (pedidos.data ?? []) as unknown as PedidoDoRelatorio[],
      metricas: (metricas.data ?? []) as unknown as MetricaDoRelatorio[],
    },
    falhou,
    incompleto,
  };
}
