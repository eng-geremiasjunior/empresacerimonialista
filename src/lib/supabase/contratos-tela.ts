// A leitura da área de Contratos — global (todas) ou de um evento.
//
// Molde de fornecedores-tela.ts: uma consulta base com embeds + lotes
// .in() em paralelo; erro de lote LANÇA — "0 contratos" e "tudo
// conferido" são afirmações, e afirmá-las porque a rede caiu é pior do
// que não mostrar a tela. A RLS (eventos_visiveis + cargo) é a cláusula
// de escopo; nada filtra por empresa à mão.

import { createClient } from "@/lib/supabase/server";
import { cobraContrato } from "@/lib/supabase/fornecedores-tela";
import type {
  ContratoLinha,
  ExtracaoResumo,
  SemContratoLinha,
} from "@/lib/contratos-lista";
import type { PropostaExtracao } from "@/lib/contrato-extracao-core";
import type { EscolhasAplicacao } from "@/app/(app)/eventos/[id]/fornecedores/extracao-actions";

export type ContratosTelaResult = {
  linhas: ContratoLinha[];
  semContrato: SemContratoLinha[];
  /** true quando a 138/140 ainda não rodou neste banco */
  migracaoPendente: boolean;
};

type EventoEmbed = {
  name: string | null;
  date: string;
  status: string;
  archived: boolean | null;
  clients: { name: string } | { name: string }[] | null;
};

const nomeDoEvento = (ev: EventoEmbed): string => {
  const cliente = Array.isArray(ev.clients) ? ev.clients[0] : ev.clients;
  return ev.name || cliente?.name || "Evento";
};

export async function getContratosDaTela(
  eventId?: string
): Promise<ContratosTelaResult> {
  const supabase = createClient();
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  let base = supabase
    .from("solicitacao_fornecedor")
    .select(
      "id, event_id, supplier_id, status, prazo_ate, tentativas, enviada_em, respondida_em, resposta, " +
        "events!inner(name, date, status, archived, clients(name)), " +
        "suppliers(name), " +
        "contrato_extracao(id, status, payload, aplicado, conferida_em, descartada_em)"
    )
    .eq("tipo", "contrato")
    .neq("status", "cancelada")
    .limit(2000);
  if (eventId) base = base.eq("event_id", eventId);

  const solRes = await base;

  // banco sem a 138/140: a tela orienta em vez de explodir
  if (
    solRes.error?.code === "42703" ||
    solRes.error?.code === "PGRST200" ||
    solRes.error?.code === "42P01"
  ) {
    return { linhas: [], semContrato: [], migracaoPendente: true };
  }
  if (solRes.error) {
    throw new Error(`[vela:contratos] leitura base falhou: ${solRes.error.message}`);
  }

  type SolCrua = {
    id: string;
    event_id: string;
    supplier_id: string;
    status: string;
    prazo_ate: string | null;
    tentativas: number | null;
    enviada_em: string | null;
    respondida_em: string | null;
    resposta: {
      arquivo_path?: string;
      arquivo_nome?: string;
      origem?: string;
    } | null;
    events: EventoEmbed | EventoEmbed[];
    suppliers: { name: string } | { name: string }[] | null;
    // UNIQUE em solicitacao_id: o PostgREST devolve o embed como OBJETO
    // (to-one), não array — tratar os dois formatos
    contrato_extracao:
      | {
          id: string;
          status: string;
          payload: PropostaExtracao;
          aplicado: EscolhasAplicacao | null;
          conferida_em: string | null;
          descartada_em: string | null;
        }
      | {
          id: string;
          status: string;
          payload: PropostaExtracao;
          aplicado: EscolhasAplicacao | null;
          conferida_em: string | null;
          descartada_em: string | null;
        }[]
      | null;
  };
  const crus = (solRes.data ?? []) as unknown as SolCrua[];

  const eventIds = [...new Set(crus.map((s) => s.event_id))];

  // lotes em paralelo: o item de roteiro por fornecedor (destino do
  // horário na conferência) e os vínculos para a visão "sem contrato"
  const [roteiroRes, vinculosRes] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from("roteiro_items")
          .select('event_id, supplier_id, title, time, "order"')
          .in("event_id", eventIds)
          .not("supplier_id", "is", null)
          .order("time", { ascending: true, nullsFirst: false })
          .order("order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("roteiro_links")
      .select(
        "supplier_id, event_id, suppliers(name), events!inner(name, date, status, archived, clients(name))"
      )
      .then((r) =>
        eventId
          ? { ...r, data: (r.data ?? []).filter((v: any) => v.event_id === eventId) }
          : r
      ),
  ]);
  if (roteiroRes.error || vinculosRes.error) {
    throw new Error(
      `[vela:contratos] leitura em lote falhou: ${
        roteiroRes.error?.message ?? vinculosRes.error?.message
      }`
    );
  }

  // o item mais cedo de cada par (evento, fornecedor) — a query já vem
  // ordenada, o primeiro vence
  const itemPor = new Map<string, string>();
  for (const r of (roteiroRes.data ?? []) as {
    event_id: string;
    supplier_id: string;
    title: string;
  }[]) {
    const chave = `${r.event_id}|${r.supplier_id}`;
    if (!itemPor.has(chave)) itemPor.set(chave, r.title);
  }

  const linhas: ContratoLinha[] = [];
  for (const s of crus) {
    const ev = Array.isArray(s.events) ? s.events[0] : s.events;
    if (!ev || ev.archived === true) continue;
    // cobrança de evento que já passou (ou saiu de confirmado) não é
    // mais acionável — mesma régua do cobraContrato: sem alarme eterno
    if (s.status !== "respondida" && !cobraContrato(ev, hoje)) continue;

    const sup = Array.isArray(s.suppliers) ? s.suppliers[0] : s.suppliers;
    const path = s.resposta?.arquivo_path ?? null;
    const extRow = Array.isArray(s.contrato_extracao)
      ? (s.contrato_extracao[0] ?? null)
      : (s.contrato_extracao ?? null);
    const extracao: ExtracaoResumo | null = extRow
      ? {
          id: extRow.id,
          status: extRow.status as ExtracaoResumo["status"],
          payload: extRow.payload,
          aplicado: extRow.aplicado,
          conferidaEm: extRow.conferida_em,
          descartadaEm: extRow.descartada_em,
        }
      : null;

    linhas.push({
      solicitacaoId: s.id,
      eventId: s.event_id,
      eventoNome: nomeDoEvento(ev),
      eventoData: ev.date,
      supplierId: s.supplier_id,
      fornecedorNome: sup?.name ?? "Fornecedor",
      statusSolicitacao: s.status as ContratoLinha["statusSolicitacao"],
      tentativas: s.tentativas ?? 0,
      prazoAte: s.prazo_ate,
      enviadaEm: s.enviada_em,
      respondidaEm: s.respondida_em,
      arquivo: path
        ? {
            path,
            nome: s.resposta?.arquivo_nome ?? "contrato",
            origem:
              s.resposta?.origem === "cerimonialista"
                ? "cerimonialista"
                : "fornecedor",
            ehPdf: path.toLowerCase().endsWith(".pdf"),
          }
        : null,
      extracao,
      itemRoteiroTitulo: itemPor.get(`${s.event_id}|${s.supplier_id}`) ?? null,
    });
  }

  // "sem contrato": vínculo em evento vivo que cobra contrato e não tem
  // NENHUM pedido (a base já traz todos os não-cancelados)
  const temPedido = new Set(crus.map((s) => `${s.event_id}|${s.supplier_id}`));
  const semContrato: SemContratoLinha[] = [];
  for (const v of (vinculosRes.data ?? []) as unknown as {
    supplier_id: string;
    event_id: string;
    suppliers: { name: string } | { name: string }[] | null;
    events: EventoEmbed | EventoEmbed[];
  }[]) {
    const ev = Array.isArray(v.events) ? v.events[0] : v.events;
    if (!ev || !cobraContrato(ev, hoje)) continue;
    if (temPedido.has(`${v.event_id}|${v.supplier_id}`)) continue;
    const sup = Array.isArray(v.suppliers) ? v.suppliers[0] : v.suppliers;
    semContrato.push({
      supplierId: v.supplier_id,
      fornecedorNome: sup?.name ?? "Fornecedor",
      eventId: v.event_id,
      eventoNome: nomeDoEvento(ev),
      eventoData: ev.date,
    });
  }

  return { linhas, semContrato, migracaoPendente: false };
}
