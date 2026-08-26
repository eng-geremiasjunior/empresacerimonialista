// Métricas do negócio — MRR, ARR, churn, NRR, CAC, LTV.
//
// O princípio da tela: número sem denominador vira "—" com a explicação
// do que falta, nunca zero inventado. No piloto quase tudo começa em "—"
// e isso é CORRETO: churn sem base de clientes não existe.

import { getMetricas } from "@/lib/supabase/admin-painel";
import { metrica } from "@/lib/admin-metricas";
import { hojeBR } from "@/lib/tempo";
import { FormGastoMarketing } from "./FormGastoMarketing";

export const dynamic = "force-dynamic";

function Cartao({
  titulo,
  valor,
  sub,
}: {
  titulo: string;
  valor: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-stone-400">
        {titulo}
      </p>
      <p className="mt-2 font-mono text-2xl text-stone-900">{valor}</p>
      {sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

export default async function AdminMetricasPage({
  searchParams,
}: {
  searchParams?: { mes?: string };
}) {
  const mesAtual = hojeBR().slice(0, 7);
  const mes = /^\d{4}-\d{2}$/.test(searchParams?.mes ?? "")
    ? searchParams!.mes!
    : mesAtual;

  const m = await getMetricas(mes);
  const [ano, mm] = mes.split("-");
  const rotuloMes = `${mm}/${ano}`;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            O negócio em {rotuloMes}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {m.assinantesAtivos} assinantes ativos · {m.emTrial} em trial ·{" "}
            {m.novasNoMes} novas no mês · {m.canceladasNoMes} canceladas
          </p>
        </div>
        <FormGastoMarketing mes={mes} gastoAtual={m.gastoMarketing} />
      </div>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-stone-400">
          Receita e previsibilidade
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Cartao
            titulo="MRR"
            valor={metrica(m.mrr, "R$ ")}
            sub="receita recorrente das assinaturas ativas"
          />
          <Cartao titulo="ARR" valor={metrica(m.arr, "R$ ")} sub="MRR × 12" />
          <Cartao
            titulo="Assinantes"
            valor={String(m.assinantesAtivos)}
            sub={
              m.emTrial > 0
                ? `+ ${m.emTrial} em trial hoje (fora do MRR)`
                : "trial fica fora do MRR"
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-stone-400">
          Retenção e evasão
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Cartao
            titulo="Churn de contas"
            valor={metrica(m.churnContasPct, "", "%")}
            sub={
              m.churnContasPct === null
                ? "sem base de assinantes no início do mês"
                : "cancelamentos ÷ base do início do mês"
            }
          />
          <Cartao
            titulo="Churn de receita"
            valor={metrica(m.churnReceitaPct, "", "%")}
            sub={
              m.churnReceitaPct === null
                ? "sem MRR no início do mês"
                : "MRR perdido ÷ MRR do início do mês"
            }
          />
          <Cartao
            titulo="NRR"
            valor={metrica(m.nrrPct, "", "%")}
            sub={
              m.nrrPct === null
                ? "sem base — mede se clientes atuais crescem"
                : "acima de 100% = a base cresce sozinha"
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-stone-400">
          Eficiência
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Cartao
            titulo="CAC"
            valor={metrica(m.cac, "R$ ")}
            sub={
              m.cac === null
                ? m.gastoMarketing === null
                  ? "informe o gasto de marketing do mês (acima)"
                  : "nenhuma assinatura nova no mês"
                : `gasto ${metrica(m.gastoMarketing, "R$ ")} ÷ ${m.novasNoMes} novas`
            }
          />
          <Cartao
            titulo="LTV"
            valor={metrica(m.ltv, "R$ ")}
            sub={
              m.ltv === null
                ? "precisa de churn de receita > 0 para estimar"
                : "receita média por conta ÷ churn de receita"
            }
          />
          <Cartao
            titulo="LTV / CAC"
            valor={metrica(m.ltvSobreCac, "", "×")}
            sub={
              m.ltvSobreCac === null
                ? "precisa de LTV e CAC"
                : "saudável a partir de 3×"
            }
          />
        </div>
      </section>

      <p className="text-xs text-stone-400">
        Assinaturas são registradas à mão em Contas enquanto não há meio de
        pagamento — quando o gateway entrar, ele escreve nas mesmas tabelas e
        este painel não muda.
      </p>
    </div>
  );
}
