// Dados da tela de Planejamento (4B). Consome a árvore do método (4A/5A):
// evento_objetivo → evento_decisao → evento_campo_valor. Tudo real.
//
// O objeto dominante é a DECISÃO — e ela é um FORMULÁRIO: produz valores
// nomeados e tipados que o resto do sistema consome. Os campos vazios são
// o roteiro de conversa com os noivos (o antigo guia virou isto).

import { differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";

import {
  valorDoCampo,
  type Campo,
  type TipoCampo,
} from "@/lib/planejamento-shared";

// Parte pura (tipos do campo + valorDoCampo) vive em planejamento-shared,
// importável por componentes client. Re-exportada aqui para os consumidores
// de servidor continuarem com um import só.
export { valorDoCampo };
export type { Campo, TipoCampo };

export type EstadoDecisao = "pendente" | "decidida" | "nao_se_aplica";
export type Responsavel = "noivos" | "cerimonialista" | "ambos";

export type Decisao = {
  id: string;
  objetivoId: string;
  // código do template (ex.: 'data' = a decisão que é a data do casamento).
  codigo: string | null;
  titulo: string;
  descricao: string | null;
  responsavel: Responsavel;
  offsetIdealDias: number | null;
  offsetMinDias: number | null;
  offsetMaxDias: number | null;
  // Data recalculada pela compressão (4D). null = sem data do evento ou
  // nao_se_aplica. É esta data — não o offset cru — que a tela mostra.
  prazoPrevisto: string | null;
  prioridade: number;
  ordem: number;
  estado: EstadoDecisao;
  campos: Campo[];
  camposPreenchidos: number;
  /** respostas da cliente ainda não conferidas (091) */
  aguardamConferencia: number;
  // Nomes reais das tarefas que esta decisão gera na Organização (do
  // blueprint do método, 4C). Vazio para decisões sem blueprint.
  gerariaTarefas: string[];
};

/**
 * A janela do objetivo.
 *
 * 'concluido' não é uma janela de tempo: é o fim da linha. Sem ele, um
 * objetivo com tudo decidido caía em 'depois' — porque 'depois' era o
 * valor de partida e nada o tirava de lá quando não sobrava pendência.
 * A tela dizia "ainda vem" para trabalho que já tinha acabado.
 */
export type Bucket = "agora" | "proximas" | "depois" | "concluido";

export type Objetivo = {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  // Alocação (5A): quanto da verba está reservado para este assunto.
  // SEM data — intenção não tem vencimento.
  valorPrevisto: number | null;
  // Faixa % de referência, já com o delta de arquétipo aplicado.
  faixaPctMin: number | null;
  faixaPctIdeal: number | null;
  faixaPctMax: number | null;
  responsavelDominante: Responsavel;
  decisoes: Decisao[];
  // progresso do objetivo (ponderado)
  decididas: number;
  aplicaveis: number;
  // janela temporal ideal (dias antes do evento) e balde
  janelaDias: number | null;
  bucket: Bucket;
  faltamDias: number | null;
};

export type DecisaoCritica = Decisao & {
  objetivoNome: string;
};

// Termômetro (5C): verba, comprometido e saldo — só o macro; o detalhe
// (parcelas, pagamentos) vive na Organização.
export type Verba = {
  total: number | null;
  reservaPct: number | null;
  reservaValor: number;
  comprometido: number;
  saldo: number | null;
  // Ressalva 4: algum previsto destoa da faixa atual (ex.: o cenário mudou
  // depois da distribuição). Nunca sobrescrevemos — avisamos.
  distribuicaoDesatualizada: boolean;
};

export type Planejamento = {
  temArvore: boolean;
  dataEvento: string | null;
  diasAteEvento: number | null;
  // progresso PONDERADO por prioridade (não por quantidade)
  progressoPct: number;
  criticas: DecisaoCritica[];
  objetivos: Objetivo[];
  verba: Verba;
  // 4D: densidade da agenda (decisões pendentes ÷ meses até o evento) e o
  // aviso não bloqueante de ritmo intenso quando o método foi comprimido.
  densidadeMensal: number;
  ritmoApertado: boolean;
};

const RESP_PESO: Record<Responsavel, number> = {
  noivos: 0,
  cerimonialista: 0,
  ambos: 0,
};

// Responsável "dominante" de um objetivo: o mais frequente entre as
// decisões, com "ambos" desempatando (aparece o tempo todo no método).
function responsavelDominante(decisoes: Decisao[]): Responsavel {
  const cont = { ...RESP_PESO };
  for (const d of decisoes) cont[d.responsavel]++;
  const max = Math.max(cont.noivos, cont.cerimonialista, cont.ambos);
  if (cont.ambos === max) return "ambos";
  if (cont.cerimonialista === max) return "cerimonialista";
  return "noivos";
}

export async function getPlanejamento(
  eventId: string,
  dataEvento: string | null
): Promise<Planejamento> {
  const supabase = createClient();

  const [objRes, decRes, campoRes] = await Promise.all([
    supabase
      .from("evento_objetivo")
      .select(
        "id, nome, descricao, ordem, ativo, valor_previsto, faixa_pct_min, faixa_pct_ideal, faixa_pct_max"
      )
      .eq("event_id", eventId)
      .order("ordem"),
    supabase
      .from("evento_decisao")
      .select(
        "id, evento_objetivo_id, decisao_template_id, titulo, descricao, responsavel, offset_ideal_dias, offset_min_dias, offset_max_dias, prazo_previsto, prioridade, ordem, estado"
      )
      .eq("event_id", eventId)
      .order("ordem"),
    supabase
      .from("evento_campo_valor")
      .select(
        "id, evento_decisao_id, codigo, label, tipo, opcoes, unidade, ordem, valor_texto, valor_numero, valor_bool, valor_data, valor_hora, valor_opcao, valor_supplier_id, updated_at, aguarda_conferencia, visivel_portal, pergunta_cliente"
      )
      .eq("event_id", eventId)
      .order("ordem"),
  ]);

  const objsRaw = objRes.data ?? [];
  const decsRaw = decRes.data ?? [];
  const camposRaw = campoRes.data ?? [];

  // Blueprint (4C): tarefas que cada decisão-modelo gera. Lido pelo
  // decisao_template_id para mostrar os NOMES REAIS no painel.
  const templateIds = [
    ...new Set(
      decsRaw
        .map((d) => d.decisao_template_id)
        .filter((x): x is string => x !== null)
    ),
  ];
  const blueprintPorTemplate = new Map<string, string[]>();
  const codigoPorTemplate = new Map<string, string>();
  if (templateIds.length > 0) {
    const [bpRes, codRes] = await Promise.all([
      supabase
        .from("metodo_tarefa")
        .select("decisao_id, titulo, ordem")
        .in("decisao_id", templateIds)
        .order("ordem"),
      supabase
        .from("metodo_decisao")
        .select("id, codigo")
        .in("id", templateIds),
    ]);
    for (const t of bpRes.data ?? []) {
      const arr = blueprintPorTemplate.get(t.decisao_id) ?? [];
      arr.push(t.titulo);
      blueprintPorTemplate.set(t.decisao_id, arr);
    }
    for (const c of codRes.data ?? []) codigoPorTemplate.set(c.id, c.codigo);
  }

  const diasAteEvento = dataEvento
    ? differenceInCalendarDays(
        new Date(`${dataEvento}T00:00:00`),
        new Date(new Date().toDateString())
      )
    : null;

  // campos por decisão
  const camposPorDec = new Map<string, Campo[]>();
  for (const c of camposRaw) {
    const campo: Campo = {
      id: c.id,
      codigo: c.codigo,
      label: c.label,
      tipo: c.tipo,
      opcoes: c.opcoes,
      unidade: c.unidade,
      ordem: c.ordem,
      valorTexto: c.valor_texto,
      valorNumero: c.valor_numero,
      valorBool: c.valor_bool,
      valorData: c.valor_data,
      valorHora: c.valor_hora,
      valorOpcao: c.valor_opcao,
      valorSupplierId: c.valor_supplier_id,
      updatedAt: c.updated_at,
      aguardaConferencia: c.aguarda_conferencia,
      visivelPortal: c.visivel_portal,
      perguntaCliente: c.pergunta_cliente,
    };
    const arr = camposPorDec.get(c.evento_decisao_id) ?? [];
    arr.push(campo);
    camposPorDec.set(c.evento_decisao_id, arr);
  }

  // decisões por objetivo
  const decsPorObj = new Map<string, Decisao[]>();
  const todasDecisoes: Decisao[] = [];
  for (const d of decsRaw) {
    const campos = camposPorDec.get(d.id) ?? [];
    const dec: Decisao = {
      id: d.id,
      objetivoId: d.evento_objetivo_id,
      codigo: d.decisao_template_id
        ? codigoPorTemplate.get(d.decisao_template_id) ?? null
        : null,
      titulo: d.titulo,
      descricao: d.descricao,
      responsavel: d.responsavel,
      offsetIdealDias: d.offset_ideal_dias,
      offsetMinDias: d.offset_min_dias,
      offsetMaxDias: d.offset_max_dias,
      prazoPrevisto: d.prazo_previsto,
      prioridade: d.prioridade,
      ordem: d.ordem,
      estado: d.estado,
      campos,
      camposPreenchidos: campos.filter((c) => valorDoCampo(c) !== null).length,
      aguardamConferencia: campos.filter((c) => c.aguardaConferencia).length,
      gerariaTarefas: d.decisao_template_id
        ? blueprintPorTemplate.get(d.decisao_template_id) ?? []
        : [],
    };
    const arr = decsPorObj.get(d.evento_objetivo_id) ?? [];
    arr.push(dec);
    decsPorObj.set(d.evento_objetivo_id, arr);
    todasDecisoes.push(dec);
  }

  const objetivos: Objetivo[] = objsRaw.map((o) => {
    const decisoes = decsPorObj.get(o.id) ?? [];
    const aplicaveis = decisoes.filter((d) => d.estado !== "nao_se_aplica");
    const decididas = aplicaveis.filter((d) => d.estado === "decidida");

    // Janela do objetivo = a decisão pendente com o prazo recalculado mais
    // próximo (4D). É o "quando começar" real, já comprimido ao prazo do
    // casal — não o offset cru do método.
    const pendentes = decisoes.filter((d) => d.estado === "pendente");
    const proximoPrazo = pendentes
      .map((d) => d.prazoPrevisto)
      .filter((p): p is string => p !== null)
      .sort()[0] ?? null;

    // Nada pendente e havia o que decidir = acabou. Isto vem ANTES do
    // cálculo de janela: objetivo concluído não tem "quando começar".
    const concluido = aplicaveis.length > 0 && pendentes.length === 0;

    let bucket: Bucket = concluido ? "concluido" : "depois";
    let faltamDias: number | null = null;
    let janelaDias: number | null = null;
    if (proximoPrazo) {
      faltamDias = differenceInCalendarDays(
        new Date(`${proximoPrazo}T00:00:00`),
        new Date(new Date().toDateString())
      );
      janelaDias = faltamDias;
      bucket =
        faltamDias <= 30 ? "agora" : faltamDias <= 90 ? "proximas" : "depois";
    } else if (diasAteEvento !== null) {
      // sem prazo recalculado (evento sem data): mantém o dias-até-evento.
      faltamDias = diasAteEvento;
    }

    return {
      id: o.id,
      nome: o.nome,
      descricao: o.descricao,
      ordem: o.ordem,
      ativo: o.ativo,
      valorPrevisto: o.valor_previsto,
      faixaPctMin: o.faixa_pct_min,
      faixaPctIdeal: o.faixa_pct_ideal,
      faixaPctMax: o.faixa_pct_max,
      responsavelDominante: responsavelDominante(decisoes),
      decisoes,
      decididas: decididas.length,
      aplicaveis: aplicaveis.length,
      janelaDias,
      bucket,
      faltamDias,
    };
  });

  // Progresso PONDERADO por importância (prioridade), não por contagem.
  // nao_se_aplica sai do cálculo — não é dívida nem conquista.
  const aplic = todasDecisoes.filter((d) => d.estado !== "nao_se_aplica");
  const pesoTotal = aplic.reduce((s, d) => s + d.prioridade, 0);
  const pesoFeito = aplic
    .filter((d) => d.estado === "decidida")
    .reduce((s, d) => s + d.prioridade, 0);
  const progressoPct =
    pesoTotal > 0 ? Math.round((pesoFeito / pesoTotal) * 100) : 0;

  // 3 decisões mais críticas AGORA: pendentes, maior prioridade primeiro.
  const criticas: DecisaoCritica[] = todasDecisoes
    .filter((d) => d.estado === "pendente")
    .sort((a, b) => b.prioridade - a.prioridade || a.ordem - b.ordem)
    .slice(0, 3)
    .map((d) => ({
      ...d,
      objetivoNome:
        objetivos.find((o) => o.id === d.objetivoId)?.nome ?? "",
    }));

  // ---- Termômetro (5C) ----
  // Verba e reserva são campos tipados da decisão "Levantar o budget".
  const campoValor = (codigo: string): number | null => {
    for (const d of todasDecisoes) {
      const c = d.campos.find((c) => c.codigo === codigo);
      if (c && c.valorNumero !== null) return Number(c.valorNumero);
    }
    return null;
  };
  const verbaTotal = campoValor("verba_total");
  const reservaPct = campoValor("reserva_pct");
  const reservaValor =
    verbaTotal !== null && reservaPct !== null
      ? Math.round(verbaTotal * reservaPct) / 100
      : 0;
  const ativos = objetivos.filter((o) => o.ativo);
  const comprometido =
    ativos.reduce((s, o) => s + (Number(o.valorPrevisto) || 0), 0) +
    reservaValor;
  const saldo = verbaTotal !== null ? verbaTotal - comprometido : null;

  // Ressalva 4 — distribuição desatualizada: algum previsto fora da faixa
  // atual do objetivo (ex.: cenário mudou de salão para praia depois da
  // distribuição). Detectado na leitura; a tela oferece re-sugerir.
  const base =
    verbaTotal !== null ? verbaTotal - reservaValor : null;
  const distribuicaoDesatualizada =
    base !== null &&
    base > 0 &&
    ativos.some((o) => {
      if (o.valorPrevisto === null) return false;
      if (o.faixaPctMin === null || o.faixaPctMax === null) return false;
      const pct = (Number(o.valorPrevisto) / base) * 100;
      return pct < o.faixaPctMin - 1 || pct > o.faixaPctMax + 1;
    });

  // 4D — densidade da agenda: decisões pendentes ÷ meses até o evento.
  // O aviso de ritmo intenso é não bloqueante e só aparece quando o método
  // teve de ser comprimido (algum offset estruturante não coube no prazo) E
  // a densidade ficou alta demais para ser realista.
  const pendentesAplic = aplic.filter((d) => d.estado === "pendente");
  const meses =
    diasAteEvento !== null && diasAteEvento > 0
      ? Math.max(1, Math.ceil(diasAteEvento / 30))
      : null;
  const densidadeMensal =
    meses !== null ? Math.ceil(pendentesAplic.length / meses) : 0;
  const metodoComprimido =
    diasAteEvento !== null &&
    pendentesAplic.some(
      (d) => d.offsetIdealDias !== null && d.offsetIdealDias > diasAteEvento
    );
  const ritmoApertado = metodoComprimido && densidadeMensal >= 6;

  return {
    temArvore: objsRaw.length > 0,
    dataEvento,
    diasAteEvento,
    progressoPct,
    criticas,
    objetivos,
    verba: {
      total: verbaTotal,
      reservaPct,
      reservaValor,
      comprometido,
      saldo,
      distribuicaoDesatualizada,
    },
    densidadeMensal,
    ritmoApertado,
  };
}
