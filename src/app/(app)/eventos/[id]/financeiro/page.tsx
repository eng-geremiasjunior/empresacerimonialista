import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getFinanceiroEvento } from "@/lib/supabase/financeiro";
import { ResumoContrato } from "@/components/financeiro/ResumoContrato";
import { SecaoReceitas } from "@/components/financeiro/SecaoReceitas";
import { ListaDespesas } from "@/components/financeiro/ListaDespesas";
import { FinanceiroTabs } from "@/components/financeiro/FinanceiroTabs";
import { FinanceiroEvento } from "@/components/financeiro/FinanceiroEvento";
import {
  getFinanceiroDoEvento,
  getNumerosDoFechamento,
} from "@/lib/supabase/financeiro-evento";
import { linhasParaConciliar } from "./lancamento-actions";
import {
  getPrestacaoAoVivo,
  getVersoesEntregues,
} from "@/lib/supabase/prestacao";
import { PrestacaoDeContas } from "@/components/financeiro/PrestacaoDeContas";
import {
  PendenciasFinanceiras,
  type Pendencia,
} from "@/components/financeiro/PendenciasFinanceiras";
import {
  ItensOrcamentoOriginal,
  type ItemOrcamentoOriginal,
} from "@/components/financeiro/ItensOrcamentoOriginal";
import type {
  ParcelaFornecedor,
  VerbaFornecedor,
} from "@/lib/verba-fornecedores";
import { hojeBR } from "@/lib/tempo";

export default async function EventoFinanceiroPage({
  params,
}: {
  params: { id: string };
}) {
  const eventId = params.id;
  const supabase = createClient();
  const todayIso = hojeBR();

  const [fin, linksRes, orcRes, verbasRes, parcelasRes, pendRes] =
    await Promise.all([
    // Aba Assessoria: a mesma tela de sempre, só com a conta dela.
    getFinanceiroEvento(eventId, "assessoria"),
    supabase
      .from("roteiro_links")
      .select("supplier_id, suppliers(name)")
      .eq("event_id", eventId),
    // Orçamento que originou o evento (se houver). Só leitura: os itens
    // são resumo do que foi vendido, não lançamento financeiro.
    supabase
      .from("orcamentos")
      .select(
        "id, valor_total, orcamento_itens(nome, descricao, valor_calculado, ordem)"
      )
      .eq("evento_gerado_id", eventId)
      .maybeSingle(),
    supabase
      .from("evento_fornecedor_orcamento")
      .select(
        "id, supplier_id, valor_estimado_inicial, valor_alocado, observacao, suppliers(name), evento_fornecedor_item(id, descricao, valor_estimado_inicial, valor_negociado)"
      )
      .eq("event_id", eventId),
    supabase
      .from("transactions")
      .select("id, supplier_id, description, value, due_date, paid, paid_at")
      .eq("event_id", eventId)
      .eq("conta", "fornecedor")
      // A regra canônica (135): pago ao fornecedor = despesa. Sem este
      // filtro, um repasse da cliente ao caixa (receita em conta
      // fornecedor) inflava o gráfico de pagos por mês.
      .eq("type", "despesa")
      .order("due_date", { ascending: true }),
    // Pendências abertas pela automação (074). Degrada em silêncio se a
    // migração ainda não rodou.
    supabase
      .from("financeiro_pendencia")
      .select(
        "id, titulo, tipo, created_at, valor_sugerido, supplier_id, quantidade, evento_recurso_id"
      )
      .eq("event_id", eventId)
      .eq("status", "aberta")
      .order("created_at", { ascending: true }),
  ]);

  // A pendência passou a carregar o que já se sabe (132): valor,
  // fornecedor e a quantidade comprada. Antes vinha só o título, e ela
  // redigitava tudo.
  const pendencias: Pendencia[] = (pendRes.data ?? []).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    tipo: p.tipo as Pendencia["tipo"],
    criadaEm: p.created_at,
    valorSugerido: p.valor_sugerido == null ? null : Number(p.valor_sugerido),
    supplierId: (p.supplier_id as string | null) ?? null,
    quantidade: p.quantidade == null ? null : Number(p.quantidade),
    daOperacao: Boolean(p.evento_recurso_id),
  }));

  const orcamento = orcRes.data as {
    id: string;
    valor_total: number;
    orcamento_itens: (ItemOrcamentoOriginal & { ordem: number })[];
  } | null;
  const itensOrcamento = [...(orcamento?.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );

  const suppliers = ((linksRes.data ?? []) as unknown as {
    supplier_id: string;
    suppliers: { name: string } | null;
  }[])
    .filter((l) => l.suppliers)
    .map((l) => ({ id: l.supplier_id, name: l.suppliers!.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Coluna/tabela ausente (42703 / 42P01) => migração 063 pendente: a aba
  // Fornecedores orienta em vez de quebrar.
  const migracaoPendente =
    verbasRes.error?.code === "42703" ||
    verbasRes.error?.code === "42P01" ||
    verbasRes.error?.code === "PGRST205";

  const verbas: VerbaFornecedor[] = (
    (verbasRes.data ?? []) as unknown as {
      id: string;
      supplier_id: string;
      valor_estimado_inicial: number | null;
      valor_alocado: number | null;
      observacao: string | null;
      suppliers: { name: string } | null;
      evento_fornecedor_item: {
        id: string;
        descricao: string;
        valor_estimado_inicial: number | null;
        valor_negociado: number | null;
      }[];
    }[]
  ).map((v) => ({
    id: v.id,
    supplier_id: v.supplier_id,
    fornecedor: v.suppliers?.name ?? "Fornecedor",
    valor_estimado_inicial: v.valor_estimado_inicial,
    // null = veio do Planejamento sem contrato ainda (Alocação sem
    // Comprometimento) — não vira 0 para não inventar economia.
    valor_alocado: v.valor_alocado === null ? null : Number(v.valor_alocado),
    observacao: v.observacao,
    itens: v.evento_fornecedor_item ?? [],
  }));

  const parcelasFornecedor = ((parcelasRes.data ?? []) as unknown as
    ParcelaFornecedor[]).map((p) => ({ ...p, value: Number(p.value) }));

  const [
    dadosNovos,
    { data: evInfo },
    numFech,
    { data: fechRow },
    extrato,
    prestacaoViva,
    versoesEntregues,
  ] = await Promise.all([
    getFinanceiroDoEvento(eventId),
    supabase
      .from("events")
      .select("name, date, clients(name)")
      .eq("id", eventId)
      .maybeSingle(),
    getNumerosDoFechamento(eventId),
    supabase
      .from("evento_fechamento")
      .select(
        "fechado_em, sobra_destino, observacao, verba_realizada, receita_assessoria, custos_diretos"
      )
      .eq("event_id", eventId)
      .maybeSingle(),
    linhasParaConciliar(eventId),
    getPrestacaoAoVivo(eventId),
    getVersoesEntregues(eventId),
  ]);

  const dataEvento = (evInfo?.date as string) ?? todayIso;
  // o embed do PostgREST devolve array quando a relação não é única
  const cliente = Array.isArray(evInfo?.clients)
    ? (evInfo?.clients[0] as { name: string } | undefined)
    : (evInfo?.clients as { name: string } | null | undefined);
  const nomeEvento = (evInfo?.name as string) || cliente?.name || "Evento";

  return (
    <div className="space-y-8">
      {/* A tela nova (handoff do Financeiro): calendário, fila, verba por
          categoria, resumo e o drawer do comprovante. */}
      <FinanceiroEvento
        eventId={eventId}
        dados={dadosNovos}
        contexto={{
          evento: nomeEvento,
          data: dataEvento,
          diasAte: Math.round(
            (new Date(dataEvento + "T00:00:00").getTime() -
              new Date(todayIso + "T00:00:00").getTime()) /
              86400000
          ),
        }}
        fornecedores={suppliers}
        numerosFechamento={numFech}
        fechamento={
          fechRow
            ? {
                fechadoEm: fechRow.fechado_em as string,
                sobraDestino: fechRow.sobra_destino as string,
                observacao: (fechRow.observacao as string) ?? null,
                verbaRealizada: Number(fechRow.verba_realizada ?? 0),
                receitaAssessoria: Number(fechRow.receita_assessoria ?? 0),
                custosDiretos: Number(fechRow.custos_diretos ?? 0),
              }
            : null
        }
        linhasExtrato={extrato}
        prestacao={
          prestacaoViva ? (
            <PrestacaoDeContas
              eventId={eventId}
              payload={prestacaoViva.payload}
              notas={prestacaoViva.notas}
              versoes={versoesEntregues}
            />
          ) : null
        }
      />

      {/*
        TRANSITÓRIO — os controles que a tela nova ainda não absorveu:
        criar lançamento, gerar parcelas, pendências da automação e os
        itens do orçamento de origem. Ficam recolhidos para não competir
        com a tela principal, e saem daqui quando forem migrados.
      */}
      <details className="rounded-xl border border-gray-200 bg-white">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-gray-700">
          Lançamentos e ajustes
        </summary>
        <div className="border-t border-gray-100 p-5">
          <FinanceiroTabs
            eventId={eventId}
            verbas={verbas}
            parcelasFornecedor={parcelasFornecedor}
            todayIso={todayIso}
            fornecedoresDisponiveis={suppliers}
            migracaoPendente={migracaoPendente}
            assessoria={
        <div className="space-y-6">
          {/* O que a automação deixou aqui, antes de tudo: é a ação que a
              cerimonialista precisa resolver agora. */}
          <PendenciasFinanceiras
            eventId={eventId}
            pendencias={pendencias}
            fornecedores={suppliers}
          />

          {fin.migrationPendente && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
            >
              Esta parte ainda não está disponível. Avise a gente.
            </div>
          )}

          <ResumoContrato
            contrato={fin.contrato}
            recebido={fin.recebido}
            aReceber={fin.aReceber}
            despesas={fin.despesasTotal}
          />

          <SecaoReceitas
            eventId={eventId}
            receitas={fin.receitas}
            contractValue={fin.contrato}
            entradaRegistrada={fin.recebido}
            todayIso={todayIso}
          />

          <ListaDespesas
            eventId={eventId}
            despesas={fin.despesas}
            suppliers={suppliers}
            todayIso={todayIso}
          />

          {orcamento && itensOrcamento.length > 0 && (
            <ItensOrcamentoOriginal
              orcamentoId={orcamento.id}
              itens={itensOrcamento}
              valorTotal={orcamento.valor_total}
            />
          )}
              </div>
            }
          />
        </div>
      </details>
    </div>
  );
}
