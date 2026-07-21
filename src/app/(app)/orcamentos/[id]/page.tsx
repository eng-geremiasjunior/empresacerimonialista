import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import {
  ORCAMENTO_STATUS_BADGE,
  ORCAMENTO_STATUS_LABELS,
  descricaoCalculoItem,
  formatBRL,
  formatDateBR,
  type Orcamento,
  type OrcamentoItem,
} from "@/lib/orcamentos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orçamento — Vela" };

// Visualização da cerimonialista: prévia de como a proposta fica para o
// cliente (o PDF da Etapa 4 e o link público da Etapa 5 usarão o mesmo
// conteúdo).
export default async function VisualizarOrcamentoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: orcData }, { data: itensData }, { data: empresa }] =
    await Promise.all([
      supabase.from("orcamentos").select("*").eq("id", params.id).single(),
      supabase
        .from("orcamento_itens")
        .select("*")
        .eq("orcamento_id", params.id)
        .order("ordem"),
      supabase.from("empresas").select("nome, logo_url").limit(1).maybeSingle(),
    ]);

  if (!orcData) notFound();
  const orc = orcData as unknown as Orcamento;
  const itens = (itensData ?? []) as unknown as OrcamentoItem[];
  const badge = ORCAMENTO_STATUS_BADGE[orc.status];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/orcamentos"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={15} /> Voltar para orçamentos
        </Link>
        {orc.status === "rascunho" && (
          <Link
            href={`/orcamentos/${orc.id}/editar`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            <Pencil size={14} /> Editar
          </Link>
        )}
      </div>

      {/* Prévia da proposta */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Cabeçalho da proposta */}
        <div className="border-b border-gray-100 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              {empresa?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={empresa.logo_url}
                  alt={empresa?.nome ?? "Logo"}
                  className="mb-3 h-12 w-auto object-contain"
                />
              ) : (
                <p className="mb-1 text-lg font-semibold text-gray-900">
                  {empresa?.nome ?? "Proposta"}
                </p>
              )}
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Proposta de orçamento
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
              {ORCAMENTO_STATUS_LABELS[orc.status]}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-400">Cliente</p>
              <p className="font-medium text-gray-900">{orc.contato_nome}</p>
              {(orc.contato_telefone || orc.contato_email) && (
                <p className="text-xs text-gray-500">
                  {[orc.contato_telefone, orc.contato_email]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Evento</p>
              <p className="font-medium text-gray-900">
                {EVENT_TYPE_LABELS[orc.tipo_evento as EventType] ??
                  orc.tipo_evento}
              </p>
              <p className="text-xs text-gray-500">
                {orc.data_evento
                  ? formatDateBR(orc.data_evento)
                  : "Data a definir"}
                {orc.numero_convidados
                  ? ` · ${orc.numero_convidados} convidados`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Local</p>
              <p className="font-medium text-gray-900">
                {orc.local_evento ?? "A definir"}
              </p>
              {orc.cidade_evento && (
                <p className="text-xs text-gray-500">{orc.cidade_evento}</p>
              )}
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="px-8 py-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Itens da proposta
          </h2>
          {itens.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Nenhum item adicionado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {itens.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{item.nome}</p>
                    <p className="text-xs text-gray-500">
                      {descricaoCalculoItem(item)}
                    </p>
                    {item.descricao && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        {item.descricao}
                      </p>
                    )}
                  </div>
                  <p className="flex-shrink-0 font-medium text-gray-900">
                    {formatBRL(Number(item.valor_calculado))}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between border-t-2 border-gray-900 pt-4">
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Total
            </span>
            <span className="text-2xl font-bold text-gray-900">
              {formatBRL(Number(orc.valor_total))}
            </span>
          </div>
        </div>

        {/* Rodapé */}
        <div className="border-t border-gray-100 bg-gray-50/60 px-8 py-4 text-xs text-gray-500">
          Proposta criada em {formatDateBR(orc.data_criacao)} · Válida até{" "}
          <strong>{formatDateBR(orc.data_validade)}</strong> (
          {orc.validade_dias} dias)
        </div>
      </div>
    </div>
  );
}
