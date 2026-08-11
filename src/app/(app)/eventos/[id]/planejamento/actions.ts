"use server";

// Ações da tela de Planejamento. Escrevem na árvore do método (4A/5A) via
// client de servidor — a RLS por evento (pode_editar_evento) é a guarda
// real; aqui só revalidamos o cache da rota.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipoCampo } from "@/lib/supabase/planejamento";

export type AcaoResult = { error: string } | { success: true };

const ESTADOS = ["pendente", "decidida", "nao_se_aplica"] as const;
type Estado = (typeof ESTADOS)[number];

async function mudarEstado(
  eventId: string,
  decisaoId: string,
  estado: Estado
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_decisao")
    .update({
      estado,
      // carimba a data só ao decidir; ao voltar para pendente/n-a, limpa.
      decidida_em: estado === "decidida" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", decisaoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar a decisão." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  if (estado === "decidida") {
    // decidir "Contratar X" leva o previsto ao Financeiro (ponte no gatilho
    // do banco) — a tela do Financeiro precisa refletir.
    revalidatePath(`/eventos/${eventId}/financeiro`);
  }
  return { success: true };
}

export async function decidirDecisao(eventId: string, decisaoId: string) {
  return mudarEstado(eventId, decisaoId, "decidida");
}

export async function marcarNaoSeAplica(eventId: string, decisaoId: string) {
  return mudarEstado(eventId, decisaoId, "nao_se_aplica");
}

// Reabrir: tanto "reativar" um item marcado não se aplica quanto desfazer
// uma decisão voltam para pendente.
export async function reabrirDecisao(eventId: string, decisaoId: string) {
  return mudarEstado(eventId, decisaoId, "pendente");
}

// A data do casamento é campo de primeira classe do evento. Gravar aqui
// dispara o recálculo da compressão (4D, gatilho em events.date) e alimenta
// prazos, timeline e Organização.
export async function definirDataEvento(
  eventId: string,
  data: string // yyyy-mm-dd
): Promise<AcaoResult> {
  if (!data) return { error: "Escolha uma data." };
  const supabase = createClient();
  const { error } = await supabase
    .from("events")
    .update({ date: data })
    .eq("id", eventId);

  if (error) return { error: "Não foi possível definir a data." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  revalidatePath(`/eventos/${eventId}/organizacao`);
  revalidatePath(`/eventos/${eventId}`);
  return { success: true };
}

// Salva a resposta de um campo tipado da decisão. O tipo diz a coluna
// canônica; os demais valores ficam null. Campos 'escala'/'cenario' também
// gravam em events — é isso que dispara a aplicação dos deltas de
// arquétipo no banco (base → escala → cenário).
export async function salvarCampo(
  eventId: string,
  campoId: string,
  tipo: TipoCampo,
  codigo: string,
  valor: string | number | boolean | null
): Promise<AcaoResult> {
  const supabase = createClient();

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  switch (tipo) {
    case "numero":
    case "moeda":
      patch.valor_numero = valor === null || valor === "" ? null : Number(valor);
      break;
    case "sim_nao":
      patch.valor_bool = valor === null ? null : Boolean(valor);
      break;
    case "data":
      patch.valor_data = valor ? String(valor) : null;
      break;
    case "escolha":
      patch.valor_opcao = valor ? String(valor) : null;
      break;
    case "fornecedor":
      patch.valor_supplier_id = valor ? String(valor) : null;
      break;
    default:
      // texto e anexo (anexo = caminho no Storage)
      patch.valor_texto =
        valor === null ? null : String(valor).trim() || null;
  }

  const { error } = await supabase
    .from("evento_campo_valor")
    .update(patch)
    .eq("id", campoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível salvar a resposta." };

  // escala/cenario são a escolha de arquétipo do evento: refletir em
  // events dispara os deltas (offsets, faixas, prioridades) no banco.
  if (codigo === "escala" || codigo === "cenario") {
    const { error: e2 } = await supabase
      .from("events")
      .update({ [codigo]: valor ? String(valor) : null })
      .eq("id", eventId);
    if (e2) return { error: "Não foi possível aplicar o arquétipo." };
  }

  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

// Alocação manual: a cerimonialista edita o previsto de um objetivo
// diretamente (a sugestão nunca é automática e tudo permanece editável).
export async function salvarValorPrevisto(
  eventId: string,
  objetivoId: string,
  valor: number | null
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_objetivo")
    .update({ valor_previsto: valor, updated_at: new Date().toISOString() })
    .eq("id", objetivoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível salvar o valor." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

// Sugerir distribuição (5C). SEMPRE por botão, nunca automático: separa a
// reserva, distribui o resto entre os objetivos ativos proporcionalmente à
// faixa ideal de cada um (já com delta de arquétipo aplicado — praia infra
// 10–15%, salão 3%) e grava os previstos. Tudo editável depois.
export async function sugerirDistribuicao(
  eventId: string
): Promise<AcaoResult> {
  const supabase = createClient();

  const [verbaRes, reservaRes, objRes] = await Promise.all([
    supabase
      .from("evento_campo_valor")
      .select("id, valor_numero")
      .eq("event_id", eventId)
      .eq("codigo", "verba_total")
      .maybeSingle(),
    supabase
      .from("evento_campo_valor")
      .select("id, valor_numero")
      .eq("event_id", eventId)
      .eq("codigo", "reserva_pct")
      .maybeSingle(),
    supabase
      .from("evento_objetivo")
      .select("id, ativo, faixa_pct_ideal")
      .eq("event_id", eventId),
  ]);

  const verba = verbaRes.data?.valor_numero
    ? Number(verbaRes.data.valor_numero)
    : null;
  if (!verba || verba <= 0) {
    return { error: "Preencha a verba total (em Levantar o budget) antes." };
  }

  // Reserva de imprevistos: se ainda não definida, a sugestão propõe 10%
  // e grava no campo — parte da sugestão, editável como o resto.
  let reservaPct = reservaRes.data?.valor_numero
    ? Number(reservaRes.data.valor_numero)
    : null;
  if (reservaPct === null && reservaRes.data?.id) {
    reservaPct = 10;
    await supabase
      .from("evento_campo_valor")
      .update({ valor_numero: 10, updated_at: new Date().toISOString() })
      .eq("id", reservaRes.data.id)
      .eq("event_id", eventId);
  }
  const base = verba * (1 - (reservaPct ?? 0) / 100);

  // Proporcional à faixa ideal — as faixas variam entre fontes e cenários,
  // então normalizamos em vez de esperar que somem 100.
  const ativos = (objRes.data ?? []).filter(
    (o) => o.ativo && o.faixa_pct_ideal !== null
  );
  const somaIdeais = ativos.reduce(
    (s, o) => s + Number(o.faixa_pct_ideal),
    0
  );
  if (somaIdeais <= 0) {
    return { error: "Nenhum objetivo ativo tem faixa de referência." };
  }

  for (const o of ativos) {
    const valor =
      Math.round((base * Number(o.faixa_pct_ideal)) / somaIdeais) || 0;
    const { error } = await supabase
      .from("evento_objetivo")
      .update({ valor_previsto: valor, updated_at: new Date().toISOString() })
      .eq("id", o.id)
      .eq("event_id", eventId);
    if (error) return { error: "Não foi possível gravar a distribuição." };
  }

  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}
