// O modelo do roteiro vive no Playbook da empresa (metodo_roteiro_item,
// migração 112): cada item guarda o deslocamento em relação à cerimônia
// e a duração típica. Aqui a gente lê a tabela e monta os drafts que a
// RPC de criação entende.
//
// O fallback para a constante TS existe por um motivo só: migração 112
// ainda não aplicada. Nesse caso o comportamento antigo (títulos sem
// horário) continua valendo, sem quebrar o wizard.

import { createClient } from "@/lib/supabase/server";
import {
  gerarTimelineSugerida,
  resolverTemplate,
  type WizardRespostas,
} from "@/lib/event-templates";

export type RoteiroDraft = {
  title: string;
  order: number;
  time: string | null;
  offset_min: number | null;
  duracao_min: number | null;
};

/**
 * `tipo` é o tipo REAL do evento (o que vai para events.type e para a
 * tabela); o arquétipo de 7 templates só serve ao fallback TS.
 */
export async function montarTimelineDoPlaybook(
  tipo: string,
  respostas: WizardRespostas
): Promise<RoteiroDraft[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("metodo_roteiro_item")
    .select("codigo, titulo, offset_min, duracao_min, condicao, ordem")
    .eq("tipo_evento", tipo)
    .order("ordem");

  let rows = (data ?? []) as {
    codigo: string;
    titulo: string;
    offset_min: number;
    duracao_min: number | null;
    condicao: string | null;
    ordem: number;
  }[];

  // Formatura tem DOIS conjuntos com âncoras próprias (125): colacao_*
  // mede da abertura da sessão solene; baile_* da abertura do baile.
  // Juntos (mesmo dia e local): a âncora do evento é a colação e o baile
  // entra deslocado para depois dela. Separados (=== false): o evento
  // principal é o baile — a colação vive no evento ligado
  // (criar_evento_colacao). Sem resposta (undefined): protocolo completo,
  // como juntos — melhor sobrar item para apagar do que faltar a colação
  // no roteiro de quem pulou a pergunta.
  // A decisão é TODA daqui (por prefixo); a condicao das linhas de
  // colação existe para o caminho de orçamento (SQL) e é zerada abaixo
  // para o filtro genérico não reaplicá-la.
  if (tipo === "formatura" && rows.length > 0) {
    const DESLOC_BAILE_MIN = 180; // colação (~2h) + transição
    rows = (
      respostas.colacaoJunto === false
        ? rows.filter((r) => !r.codigo.startsWith("colacao_"))
        : rows
            .map((r) =>
              r.codigo.startsWith("baile_")
                ? { ...r, offset_min: r.offset_min + DESLOC_BAILE_MIN }
                : r
            )
            .sort((a, b) => a.offset_min - b.offset_min)
    ).map((r) => ({ ...r, condicao: null }));
  }

  if (rows.length === 0) {
    // 112 pendente ou tipo sem modelo: comportamento antigo
    return gerarTimelineSugerida(resolverTemplate(tipo), respostas).map((r) => ({
      title: r.title,
      order: r.order,
      time: r.time,
      offset_min: null,
      duracao_min: null,
    }));
  }

  return rows
    .filter(
      (r) =>
        !r.condicao ||
        Boolean(respostas[r.condicao as keyof WizardRespostas])
    )
    .map((r, i) => ({
      title: r.titulo,
      order: i + 1,
      time: null, // a RPC calcula de p_time + offset
      offset_min: r.offset_min,
      duracao_min: r.duracao_min,
    }));
}
