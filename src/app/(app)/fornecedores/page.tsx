// Tela global de Fornecedores (Etapa 2): listagem com busca, filtros e
// cadastro. Recurso compartilhado da empresa — visível para toda a equipe
// (RLS por empresa da migração 024).

import {
  getCategoriasEmUso,
  getFornecedoresList,
} from "@/lib/supabase/fornecedores";
import { parseFornecedoresParams } from "@/lib/fornecedores-url";
import { FornecedoresFiltros } from "@/components/fornecedores/FornecedoresFiltros";
import { FornecedoresTable } from "@/components/fornecedores/FornecedoresTable";
import { NovoFornecedorButton } from "@/components/fornecedores/NovoFornecedorButton";

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const current = parseFornecedoresParams(searchParams);

  const [lista, categorias] = await Promise.all([
    getFornecedoresList(current),
    getCategoriasEmUso(),
  ]);

  const semFiltros =
    !current.q &&
    !current.categoria &&
    !current.tipo &&
    !current.status &&
    !current.faixa;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Fornecedores</h1>
          <p className="text-sm text-gray-500">
            Gerencie seus fornecedores e parceiros
          </p>
        </div>
        <NovoFornecedorButton />
      </div>

      {lista.migrationPendente && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          O módulo Fornecedores precisa da migração{" "}
          <code>026_fornecedores_categoria_tipo_operacional.sql</code> no SQL
          Editor do Supabase.
        </div>
      )}

      {!lista.migrationPendente && semFiltros && lista.total === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">
            Nenhum fornecedor cadastrado ainda.
          </p>
          <div className="mt-4 flex justify-center">
            <NovoFornecedorButton label="Cadastrar primeiro fornecedor" />
          </div>
        </div>
      ) : (
        <>
          <FornecedoresFiltros
            current={current}
            categoriasDisponiveis={categorias}
          />
          {lista.rows.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
              Nenhum fornecedor encontrado com estes filtros.
            </div>
          ) : (
            <FornecedoresTable
              rows={lista.rows}
              total={lista.total}
              current={current}
            />
          )}
        </>
      )}
    </div>
  );
}
