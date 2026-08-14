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

// Salva a resposta de um campo tipado da decisão — pela MESMA porta que
// o Portal da Cliente usa (portal_escrever_campo, 091). A RPC deriva o
// tipo DA LINHA (o client não manda mais tipo/codigo como verdade),
// valida o valor no servidor, e recusa gravar por cima se a linha mudou
// desde a leitura (trava otimista).
//
// Campos 'escala'/'cenario' também gravam em events — é isso que dispara
// a aplicação dos deltas de arquétipo (base → escala → cenário). Esse
// efeito é DESTA action, não da RPC: o portal nunca o alcança.
export async function salvarCampo(
  eventId: string,
  campoId: string,
  tipo: TipoCampo,
  codigo: string,
  valor: string | number | boolean | null,
  updatedAtVisto?: string | null
): Promise<AcaoResult & { conflito?: boolean }> {
  const supabase = createClient();

  // O valor no formato que a RPC valida por tipo. Vazio = apagar.
  let jsonValor: string | number | boolean | null = null;
  if (valor !== null && valor !== "") {
    if (tipo === "numero" || tipo === "moeda") {
      const n = Number(valor);
      if (!Number.isFinite(n)) return { error: "Informe um número válido." };
      jsonValor = n;
    } else if (tipo === "sim_nao") {
      jsonValor = Boolean(valor);
    } else {
      jsonValor = String(valor).trim() || null;
    }
  }

  const { data, error } = await supabase.rpc("portal_escrever_campo", {
    p_campo_id: campoId,
    p_valor: jsonValor,
    p_updated_at_visto: updatedAtVisto ?? null,
  });

  if (error) return { error: "Não foi possível salvar a resposta." };
  const r = data as {
    ok: boolean;
    erro?: string;
    conflito?: boolean;
  } | null;
  if (!r?.ok) {
    if (r?.conflito) {
      return {
        error: "Alguém salvou uma resposta mais nova. A tela foi atualizada.",
        conflito: true,
      };
    }
    return { error: "Não foi possível salvar a resposta." };
  }

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

// ------------------------------------------------------------------
// Conferência (091): a cerimonialista aceita o bloco de respostas da
// cliente num gesto. NÃO decide a decisão — decidir continua ato
// separado, com geração de tarefas e efeito financeiro.
// ------------------------------------------------------------------
export async function conferirDecisao(
  eventId: string,
  decisaoId: string
): Promise<AcaoResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("conferir_decisao", {
    p_decisao_id: decisaoId,
  });
  const r = data as { ok: boolean } | null;
  if (error || !r?.ok) return { error: "Não foi possível conferir o bloco." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

export type LinhaDiff = {
  campo_id: string;
  campo_label: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  origem: string;
  quando: string;
};

// O que mudou desde a última conferência — alimenta o painel do drawer.
export async function verDiffDecisao(
  decisaoId: string
): Promise<{ linhas: LinhaDiff[] } | { error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_diff_da_decisao", {
    p_decisao_id: decisaoId,
  });
  if (error) return { error: "Não foi possível carregar as mudanças." };
  return { linhas: (data ?? []) as LinhaDiff[] };
}

// O olho do portal: esconder/mostrar um campo para a cliente. A UI que a
// 089 prometeu — antes disso o caminho era UPDATE manual no banco.
export async function alternarVisivelPortal(
  eventId: string,
  campoId: string,
  visivel: boolean
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_campo_valor")
    .update({ visivel_portal: visivel })
    .eq("id", campoId)
    .eq("event_id", eventId);
  if (error) return { error: "Não foi possível alterar a visibilidade." };
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
    return { error: "Informe a verba total primeiro." };
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
  // Sem isto a distribuição grava zero em todo objetivo e "dá certo" em
  // silêncio — pior que recusar. Acontece quando a reserva come a verba.
  if (base <= 0) {
    return {
      error: `A reserva (${reservaPct}%) está consumindo toda a verba. Reduza a reserva para distribuir.`,
    };
  }

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

// "Não se aplica" no nível do OBJETIVO: desligar um assunto inteiro
// (evento_objetivo.ativo, 064). Não é delete — reativável a qualquer
// momento, e o desligado sai do progresso e da distribuição.
export async function alternarObjetivoAtivo(
  eventId: string,
  objetivoId: string,
  ativo: boolean
): Promise<AcaoResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_objetivo")
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq("id", objetivoId)
    .eq("event_id", eventId);

  if (error) return { error: "Não foi possível atualizar o objetivo." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true };
}

// ------------------------------------------------------------------
// Liberdade (handoff §2.7): objetivos, decisões e campos PRÓPRIOS, fora
// do método. template_id nulo = origem própria — o schema (083) já
// aceita; nenhum selo chamativo na lista.
// ------------------------------------------------------------------

// Slug curto para o codigo do campo próprio. Prefixado para nunca colidir
// com códigos especiais do método (escala/cenario/verba_total/...).
function slugCampo(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `proprio_${s || "campo"}`;
}

export async function criarObjetivoProprio(
  eventId: string,
  nome: string
): Promise<AcaoResult & { id?: string }> {
  const limpo = nome.trim();
  if (!limpo) return { error: "Dê um nome ao objetivo." };
  const supabase = createClient();

  const { data: max } = await supabase
    .from("evento_objetivo")
    .select("ordem")
    .eq("event_id", eventId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("evento_objetivo")
    .insert({
      event_id: eventId,
      nome: limpo,
      ativo: true,
      ordem: (max?.ordem ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) return { error: "Não foi possível criar o objetivo." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true, id: data.id };
}

export async function criarDecisaoPropria(
  eventId: string,
  objetivoId: string,
  titulo: string
): Promise<AcaoResult & { id?: string }> {
  const limpo = titulo.trim();
  if (!limpo) return { error: "Dê um título à decisão." };
  const supabase = createClient();

  const { data: max } = await supabase
    .from("evento_decisao")
    .select("ordem")
    .eq("evento_objetivo_id", objetivoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("evento_decisao")
    .insert({
      evento_objetivo_id: objetivoId,
      event_id: eventId,
      titulo: limpo,
      responsavel: "ambos",
      estado: "pendente",
      // peso médio: decisão própria conta no progresso ponderado sem
      // atropelar as estruturantes do método (~80-100).
      prioridade: 50,
      ordem: (max?.ordem ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) return { error: "Não foi possível criar a decisão." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true, id: data.id };
}

const TIPOS_CAMPO: TipoCampo[] = [
  "texto",
  "numero",
  "moeda",
  "sim_nao",
  "escolha",
  "data",
  "anexo",
  "fornecedor",
];

export async function criarCampoProprio(
  eventId: string,
  decisaoId: string,
  label: string,
  tipo: TipoCampo,
  opcoes?: string[]
): Promise<AcaoResult & { id?: string }> {
  const limpo = label.trim();
  if (!limpo) return { error: "Dê um nome ao campo." };
  if (!TIPOS_CAMPO.includes(tipo)) return { error: "Tipo de campo inválido." };
  const supabase = createClient();

  const { data: max } = await supabase
    .from("evento_campo_valor")
    .select("ordem")
    .eq("evento_decisao_id", decisaoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("evento_campo_valor")
    .insert({
      evento_decisao_id: decisaoId,
      event_id: eventId,
      codigo: slugCampo(limpo),
      label: limpo,
      tipo,
      opcoes:
        tipo === "escolha" && opcoes && opcoes.length > 0 ? opcoes : null,
      ordem: (max?.ordem ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) return { error: "Não foi possível criar o campo." };
  revalidatePath(`/eventos/${eventId}/planejamento`);
  return { success: true, id: data.id };
}
