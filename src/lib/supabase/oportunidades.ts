import "server-only";

// A leitura das Oportunidades. Pela sessão: a RLS de 041/165 entrega a cada
// cargo as propostas e os pedidos que ele já vê no resto do Comercial.
// Do aceite e do comentário, só a data: assinatura, IP e texto não saem
// do banco para esta tela.
//
// A janela: o que está em aberto, de qualquer data, mais o que fechou ou
// se perdeu nos últimos DIAS_DO_HISTORICO dias (a validade de uma
// proposta perdida cai dentro dela; a de uma aceita, não necessariamente,
// por isso o aceite entra pela própria data).

import { createClient } from "@/lib/supabase/server";
import { linkPublico } from "@/lib/app-url";
import { hojeBR, somarDias } from "@/lib/tempo";
import {
  DIAS_DO_HISTORICO,
  type DadosDasOportunidades,
  type PedidoDaOportunidade,
  type PropostaDaOportunidade,
} from "@/lib/comercial/oportunidades";

const LIMITE = 500;

const COLUNAS_PROPOSTA =
  "id, contato_nome, contato_telefone, tipo_evento, data_evento, valor_total, status, data_criacao, data_validade, enviado_em, respondido_em, recusado_em, motivo_recusa, visitas, ultima_visita_em, evento_gerado_id, pedido_id, hash_publico";

const COLUNAS_PEDIDO =
  "id, nome, whatsapp, tipo_evento, data_evento, status, canal, origem_acesso, utm_campaign, orcamento_id, created_at, encerrado_em, motivo_encerramento";

export async function lerOportunidades(): Promise<{ dados: DadosDasOportunidades; falhou: boolean }> {
  const supabase = createClient();
  const desde = somarDias(hojeBR(), -DIAS_DO_HISTORICO);
  const desdeInstante = `${desde}T00:00:00-03:00`;

  const [propostas, pedidos, aceites, comentarios] = await Promise.all([
    // em aberto (rascunho e enviada), mais o que mudou de estado na janela
    supabase
      .from("orcamentos")
      .select(COLUNAS_PROPOSTA)
      .or(
        `status.in.(rascunho,enviado),respondido_em.gte."${desdeInstante}",recusado_em.gte."${desdeInstante}",data_validade.gte.${desde}`
      )
      .order("data_criacao", { ascending: false })
      .limit(LIMITE),
    supabase
      .from("pedido_orcamento")
      .select(COLUNAS_PEDIDO)
      .or(`status.eq.novo,encerrado_em.gte."${desdeInstante}",created_at.gte."${desdeInstante}"`)
      .order("created_at", { ascending: false })
      .limit(LIMITE),
    supabase
      .from("orcamento_aceites")
      .select("orcamento_id, created_at")
      .gte("created_at", desdeInstante)
      .limit(LIMITE),
    supabase
      .from("orcamento_comentarios")
      .select("orcamento_id, created_at")
      .gte("created_at", somarDias(desde, -60) + "T00:00:00-03:00")
      .limit(LIMITE),
  ]);

  let falhou = false;
  for (const [nome, r] of Object.entries({ propostas, pedidos, aceites, comentarios })) {
    if (r.error) {
      falhou = true;
      console.error(`[eorg:oportunidades] ${nome}:`, r.error.code, (r.error.message ?? "").slice(0, 120));
    }
  }

  type LinhaProposta = Omit<PropostaDaOportunidade, "link"> & { hash_publico: string };
  const linhas = (propostas.data ?? []) as unknown as LinhaProposta[];
  return {
    dados: {
      propostas: linhas.map(({ hash_publico, ...o }) => ({ ...o, link: linkPublico(`/orcamento/${hash_publico}`) })),
      pedidos: (pedidos.data ?? []) as unknown as PedidoDaOportunidade[],
      aceites: (aceites.data ?? []) as { orcamento_id: string; created_at: string }[],
      comentarios: (comentarios.data ?? []) as { orcamento_id: string; created_at: string }[],
    },
    falhou,
  };
}
