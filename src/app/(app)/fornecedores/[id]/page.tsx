import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CircleCheck,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import {
  getFornecedor,
  getHistoricoFornecedor,
} from "@/lib/supabase/fornecedores";
import { EditarFornecedorButton } from "@/components/fornecedores/EditarFornecedorButton";
import { formatDate } from "@/lib/format";
import {
  FAIXA_PRECO_CIFRAO,
  FAIXA_PRECO_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
  TIPO_OPERACIONAL_BADGE,
  TIPO_OPERACIONAL_LABELS,
  categoriaLabel,
  waLink,
} from "@/lib/fornecedores-shared";

export default async function FornecedorDetalhePage({
  params,
}: {
  params: { id: string };
}) {
  const f = await getFornecedor(params.id);
  if (!f) notFound();

  const historico = await getHistoricoFornecedor(params.id);

  const wa = waLink(f.whatsapp ?? f.phone);
  const contatos = [
    f.phone && { icon: Phone, texto: f.phone },
    f.email && { icon: Mail, texto: f.email },
    (f.endereco || f.cidade) && {
      icon: MapPin,
      texto: [f.endereco, f.cidade].filter(Boolean).join(" · "),
    },
  ].filter(Boolean) as { icon: typeof Phone; texto: string }[];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/fornecedores"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={15} />
        Fornecedores
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{f.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TIPO_OPERACIONAL_BADGE[f.tipo_operacional]}`}
              >
                {TIPO_OPERACIONAL_LABELS[f.tipo_operacional]}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[f.status]}`}
              >
                {STATUS_LABELS[f.status]}
              </span>
              {f.faixa_preco && (
                <span className="text-xs text-gray-500">
                  {FAIXA_PRECO_CIFRAO[f.faixa_preco]} ·{" "}
                  {FAIXA_PRECO_LABELS[f.faixa_preco]}
                </span>
              )}
            </div>
          </div>
          <EditarFornecedorButton fornecedor={f} />
        </div>

        {f.categorias.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {f.categorias.map((c) => (
              <span
                key={c}
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
              >
                {categoriaLabel(c)}
              </span>
            ))}
          </div>
        )}

        {f.descricao && (
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            {f.descricao}
          </p>
        )}

        {(contatos.length > 0 || wa) && (
          <div className="mt-5 space-y-2 border-t border-gray-100 pt-4">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                <MessageCircle size={15} />
                {f.whatsapp ?? f.phone} (WhatsApp)
              </a>
            )}
            {contatos.map(({ icon: Icon, texto }, i) => (
              <p key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <Icon size={15} className="text-gray-400" />
                {texto}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Histórico — dados reais (via roteiro_links) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">Histórico</h2>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-3 text-center">
            <CalendarCheck size={16} className="mx-auto text-gray-400" strokeWidth={1.75} />
            <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
              {historico.eventosAtendidos}
            </p>
            <p className="text-xs text-gray-500">Eventos atendidos</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 text-center">
            <CircleCheck size={16} className="mx-auto text-gray-400" strokeWidth={1.75} />
            <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
              {historico.taxaConfirmacao === null
                ? "—"
                : `${historico.taxaConfirmacao}%`}
            </p>
            <p className="text-xs text-gray-500">
              Confirmação
              {historico.eventosAtendidos > 0 && (
                <span className="block text-[11px] text-gray-400">
                  {historico.totalConfirmados} de {historico.eventosAtendidos}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 text-center">
            <CalendarClock size={16} className="mx-auto text-gray-400" strokeWidth={1.75} />
            <p className="mt-1 truncate text-sm font-semibold text-gray-900">
              {historico.proximoEvento
                ? formatDate(historico.proximoEvento.date)
                : "—"}
            </p>
            <p className="text-xs text-gray-500">Próximo evento</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 text-center">
            <CalendarCheck size={16} className="mx-auto text-gray-400" strokeWidth={1.75} />
            <p className="mt-1 truncate text-sm font-semibold text-gray-900">
              {historico.ultimoEvento
                ? formatDate(historico.ultimoEvento.date)
                : "—"}
            </p>
            <p className="text-xs text-gray-500">Último evento</p>
          </div>
        </div>

        {historico.eventos.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Este fornecedor ainda não foi vinculado a nenhum evento.
          </p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {historico.eventos.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/eventos/${ev.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-gray-300"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-gray-800">
                      {ev.label}
                    </span>
                    {ev.confirmado && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        confirmado
                      </span>
                    )}
                    {ev.futuro && (
                      <span className="shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                        agendado
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-gray-500">
                    {formatDate(ev.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
