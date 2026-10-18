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

/** Lê com as colunas da 214; antes dela aplicada, sem elas. */
async function comOuSem<T extends { error: { code?: string } | null }>(
  com: () => PromiseLike<T>,
  sem: () => PromiseLike<T>
): Promise<T> {
  const r = await com();
  if (r.error && (r.error.code === "42703" || r.error.code === "PGRST204")) return sem();
  return r;
}

export async function lerOportunidades(): Promise<{ dados: DadosDasOportunidades; falhou: boolean }> {
  const supabase = createClient();
  const desde = somarDias(hojeBR(), -DIAS_DO_HISTORICO);
  const desdeInstante = `${desde}T00:00:00-03:00`;

  const lerPedidos = (extras: string) =>
    supabase
      .from("pedido_orcamento")
      .select(COLUNAS_PEDIDO + extras)
      .or(`status.eq.novo,encerrado_em.gte."${desdeInstante}",created_at.gte."${desdeInstante}"`)
      .order("created_at", { ascending: false })
      .limit(LIMITE);

  const [propostas, pedidos, aceites, comentarios, reunioes] = await Promise.all([
    // em aberto (rascunho e enviada), mais o que mudou de estado na janela
    supabase
      .from("orcamentos")
      .select(COLUNAS_PROPOSTA)
      .or(
        `status.in.(rascunho,enviado),respondido_em.gte."${desdeInstante}",recusado_em.gte."${desdeInstante}",data_validade.gte.${desde}`
      )
      .order("data_criacao", { ascending: false })
      .limit(LIMITE),
    comOuSem(
      () => lerPedidos(", servico_desejado"),
      () => lerPedidos("")
    ),
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
    // a ligação com a oportunidade é da 214: antes dela, nenhuma reunião ligada
    supabase
      .from("agenda_item")
      .select("data, hora, orcamento_id, pedido_id")
      .gte("data", hojeBR())
      .or("orcamento_id.not.is.null,pedido_id.not.is.null")
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
      reunioes: reunioes.error
        ? []
        : ((reunioes.data ?? []) as {
            data: string;
            hora: string | null;
            orcamento_id: string | null;
            pedido_id: string | null;
          }[]),
    },
    falhou,
  };
}
