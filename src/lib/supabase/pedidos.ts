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
};

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
  };
}

export async function lerPedidos(
  status: PedidoStatus,
  limite = 100
): Promise<{ pedidos: PedidoVisto[]; falhou: boolean }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pedido_orcamento")
    .select(COLUNAS)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) {
    console.error("[eorg:pedidos] leitura:", error.code, (error.message ?? "").slice(0, 120));
    return { pedidos: [], falhou: true };
  }
  const agora = new Date();
  return { pedidos: ((data ?? []) as Linha[]).map((p) => paraVista(p, agora)), falhou: false };
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
