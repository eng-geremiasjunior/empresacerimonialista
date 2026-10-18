import "server-only";

// A leitura da fila de pedidos, uma só para a visão Pedidos e para o
// bloco no topo de Propostas. Pela sessão: a RLS da 165 entrega os pedidos
// da empresa a quem responde (dona, coordenadora, cerimonialista) e nada à
// assistente. O tempo relativo é calculado AQUI, no servidor, e chega
// pronto à tela.

import { createClient } from "@/lib/supabase/server";
import {
  haQuanto,
  origemEmPalavras,
  resumoDoEvento,
  type CanalDoPedido,
  type OrigemDoAcesso,
  type PedidoStatus,
} from "@/lib/comercial/pedidos";
import type { PedidoVisto } from "@/components/comercial/pedidos/PedidoCartao";
import type { EventType } from "@/lib/types";

const COLUNAS =
  "id, canal, origem_acesso, utm_campaign, nome, whatsapp, email, tipo_evento, data_evento, cidade, convidados, mensagem, repeticoes, client_id, status, orcamento_id, motivo_encerramento, created_at";
/** o serviço e as respostas do formulário dela (214) */
const COLUNAS_214 = ", servico_desejado, respostas";

type Linha = {
  id: string;
  canal: CanalDoPedido;
  origem_acesso: OrigemDoAcesso;
  utm_campaign: string | null;
  nome: string;
  whatsapp: string;
  email: string | null;
  tipo_evento: EventType;
  data_evento: string | null;
  cidade: string | null;
  convidados: number | null;
  mensagem: string | null;
  repeticoes: number;
  client_id: string | null;
  status: PedidoStatus;
  orcamento_id: string | null;
  motivo_encerramento: string | null;
  created_at: string;
  servico_desejado?: string | null;
  respostas?: unknown;
};

/** As respostas gravadas, só as bem formadas (o banco já conferiu). */
function respostasLidas(cru: unknown): { titulo: string; resposta: string }[] {
  if (!Array.isArray(cru)) return [];
  return cru
    .map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : {}))
    .filter((r) => typeof r.titulo === "string" && typeof r.resposta === "string" && r.resposta)
    .map((r) => ({ titulo: r.titulo as string, resposta: r.resposta as string }));
}

function paraVista(p: Linha, agora: Date): PedidoVisto {
  return {
    id: p.id,
    nome: p.nome,
    whatsapp: p.whatsapp,
    email: p.email,
    resumo: resumoDoEvento(p),
    quando: haQuanto(p.created_at, agora),
    origem: origemEmPalavras(p),
    repeticoes: p.repeticoes,
    clienteJaCadastrada: Boolean(p.client_id),
    mensagem: p.mensagem,
    status: p.status,
    orcamentoId: p.orcamento_id,
    motivoEncerramento: p.motivo_encerramento,
    servico: p.servico_desejado ?? null,
    respostas: respostasLidas(p.respostas),
  };
}

export async function lerPedidos(
  status: PedidoStatus,
  limite = 100
): Promise<{ pedidos: PedidoVisto[]; falhou: boolean }> {
  const supabase = createClient();
  const ler = (colunas: string) =>
    supabase
      .from("pedido_orcamento")
      .select(colunas)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limite);
  // antes da 214 aplicada, as colunas novas não existem: lê sem elas
  let { data, error } = await ler(COLUNAS + COLUNAS_214);
  if (error && (error.code === "42703" || error.code === "PGRST204")) ({ data, error } = await ler(COLUNAS));
  if (error) {
    console.error("[eorg:pedidos] leitura:", error.code, (error.message ?? "").slice(0, 120));
    return { pedidos: [], falhou: true };
  }
  const agora = new Date();
  return { pedidos: ((data ?? []) as unknown as Linha[]).map((p) => paraVista(p, agora)), falhou: false };
}

export async function contarPedidos(): Promise<Record<PedidoStatus, number>> {
  const supabase = createClient();
  const contar = async (status: PedidoStatus) => {
    const { count } = await supabase
      .from("pedido_orcamento")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    return count ?? 0;
  };
  const [novo, em_proposta, encerrado] = await Promise.all([
    contar("novo"),
    contar("em_proposta"),
    contar("encerrado"),
  ]);
  return { novo, em_proposta, encerrado };
}
