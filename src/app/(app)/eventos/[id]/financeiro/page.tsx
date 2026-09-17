// Financeiro do evento.
//
// Uma rota, três contas: Verba do evento (o dinheiro do casal que ela
// administra), Minha assessoria (a receita dela) e Encerramento
// (conciliação, fechamento e prestação de contas). A conta fica na URL
// (?conta=) para dar link direto.
//
// Esta página só BUSCA e entrega. Toda conta mora em financeiro-tela.ts,
// e toda escrita, nas actions ao lado.

import { createClient } from "@/lib/supabase/server";
import {
  getFinanceiroDoEvento,
  getNumerosDoFechamento,
} from "@/lib/supabase/financeiro-evento";
import {
  getPrestacaoAoVivo,
  getVersoesEntregues,
} from "@/lib/supabase/prestacao";
import { TelaFinanceiro, type Conta } from "@/components/financeiro/tela/TelaFinanceiro";
import { PainelConciliacao } from "@/components/financeiro/PainelConciliacao";
import { PainelFechamento } from "@/components/financeiro/PainelFechamento";
import { PrestacaoDeContas } from "@/components/financeiro/PrestacaoDeContas";
import {
  ItensOrcamentoOriginal,
  type ItemOrcamentoOriginal,
} from "@/components/financeiro/ItensOrcamentoOriginal";
import { linhasParaConciliar } from "./lancamento-actions";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { hojeBR } from "@/lib/tempo";
import { MESES } from "@/lib/financeiro-tela";

const CONTAS: Conta[] = ["verba", "assessoria", "encerramento"];

export default async function EventoFinanceiroPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { conta?: string };
}) {
  const eventId = params.id;
  const supabase = createClient();
  const hoje = hojeBR();

  const [
    dados,
    { data: evInfo },
    numerosFechamento,
    { data: fechRow },
    extrato,
    { data: importacoes },
    { data: fornecedoresRes },
    { data: pendRes },
    prestacaoViva,
    versoesEntregues,
    { data: orcRes },
  ] = await Promise.all([
    getFinanceiroDoEvento(eventId),
    supabase
      .from("events")
      .select("name, date, clients(name, phone)")
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
    supabase
      .from("extrato_importacao")
      .select("periodo_ate")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(1),
    // o cadastro inteiro: ela fecha um fornecedor sem sair da tela
    supabase.from("suppliers").select("id, name").order("name"),
    // o que a automação deixou pendente (074): vira item de "Precisa de ação"
    supabase
      .from("financeiro_pendencia")
      .select("id, titulo, valor_sugerido")
      .eq("event_id", eventId)
      .eq("status", "aberta")
      .order("created_at", { ascending: true }),
    getPrestacaoAoVivo(eventId),
    getVersoesEntregues(eventId),
    supabase
      .from("orcamentos")
      .select(
        "id, valor_total, orcamento_itens(nome, descricao, valor_calculado, ordem)"
      )
      .eq("evento_gerado_id", eventId)
      .maybeSingle(),
  ]);

  const dataEvento = (evInfo?.date as string) ?? hoje;
  const cliente = Array.isArray(evInfo?.clients)
    ? (evInfo?.clients[0] as { name: string; phone: string | null } | undefined)
    : (evInfo?.clients as { name: string; phone: string | null } | null | undefined);
  const nomeEvento = (evInfo?.name as string) || cliente?.name || "Evento";

  const conta = CONTAS.includes(searchParams.conta as Conta)
    ? (searchParams.conta as Conta)
    : "verba";

  const pendencias = (pendRes ?? []).map((p) => ({
    id: p.id as string,
    titulo: p.titulo as string,
    valorSugerido: p.valor_sugerido == null ? null : Number(p.valor_sugerido),
  }));

  const saidas = dados.lancamentos.filter(
    (l) => l.conta === "verba" && l.direcao === "saida"
  );
  const pagas = saidas.filter((l) => l.pagoEm);

  const orcamento = orcRes as {
    id: string;
    valor_total: number;
    orcamento_itens: (ItemOrcamentoOriginal & { ordem: number })[];
  } | null;
  const itensOrcamento = [...(orcamento?.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );

  const ultimo = (importacoes ?? [])[0]?.periodo_ate as string | undefined;
  const ultimoExtrato = ultimo
    ? `${MESES[Number(ultimo.slice(5, 7)) - 1]}/${ultimo.slice(0, 4)}`
    : null;

  const contratado = dados.contratos.reduce((t, c) => t + (c.valor ?? 0), 0);

  return (
    <TelaFinanceiro
      eventId={eventId}
      dados={dados}
      contaInicial={conta}
      contexto={{
        evento: nomeEvento,
        data: dataEvento,
        diasAte: Math.round(
          (new Date(dataEvento + "T00:00:00").getTime() -
            new Date(hoje + "T00:00:00").getTime()) /
            86400000
        ),
      }}
      fornecedoresCadastro={(fornecedoresRes ?? []) as { id: string; name: string }[]}
      pendencias={pendencias}
      linkCobranca={linkWhatsapp(
        cliente?.phone,
        `Oi${cliente?.name ? ` ${cliente.name.split(" ")[0]}` : ""}! Passando para combinar o próximo repasse da verba do evento.`
      )}
      itensDoOrcamento={
        orcamento && itensOrcamento.length > 0 ? (
          <ItensOrcamentoOriginal
            orcamentoId={orcamento.id}
            itens={itensOrcamento}
            valorTotal={orcamento.valor_total}
          />
        ) : null
      }
      encerramento={{
        conciliacao: { pendentes: extrato.length, ultimoExtrato },
        fechamento: {
          fechadoEm: (fechRow?.fechado_em as string) ?? null,
          depoisDoEvento: dataEvento < hoje,
          verba: dados.verbaTotal,
          contratado,
          livre: dados.verbaTotal == null ? null : dados.verbaTotal - contratado,
        },
        prestacao: {
          pagamentos: pagas.length,
          comComprovante: pagas.filter((l) => l.comprovante).length,
          entregue: versoesEntregues.length,
        },
        painelConciliacao: (
          <PainelConciliacao eventId={eventId} pendentes={extrato} />
        ),
        painelFechamento: numerosFechamento ? (
          <PainelFechamento
            eventId={eventId}
            numeros={numerosFechamento}
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
          />
        ) : null,
        painelPrestacao: prestacaoViva ? (
          <PrestacaoDeContas
            eventId={eventId}
            payload={prestacaoViva.payload}
            notas={prestacaoViva.notas}
            versoes={versoesEntregues}
            conferencia={prestacaoViva.conferencia}
            ocorrencias={prestacaoViva.ocorrencias}
          />
        ) : null,
      }}
    />
  );
}
