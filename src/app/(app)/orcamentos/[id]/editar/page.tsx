import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { OrcamentoForm } from "@/components/orcamentos/OrcamentoForm";
import type { ModeloPrecificacao } from "@/lib/modelos-precificacao";
import type { Orcamento, OrcamentoItem } from "@/lib/orcamentos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar orçamento — Vela" };

export default async function EditarOrcamentoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: orc }, { data: itens }, { data: modelosData }] =
    await Promise.all([
      supabase.from("orcamentos").select("*").eq("id", params.id).single(),
      supabase
        .from("orcamento_itens")
        .select("*")
        .eq("orcamento_id", params.id)
        .order("ordem"),
      supabase
        .from("modelos_precificacao")
        .select("*")
        .eq("ativo", true)
        .order("nome"),
    ]);

  if (!orc) notFound();
  // Só rascunho é editável — enviado/decidido é histórico do cliente.
  if (orc.status !== "rascunho") redirect(`/orcamentos/${params.id}`);

  const modelos = ((modelosData ?? []) as unknown as Omit<
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
        Editar orçamento
      </h1>
      <OrcamentoForm
        orcamento={orc as unknown as Orcamento}
        itensIniciais={(itens ?? []) as unknown as OrcamentoItem[]}
        modelos={modelos}
      />
    </div>
  );
}
