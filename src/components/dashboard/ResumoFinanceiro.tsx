import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { ResumoFinanceiro as ResumoData } from "@/lib/supabase/queries";
import type { SaldoEmpresaMes } from "@/lib/financeiro-empresa-shared";

function Linha({ label, value, valueCls }: { label: string; value: string; valueCls?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-lg font-semibold tabular-nums ${valueCls ?? "text-gray-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

// Dois blocos, cada um com sua fonte de dados:
// - Eventos: tabela transactions (contratos e parcelas dos eventos)
// - Empresa: tabela business_transactions (receita própria + despesas
//   operacionais). Fontes independentes, nunca misturadas.
export function ResumoFinanceiro({
  data,
  empresa,
}: {
  data: ResumoData;
  empresa: SaldoEmpresaMes;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Financeiro dos eventos
        </h2>
        <Link
          href="/financeiro"
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
        >
          Minha empresa
          <ArrowRight size={13} />
        </Link>
      </div>

      {!data.temDados ? (
        <p className="mt-4 text-sm text-gray-500">
          Nenhum dado financeiro registrado ainda.
        </p>
      ) : (
        <div className="mt-2 divide-y divide-gray-100">
          <Linha
            label="A receber dos eventos"
            value={formatCurrency(data.aReceber)}
          />
          <Linha
            label="Recebido este mês"
            value={formatCurrency(data.recebidoMes)}
          />
          <Linha label="Pagamentos vencendo" value={String(data.vencendo)} />
        </div>
      )}

      {empresa && (
        <div className="mt-4 border-t border-gray-200 pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Saúde financeira da empresa
          </h3>
          <div className="mt-1 divide-y divide-gray-100">
            <Linha
              label="Saldo da empresa este mês"
              value={formatCurrency(empresa.saldoMes)}
              valueCls={empresa.saldoMes < 0 ? "text-red-600" : "text-gray-900"}
            />
          </div>
          <p className="text-xs text-gray-400">
            Receita {formatCurrency(empresa.receitaMes)} · Despesas{" "}
            {formatCurrency(empresa.despesasMes)}
          </p>
        </div>
      )}
    </div>
  );
}
