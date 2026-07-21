import { createClient } from "@/lib/supabase/server";
import { ModelosPrecificacaoTable } from "@/components/orcamentos/ModelosPrecificacaoTable";
import type { ModeloPrecificacao } from "@/lib/modelos-precificacao";

export const dynamic = "force-dynamic";

export const metadata = { title: "Modelos de Precificação — Vela" };

export default async function ModelosPrecificacaoPage() {
  const supabase = createClient();

  // Contagem de uso por modelo via embed (trava o Excluir de usados).
  const { data, error } = await supabase
    .from("modelos_precificacao")
    .select("*, orcamento_itens(count)")
    .order("created_at", { ascending: false });

  const modelos: ModeloPrecificacao[] = (
    (data ?? []) as unknown as (Omit<
      ModeloPrecificacao,
      "usado_em_orcamentos"
    > & {
      orcamento_itens: { count: number }[] | null;
    })[]
  ).map(({ orcamento_itens, ...m }) => ({
    ...m,
    usado_em_orcamentos: orcamento_itens?.[0]?.count ?? 0,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      {error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar os modelos. Se o banco ainda não foi
          atualizado, execute{" "}
          <code>supabase/migrations/041_orcamentos_estrutura.sql</code> no SQL
          Editor do Supabase.
        </div>
      )}

      <ModelosPrecificacaoTable modelos={modelos} />
    </div>
  );
}
