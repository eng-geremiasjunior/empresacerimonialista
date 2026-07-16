import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { getFornecedor } from "@/lib/supabase/fornecedores";
import { EditarFornecedorButton } from "@/components/fornecedores/EditarFornecedorButton";
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

      {/* Histórico — placeholder (a lógica real vem na Etapa 4) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">Histórico</h2>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          <Clock size={15} className="text-gray-400" />
          Em breve: eventos atendidos por este fornecedor.
        </div>
      </div>
    </div>
  );
}
