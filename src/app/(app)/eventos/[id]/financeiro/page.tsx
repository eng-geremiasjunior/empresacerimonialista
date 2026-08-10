import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getFinanceiroEvento } from "@/lib/supabase/financeiro";
import { ResumoContrato } from "@/components/financeiro/ResumoContrato";
import { SecaoReceitas } from "@/components/financeiro/SecaoReceitas";
import { ListaDespesas } from "@/components/financeiro/ListaDespesas";
import { FinanceiroTabs } from "@/components/financeiro/FinanceiroTabs";
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

export default async function EventoFinanceiroPage({
  params,
}: {
  params: { id: string };
}) {
  const eventId = params.id;
  const supabase = createClient();
  const todayIso = format(new Date(), "yyyy-MM-dd");

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
      .order("due_date", { ascending: true }),
    // Pendências abertas pela automação (074). Degrada em silêncio se a
    // migração ainda não rodou.
    supabase
      .from("financeiro_pendencia")
      .select("id, titulo, tipo, created_at")
      .eq("event_id", eventId)
      .eq("status", "aberta")
      .order("created_at", { ascending: true }),
  ]);

  const pendencias: Pendencia[] = (pendRes.data ?? []).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    tipo: p.tipo as Pendencia["tipo"],
    criadaEm: p.created_at,
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
      valor_alocado: number;
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
    valor_alocado: Number(v.valor_alocado),
    observacao: v.observacao,
    itens: v.evento_fornecedor_item ?? [],
  }));

  const parcelasFornecedor = ((parcelasRes.data ?? []) as unknown as
    ParcelaFornecedor[]).map((p) => ({ ...p, value: Number(p.value) }));

  return (
    <FinanceiroTabs
      eventId={eventId}
      verbas={verbas}
      parcelasFornecedor={parcelasFornecedor}
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
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              O módulo Financeiro precisa da migração{" "}
              <code>supabase/migrations/017_financeiro.sql</code> no SQL Editor
              do Supabase.
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
  );
}
