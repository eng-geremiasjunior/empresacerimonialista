// Modo Evento (Etapa 4) — centro de comando. Busca as atividades mais
// recentes do log dos fornecedores + próximo item, e formata tempo
// relativo. O status geral reaproveita a MESMA regra determinística dos
// Alertas do Copiloto (lib/cronograma).

import { createClient } from "@/lib/supabase/client";
import { alertasCronograma, timeToMinutes } from "@/lib/cronograma";
import type { ModoItem } from "@/lib/modo-tema";

export type AtividadeRecente = {
  id: string;
  tipo_evento: string;
  descricao: string | null;
  created_at: string;
  itemTitle: string | null;
};

// "há X min" / "agora" / "há Xh Ymin" a partir de um ISO e o "now" em ms.
export function tempoRelativo(iso: string, nowMs: number): string {
  const diffMin = Math.floor((nowMs - new Date(iso).getTime()) / 60000);
  if (diffMin <= 0) return "agora mesmo";
  if (diffMin === 1) return "há 1 minuto";
  if (diffMin < 60) return `há ${diffMin} minutos`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m ? `há ${h}h ${m}min` : `há ${h}h`;
}

// Últimas N atividades do log deste evento (join embutido em roteiro_items,
// filtrado por event_id; RLS restringe à empresa da cerimonialista).
export async function buscarAtividadesRecentes(
  eventId: string,
  limite = 3
): Promise<AtividadeRecente[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("roteiro_item_log")
    .select(
      "id, tipo_evento, descricao, created_at, roteiro_items!inner(event_id, title)"
    )
    .eq("roteiro_items.event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(limite);

  return ((data ?? []) as unknown as {
    id: string;
    tipo_evento: string;
    descricao: string | null;
    created_at: string;
    roteiro_items: { title: string } | null;
  }[]).map((r) => ({
    id: r.id,
    tipo_evento: r.tipo_evento,
    descricao: r.descricao,
    created_at: r.created_at,
    itemTitle: r.roteiro_items?.title ?? null,
  }));
}

// Próximo item planejado mais próximo pelo horário previsto.
export function proximoPlanejado(items: ModoItem[]): ModoItem | null {
  return (
    items
      .filter((i) => i.statusNovo === "planejado" && i.time)
      .sort((a, b) => (timeToMinutes(a.time)! - timeToMinutes(b.time)!))[0] ??
    null
  );
}

// Frase de status geral — mesma regra dos Alertas do Copiloto (Etapa 3).
// Retorna { ok, texto }.
export function statusGeral(
  items: ModoItem[],
  nowMinutes: number
): { ok: boolean; texto: string } {
  const alertas = alertasCronograma(
    items.map((i) => ({
      id: i.id,
      time: i.time,
      title: i.title,
      description: i.description,
      supplier_id: null,
      supplier_name: i.supplierName,
      supplier_categoria: null,
      status_novo: i.statusNovo,
      horario_real_inicio: i.horarioRealInicio,
      horario_real_fim: i.horarioRealFim,
      observacao: i.observacao,
      responsavel_nome: i.responsavelNome,
      responsavel_telefone: null,
      etapa_obrigatoria: false,
      duracao_minutos: null,
    })),
    nowMinutes
  );

  const problema = alertas.find((a) => a.tipo === "problema");
  if (problema) {
    return { ok: false, texto: problema.titulo + " — " + problema.detalhe };
  }
  const atraso = alertas.find((a) => a.tipo === "atraso");
  if (atraso) {
    return { ok: false, texto: atraso.titulo + " · " + atraso.detalhe };
  }
  return { ok: true, texto: "Nenhum atraso crítico identificado." };
}
