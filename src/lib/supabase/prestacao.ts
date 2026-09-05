// A montagem da prestação de contas — leitura de servidor.
//
// A conta mora em prestacao-core.ts (puro); aqui só se lê o banco e se
// traduz para a entrada da montagem, REUSANDO as réguas que já existem:
// montarLinhas/resumoVerba (verba-fornecedores) e calcularVariacao
// (cronograma). Nada de cálculo novo — cálculo novo diverge.

import { createClient } from "@/lib/supabase/server";
import {
  montarLinhas,
  resumoVerba,
  type ParcelaFornecedor,
  type VerbaFornecedor,
} from "@/lib/verba-fornecedores";
import { calcularVariacao } from "@/lib/cronograma";
import {
  montarPayloadCasal,
  SECOES_NOTA,
  type ItemDiaPrestacao,
  type OcorrenciaPrestacao,
  type ParcelaPrestacao,
  type PrestacaoPayload,
} from "@/lib/prestacao-core";

const hhmm = (t: string | null): string | null => (t ? t.slice(0, 5) : null);

/** A linha da conferência pós-evento (139), para a revisão. */
export type ConferenciaFornecedor = {
  orcamentoId: string;
  fornecedor: string;
  contratado: number;
  realizado: number | null;
};

/** Ocorrência completa (139), para a revisão — com o interruptor dela. */
export type OcorrenciaEvento = OcorrenciaPrestacao & {
  id: string;
  visivelAoCasal: boolean;
};

/** O documento como está AGORA (o rascunho vivo que ela revisa). */
export async function getPrestacaoAoVivo(eventId: string): Promise<{
  payload: PrestacaoPayload;
  notas: Record<string, string>;
  conferencia: ConferenciaFornecedor[];
  ocorrencias: OcorrenciaEvento[];
} | null> {
  const supabase = createClient();

  const [evRes, verbaRes, parcRes, roteiroRes, notasRes, publicoRes, ocorRes, presRes, portaRes] =
    await Promise.all([
      supabase
        .from("events")
        .select("name, date, location, city, verba_total, clients(name)")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("evento_fornecedor_orcamento")
        .select(
          "id, supplier_id, valor_estimado_inicial, valor_alocado, valor_realizado, suppliers(name), evento_fornecedor_item(id, descricao, valor_estimado_inicial, valor_negociado)"
        )
        .eq("event_id", eventId),
      supabase
        .from("transactions")
        .select("id, supplier_id, description, value, due_date, paid, paid_at, suppliers(name)")
        .eq("event_id", eventId)
        .eq("conta", "fornecedor")
        // a regra canônica da 135: pago ao fornecedor = despesa
        .eq("type", "despesa")
        .order("due_date", { ascending: true }),
      supabase
        .from("roteiro_items")
        .select('id, title, time, time_original, horario_real_inicio, status_novo, "order"')
        .eq("event_id", eventId)
        .order("order", { ascending: true }),
      supabase
        .from("evento_relatorio_nota")
        .select("secao, texto")
        .eq("event_id", eventId),
      supabase.rpc("publico_do_evento", { p_event_id: eventId }),
      // ocorrências (139) — degrada para vazio se a migração não rodou
      supabase
        .from("evento_ocorrencia")
        .select(
          "id, tipo, descricao, valor, resolvida, visivel_ao_casal, suppliers(name)"
        )
        .eq("event_id", eventId)
        .order("criada_em", { ascending: true }),
      // presença no dia: a ÚNICA fórmula de "quantos chegaram" mora no
      // livro de chegadas (148) — somar 1 + acompanhantes + crianças aqui
      // divergiria dela assim que a porta marcasse um acompanhante nominal
      // sem o titular. Degrada para null se a 148 não rodou.
      supabase.rpc("presentes_do_evento", { p_event_id: eventId }),
      // o carimbo dela: "encerrei a contagem da porta" (148). Consulta à
      // parte para a coluna ausente não derrubar a leitura do evento.
      supabase
        .from("events")
        .select("porta_encerrada_em")
        .eq("id", eventId)
        .maybeSingle(),
    ]);

  const ev = evRes.data as {
    name: string | null;
    date: string;
    location: string | null;
    city: string | null;
    verba_total: number | string | null;
    clients: { name: string } | { name: string }[] | null;
  } | null;
  if (!ev) return null;

  const clientes = Array.isArray(ev.clients) ? ev.clients[0] : ev.clients;

  // 42703 = a 139 ainda não rodou (valor_realizado não existe): busca de
  // novo sem a coluna, para o documento não perder os fornecedores
  let verbaData = verbaRes.data as any[] | null;
  if (verbaRes.error?.code === "42703") {
    const denovo = await supabase
      .from("evento_fornecedor_orcamento")
      .select(
        "id, supplier_id, valor_estimado_inicial, valor_alocado, suppliers(name), evento_fornecedor_item(id, descricao, valor_estimado_inicial, valor_negociado)"
      )
      .eq("event_id", eventId);
    verbaData = denovo.data as any[] | null;
  }

  // ---- fornecedores, pelas réguas da aba (montarLinhas/resumoVerba) ----
  const verbas: VerbaFornecedor[] = ((verbaData ?? []) as any[]).map((v) => ({
    id: v.id,
    supplier_id: v.supplier_id,
    fornecedor: (Array.isArray(v.suppliers) ? v.suppliers[0] : v.suppliers)?.name ?? "Fornecedor",
    valor_estimado_inicial:
      v.valor_estimado_inicial == null ? null : Number(v.valor_estimado_inicial),
    valor_alocado: v.valor_alocado == null ? null : Number(v.valor_alocado),
    observacao: null, // observação da verba é interna — não atravessa
    itens: (v.evento_fornecedor_item ?? []).map((i: any) => ({
      id: i.id,
      descricao: i.descricao,
      valor_estimado_inicial:
        i.valor_estimado_inicial == null ? null : Number(i.valor_estimado_inicial),
      valor_negociado: i.valor_negociado == null ? null : Number(i.valor_negociado),
    })),
  }));

  const parcelasFornecedor: ParcelaFornecedor[] = ((parcRes.data ?? []) as any[]).map(
    (p) => ({
      id: p.id,
      supplier_id: p.supplier_id,
      description: p.description,
      value: Number(p.value),
      due_date: p.due_date,
      paid: Boolean(p.paid),
      paid_at: p.paid_at,
    })
  );

  const linhas = montarLinhas(verbas, parcelasFornecedor);
  const resumo = resumoVerba(linhas);

  // o valor conferido pós-evento (139), por orçamento de fornecedor
  const realizadoPorOrcamento = new Map<string, number | null>(
    ((verbaData ?? []) as any[]).map((v) => [
      v.id as string,
      v.valor_realizado == null ? null : Number(v.valor_realizado),
    ])
  );

  // ---- ocorrências (139): a lista completa para a revisão ----
  const ocorrencias: OcorrenciaEvento[] = ((ocorRes.data ?? []) as any[]).map(
    (o) => ({
      id: o.id,
      tipo: o.tipo,
      descricao: o.descricao,
      valor: o.valor == null ? null : Number(o.valor),
      resolvida: Boolean(o.resolvida),
      visivelAoCasal: Boolean(o.visivel_ao_casal),
      fornecedor:
        (Array.isArray(o.suppliers) ? o.suppliers[0] : o.suppliers)?.name ?? null,
    })
  );

  // ---- parcelas como o casal as verá (nome do fornecedor, nunca id) ----
  const nomePorSupplier = new Map(
    linhas.map((l) => [l.supplier_id, l.fornecedor] as const)
  );
  const parcelas: ParcelaPrestacao[] = ((parcRes.data ?? []) as any[]).map((p) => ({
    fornecedor:
      (Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers)?.name ??
      nomePorSupplier.get(p.supplier_id) ??
      null,
    descricao: p.description ?? null,
    valor: Number(p.value),
    vencimento: p.due_date,
    paga: Boolean(p.paid),
    paga_em: p.paid_at ? String(p.paid_at).slice(0, 10) : null,
  }));

  // ---- o dia: título e horários, NADA interno (régua do programa) ----
  const roteiro = (roteiroRes.data ?? []) as {
    title: string;
    time: string | null;
    time_original: string | null;
    horario_real_inicio: string | null;
    status_novo: string | null;
  }[];
  const dia: ItemDiaPrestacao[] = roteiro.map((r) => ({
    titulo: r.title,
    previsto: hhmm(r.time),
    previsto_original: hhmm(r.time_original),
    realizado_inicio: r.horario_real_inicio
      ? new Date(r.horario_real_inicio).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        })
      : null,
    variacao: calcularVariacao(r.time, r.horario_real_inicio).status,
  }));
  const diaConcluidos = roteiro.filter((r) => r.status_novo === "concluido").length;

  // ---- convidados (o número canônico, com a origem dita) ----
  const pub = (publicoRes.data as { quantidade: number; origem: string }[] | null)?.[0];
  // presentes vem do livro no mesmo padrão de gente que publico_do_evento
  // conta confirmados (titular + acompanhantes + crianças) — senão o
  // "por pessoa" divide maçã por pera
  const pres = (presRes.data as { quantidade: number; origem: string }[] | null)?.[0];
  const presentes = presRes.error ? null : Number(pres?.quantidade ?? 0);
  const porta = portaRes.data as { porta_encerrada_em: string | null } | null;
  const convidados = {
    quantidade: pub?.quantidade ?? 0,
    origem: (pub?.origem === "confirmados" ? "confirmados" : "estimados") as
      | "confirmados"
      | "estimados",
    presentes,
    // sem o carimbo, presentes é informação ao lado — não o divisor
    porta_encerrada: Boolean(!portaRes.error && porta?.porta_encerrada_em),
  };

  // ---- notas dela ----
  const notas: Record<string, string> = {};
  for (const n of (notasRes.data ?? []) as { secao: string; texto: string }[]) {
    if ((SECOES_NOTA as readonly string[]).includes(n.secao)) notas[n.secao] = n.texto;
  }

  const payload = montarPayloadCasal({
    evento: {
      nome: ev.name || clientes?.name || "Evento",
      data: ev.date,
      local: ev.location || ev.city,
      verba: ev.verba_total == null ? null : Number(ev.verba_total),
    },
    fornecedores: linhas.map((l) => ({
      nome: l.fornecedor,
      estimado: l.valor_estimado_inicial,
      contratado: l.total,
      realizado: realizadoPorOrcamento.get(l.id) ?? null,
      pago: l.pago,
    })),
    // ao casal, só o que ela marcou visível
    ocorrencias: ocorrencias
      .filter((o) => o.visivelAoCasal)
      .map(({ id: _id, visivelAoCasal: _v, ...resto }) => resto),
    parcelas,
    dia,
    diaConcluidos,
    convidados,
    economia: resumo.economia,
    fornecedoresComEstimativa: resumo.comEstimativa,
    notas,
  });

  const conferencia: ConferenciaFornecedor[] = linhas.map((l) => ({
    orcamentoId: l.id,
    fornecedor: l.fornecedor,
    contratado: l.total,
    realizado: realizadoPorOrcamento.get(l.id) ?? null,
  }));

  return { payload, notas, conferencia, ocorrencias };
}

export type VersaoEntregue = { versao: number; entregue_em: string };

export async function getVersoesEntregues(eventId: string): Promise<VersaoEntregue[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("evento_relatorio")
    .select("versao, entregue_em")
    .eq("event_id", eventId)
    .eq("destino", "casal")
    .order("versao", { ascending: false });
  return (data ?? []) as VersaoEntregue[];
}
