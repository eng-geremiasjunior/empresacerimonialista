import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrcamentoForm } from "@/components/orcamentos/OrcamentoForm";
import type { ModeloPrecificacao } from "@/lib/modelos-precificacao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo orçamento — Vela" };

export default async function NovoOrcamentoPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("modelos_precificacao")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const modelos = ((data ?? []) as unknown as Omit<
    ModeloPrecificacao,
    "usado_em_orcamentos"
  >[]).map((m) => ({ ...m, usado_em_orcamentos: 0 }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/orcamentos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={15} /> Voltar para orçamentos
      </Link>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">
        Novo orçamento
      </h1>
      <OrcamentoForm modelos={modelos} />
    </div>
  );
}
