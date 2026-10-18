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

type OQueElaContou = { servico: string | null; respostas: { titulo: string; resposta: string }[]; mensagem: string | null };

/**
 * O que a cliente contou no pedido, para ela montar a proposta olhando:
 * o serviço que procura, as respostas às perguntas da página (214) e a
 * mensagem. Antes da 214 aplicada, só a mensagem.
 */
async function oQueElaContou(
  supabase: ReturnType<typeof createClient>,
  id: string | undefined
): Promise<OQueElaContou | null> {
  if (!id || !UUID.test(id)) return null;
  const ler = (colunas: string) => supabase.from("pedido_orcamento").select(colunas).eq("id", id).maybeSingle();
  let { data, error } = await ler("mensagem, servico_desejado, respostas");
  if (error && (error.code === "42703" || error.code === "PGRST204")) ({ data, error } = await ler("mensagem"));
  if (error || !data) return null;
  const p = data as unknown as { mensagem: string | null; servico_desejado?: string | null; respostas?: unknown };
  const respostas = Array.isArray(p.respostas)
    ? (p.respostas as Record<string, unknown>[])
        .filter((r) => r && typeof r.titulo === "string" && typeof r.resposta === "string" && r.resposta)
        .map((r) => ({ titulo: r.titulo as string, resposta: r.resposta as string }))
    : [];
  const contou = { servico: p.servico_desejado ?? null, respostas, mensagem: p.mensagem?.trim() || null };
  return contou.servico || contou.respostas.length || contou.mensagem ? contou : null;
}

export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: { pedido?: string };
}) {
  const supabase = createClient();

  const [{ data }, doPedido, contou] = await Promise.all([
    supabase
      .from("modelos_precificacao")
      .select("*")
      .eq("ativo", true)
      .order("nome"),
    pedidoParaResponder(supabase, searchParams.pedido),
    oQueElaContou(supabase, searchParams.pedido),
  ]);

  const modelos = ((data ?? []) as unknown as Omit<
    ModeloPrecificacao,
    "usado_em_orcamentos"
  >[]).map((m) => ({ ...m, usado_em_orcamentos: 0 }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={doPedido ? "/orcamentos/oportunidades" : "/orcamentos"}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={15} /> {doPedido ? "Voltar para as oportunidades" : "Voltar para as propostas"}
      </Link>
      <h1 className="mb-5 text-xl font-semibold text-gray-900">
        Novo orçamento
      </h1>
      {doPedido && contou && (
        <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900">O que {doPedido.nome.split(" ")[0]} contou no pedido</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {contou.servico && (
              <div>
                <dt className="text-xs text-gray-500">Serviço que procura</dt>
                <dd className="text-gray-800">{contou.servico}</dd>
              </div>
            )}
            {contou.respostas.map((r, i) => (
              <div key={i}>
                <dt className="text-xs text-gray-500">{r.titulo}</dt>
                <dd className="whitespace-pre-line text-gray-800">{r.resposta}</dd>
              </div>
            ))}
            {contou.mensagem && (
              <div>
                <dt className="text-xs text-gray-500">Mensagem</dt>
                <dd className="whitespace-pre-line text-gray-800">{contou.mensagem}</dd>
              </div>
            )}
          </dl>
        </section>
      )}
      <OrcamentoForm modelos={modelos} doPedido={doPedido} />
    </div>
  );
}
