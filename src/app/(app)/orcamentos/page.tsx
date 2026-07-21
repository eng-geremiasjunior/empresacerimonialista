import Link from "next/link";
import { Plus, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrcamentosTable } from "@/components/orcamentos/OrcamentosTable";
import { type Orcamento, validadeVencida } from "@/lib/orcamentos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orçamentos — Vela" };

const PER_PAGE = 20;

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: {
    busca?: string;
    status?: string;
    tipo?: string;
    page?: string;
  };
}) {
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);

  // Listagem paginada (server-side) com filtros.
  let query = supabase
    .from("orcamentos")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  if (searchParams.busca) {
    query = query.ilike("contato_nome", `%${searchParams.busca}%`);
  }
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.tipo) query = query.eq("tipo_evento", searchParams.tipo);

  // Cards de resumo: contagens sobre TODOS os orçamentos visíveis.
  const [{ data, count, error }, { data: todos }] = await Promise.all([
    query,
    supabase.from("orcamentos").select("status, data_validade"),
  ]);

  const rows = (data ?? []) as unknown as Orcamento[];
  const resumoBase = (todos ?? []) as Pick<
    Orcamento,
    "status" | "data_validade"
  >[];

  // Enviado com validade vencida conta como expirado no resumo.
  const efetivo = (o: Pick<Orcamento, "status" | "data_validade">) =>
    o.status === "enviado" && validadeVencida(o) ? "expirado" : o.status;

  const total = resumoBase.length;
  const emAberto = resumoBase.filter((o) => efetivo(o) === "enviado").length;
  const aprovados = resumoBase.filter((o) => o.status === "aprovado").length;
  const decididos = resumoBase.filter((o) =>
    ["aprovado", "recusado", "expirado"].includes(efetivo(o))
  ).length;
  const conversao =
    decididos === 0 ? null : Math.round((aprovados / decididos) * 100);

  const cards = [
    { label: "Total de orçamentos", valor: String(total) },
    { label: "Em aberto (enviados)", valor: String(emAberto) },
    { label: "Aprovados", valor: String(aprovados) },
    {
      label: "Taxa de conversão",
      valor: conversao === null ? "—" : `${conversao}%`,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Orçamentos</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Monte propostas e acompanhe aprovações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/orcamentos/modelos"
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            <SlidersHorizontal size={15} /> Modelos de Precificação
          </Link>
          <Link
            href="/orcamentos/novo"
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700"
          >
            <Plus size={16} /> Novo orçamento
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar os orçamentos. Se o banco ainda não foi
          atualizado, execute{" "}
          <code>supabase/migrations/041_orcamentos_estrutura.sql</code> no SQL
          Editor do Supabase.
        </div>
      )}

      {/* Cards de resumo */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {c.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {c.valor}
            </p>
          </div>
        ))}
      </div>

      <OrcamentosTable
        rows={rows}
        total={count ?? 0}
        perPage={PER_PAGE}
        current={{
          busca: searchParams.busca ?? "",
          status: searchParams.status ?? "",
          tipo: searchParams.tipo ?? "",
          page,
        }}
      />
    </div>
  );
}
