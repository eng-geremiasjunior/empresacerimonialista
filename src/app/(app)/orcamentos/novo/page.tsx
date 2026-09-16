import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  OrcamentoForm,
  type ProposicaoDoPedido,
} from "@/components/orcamentos/OrcamentoForm";
import type { ModeloPrecificacao } from "@/lib/modelos-precificacao";
import {
  haQuanto,
  resumoDoEvento,
  whatsappFormatado,
} from "@/lib/comercial/pedidos";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo orçamento — eorganizei" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Responder com proposta": o pedido da página pública preenche o
 * formulário. Lido pela sessão — a RLS só devolve pedido da empresa e
 * de quem pode respondê-lo; id de fora simplesmente não preenche nada.
 */
async function pedidoParaResponder(
  supabase: ReturnType<typeof createClient>,
  id: string | undefined
): Promise<ProposicaoDoPedido | null> {
  if (!id || !UUID.test(id)) return null;
  const { data } = await supabase
    .from("pedido_orcamento")
    .select("id, nome, whatsapp, email, tipo_evento, data_evento, cidade, convidados, created_at")
    .eq("id", id)
    .maybeSingle();
  const p = data as {
    id: string;
    nome: string;
    whatsapp: string;
    email: string | null;
    tipo_evento: EventType;
    data_evento: string | null;
    cidade: string | null;
    convidados: number | null;
    created_at: string;
  } | null;
  if (!p) return null;
  return {
    pedidoId: p.id,
    nome: p.nome,
    telefone: whatsappFormatado(p.whatsapp),
    email: p.email,
    tipo: p.tipo_evento,
    data: p.data_evento,
    cidade: p.cidade,
    convidados: p.convidados,
    resumo: `${resumoDoEvento(p)} · pedido ${haQuanto(p.created_at, new Date())}`,
  };
}

export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: { pedido?: string };
}) {
  const supabase = createClient();

  const [{ data }, doPedido] = await Promise.all([
    supabase
      .from("modelos_precificacao")
      .select("*")
      .eq("ativo", true)
      .order("nome"),
    pedidoParaResponder(supabase, searchParams.pedido),
  ]);

  const modelos = ((data ?? []) as unknown as Omit<
    ModeloPrecificacao,
    "usado_em_orcamentos"
  >[]).map((m) => ({ ...m, usado_em_orcamentos: 0 }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={doPedido ? "/orcamentos/pedidos" : "/orcamentos"}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={15} /> {doPedido ? "Voltar para os pedidos" : "Voltar para as propostas"}
      </Link>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">
        Novo orçamento
      </h1>
      <OrcamentoForm modelos={modelos} doPedido={doPedido} />
    </div>
  );
}
