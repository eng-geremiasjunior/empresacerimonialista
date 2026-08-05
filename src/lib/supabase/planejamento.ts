// Dados da tela de Planejamento (4B). Consome a árvore do método (4A):
// evento_objetivo → evento_decisao → evento_guia. Tudo real, nada mockado.
//
// O objeto dominante é a DECISÃO. A tela tem duas camadas: a fila das 3
// decisões mais críticas agora e o mapa temporal por objetivo.

import { differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";

export type EstadoDecisao = "pendente" | "decidida" | "nao_se_aplica";
export type Responsavel = "noivos" | "cerimonialista" | "ambos";

export type Guia = {
  id: string;
  texto: string;
  ordem: number;
  marcado: boolean;
};

export type Decisao = {
  id: string;
  objetivoId: string;
  titulo: string;
  descricao: string | null;
  responsavel: Responsavel;
  offsetIdealDias: number | null;
  prioridade: number;
  ordem: number;
  estado: EstadoDecisao;
  guias: Guia[];
  guiasMarcados: number;
  // Nomes reais das tarefas que esta decisão gera na Organização (do
  // blueprint do método, 4C). Vazio para decisões sem blueprint.
  gerariaTarefas: string[];
};

export type Bucket = "agora" | "proximas" | "depois";

export type Objetivo = {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
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

export type Planejamento = {
  temArvore: boolean;
  diasAteEvento: number | null;
  // progresso PONDERADO por prioridade (não por quantidade)
  progressoPct: number;
  criticas: DecisaoCritica[];
  objetivos: Objetivo[];
  // sinalização de prazo apertado (todas as janelas já venceram)
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

  const [objRes, decRes, guiaRes] = await Promise.all([
    supabase
      .from("evento_objetivo")
      .select("id, nome, descricao, ordem, ativo")
      .eq("event_id", eventId)
      .order("ordem"),
    supabase
      .from("evento_decisao")
      .select(
        "id, evento_objetivo_id, decisao_template_id, titulo, descricao, responsavel, offset_ideal_dias, prioridade, ordem, estado"
      )
      .eq("event_id", eventId)
      .order("ordem"),
    supabase
      .from("evento_guia")
      .select("id, evento_decisao_id, texto, ordem, marcado")
      .eq("event_id", eventId)
      .order("ordem"),
  ]);

  const objsRaw = objRes.data ?? [];
  const decsRaw = decRes.data ?? [];
  const guiasRaw = guiaRes.data ?? [];

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
  if (templateIds.length > 0) {
    const { data: bp } = await supabase
      .from("metodo_tarefa")
      .select("decisao_id, titulo, ordem")
      .in("decisao_id", templateIds)
      .order("ordem");
    for (const t of bp ?? []) {
      const arr = blueprintPorTemplate.get(t.decisao_id) ?? [];
      arr.push(t.titulo);
      blueprintPorTemplate.set(t.decisao_id, arr);
    }
  }

  const diasAteEvento = dataEvento
    ? differenceInCalendarDays(
        new Date(`${dataEvento}T00:00:00`),
        new Date(new Date().toDateString())
      )
    : null;

  // guias por decisão
  const guiasPorDec = new Map<string, Guia[]>();
  for (const g of guiasRaw) {
    const arr = guiasPorDec.get(g.evento_decisao_id) ?? [];
    arr.push({ id: g.id, texto: g.texto, ordem: g.ordem, marcado: g.marcado });
    guiasPorDec.set(g.evento_decisao_id, arr);
  }

  // decisões por objetivo
  const decsPorObj = new Map<string, Decisao[]>();
  const todasDecisoes: Decisao[] = [];
  for (const d of decsRaw) {
    const guias = guiasPorDec.get(d.id) ?? [];
    const dec: Decisao = {
      id: d.id,
      objetivoId: d.evento_objetivo_id,
      titulo: d.titulo,
      descricao: d.descricao,
      responsavel: d.responsavel,
      offsetIdealDias: d.offset_ideal_dias,
      prioridade: d.prioridade,
      ordem: d.ordem,
      estado: d.estado,
      guias,
      guiasMarcados: guias.filter((g) => g.marcado).length,
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

    // janela ideal = maior offset entre as decisões pendentes (a que
    // precisa começar mais cedo). Sem pendente, cai no maior offset geral.
    const pendentes = decisoes.filter((d) => d.estado === "pendente");
    const offsets = (pendentes.length ? pendentes : decisoes)
      .map((d) => d.offsetIdealDias)
      .filter((n): n is number => n !== null);
    const janelaDias = offsets.length ? Math.max(...offsets) : null;

    // Bucket por gap = diasAteEvento - janela. Janela vencida/no ponto →
    // AGORA; a poucos meses → PRÓXIMAS; longe → DEPOIS.
    let bucket: Bucket = "depois";
    let faltamDias: number | null = janelaDias;
    if (diasAteEvento !== null && janelaDias !== null) {
      const gap = diasAteEvento - janelaDias;
      bucket = gap <= 0 ? "agora" : gap <= 60 ? "proximas" : "depois";
      // mostra o menor entre "dias até o evento" e a janela ideal
      faltamDias = Math.min(diasAteEvento, janelaDias);
    } else if (diasAteEvento !== null) {
      faltamDias = diasAteEvento;
    }

    return {
      id: o.id,
      nome: o.nome,
      descricao: o.descricao,
      ordem: o.ordem,
      ativo: o.ativo,
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

  // Ritmo apertado: a janela ideal de alguma decisão de alta prioridade já
  // venceu (offset > dias até o evento). Só sinaliza, não altera dado.
  const ritmoApertado =
    diasAteEvento !== null &&
    aplic.some(
      (d) =>
        d.estado === "pendente" &&
        d.offsetIdealDias !== null &&
        d.offsetIdealDias > diasAteEvento &&
        d.prioridade >= 100
    );

  return {
    temArvore: objsRaw.length > 0,
    diasAteEvento,
    progressoPct,
    criticas,
    objetivos,
    ritmoApertado,
  };
}
