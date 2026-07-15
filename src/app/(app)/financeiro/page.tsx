// Financeiro da EMPRESA da cerimonialista (business_transactions).
// O financeiro de cada evento (tabela transactions) vive na aba
// Financeiro dentro do evento — são módulos paralelos e independentes.

import { parseFinanceiroEmpresaParams } from "@/lib/financeiro-empresa-url";
import { getMeuCargo } from "@/lib/supabase/equipe";
import {
  getDespesasFixas,
  getEmpresa6Meses,
  getHistoricoEmpresa,
  getReceitasEmpresaMes,
  getResumoEmpresa,
} from "@/lib/supabase/financeiro-empresa";
import { ResumoEmpresa } from "@/components/financeiro-empresa/ResumoEmpresa";
import { ReceitaEmpresa } from "@/components/financeiro-empresa/ReceitaEmpresa";
import { DespesasFixas } from "@/components/financeiro-empresa/DespesasFixas";
import { HistoricoEmpresa } from "@/components/financeiro-empresa/HistoricoEmpresa";
import { EmpresaChart } from "@/components/financeiro-empresa/EmpresaChart";

export default async function FinanceiroEmpresaPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const current = parseFinanceiroEmpresaParams(searchParams);

  // Financeiro da empresa é exclusivo da proprietária (Etapa 4). Cargo
  // null (conta sem equipe/migração antiga) mantém o acesso de antes.
  const { cargo } = await getMeuCargo();
  if (cargo !== null && cargo !== "proprietaria") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Financeiro — Minha Empresa
          </h1>
        </div>
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          O financeiro da empresa é exclusivo da proprietária.
        </div>
      </div>
    );
  }

  const resumo = await getResumoEmpresa();

  if (resumo.migrationPendente) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Financeiro — Minha Empresa
          </h1>
          <p className="text-sm text-gray-500">
            Receita própria e despesas operacionais do seu negócio
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          O Financeiro da Empresa precisa da migração{" "}
          <code>supabase/migrations/020_business_transactions.sql</code> no SQL
          Editor do Supabase.
        </div>
      </div>
    );
  }

  const [receitas, fixas, historico, meses] = await Promise.all([
    getReceitasEmpresaMes(),
    getDespesasFixas(),
    getHistoricoEmpresa(current),
    getEmpresa6Meses(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Financeiro — Minha Empresa
        </h1>
        <p className="text-sm text-gray-500">
          Receita própria e despesas operacionais do seu negócio. O financeiro
          de cada evento fica na aba Financeiro dentro do evento.
        </p>
      </div>

      <ResumoEmpresa data={resumo} />

      <ReceitaEmpresa receitas={receitas} />

      <DespesasFixas fixas={fixas} />

      <HistoricoEmpresa
        rows={historico.rows}
        total={historico.total}
        current={current}
      />

      <EmpresaChart data={meses} />
    </div>
  );
}
