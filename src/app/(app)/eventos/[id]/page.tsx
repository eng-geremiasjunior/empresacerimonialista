// Painel de Resumo do evento (redesign): responde "como está?", "o que
// fazer agora?" e "há risco?". Dados 100% reais.

import Link from "next/link";
import {
  AtSign,
  CalendarDays,
  CircleUserRound,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getResumoEvento } from "@/lib/supabase/resumo-evento";
import { Avatar } from "@/components/ui/Avatar";
import { StatusOperacional } from "@/components/eventos/StatusOperacional";
import { ResumoOperacional } from "@/components/eventos/ResumoOperacional";
import { AcoesRapidas } from "@/components/eventos/AcoesRapidas";
import { ProximasAtividades } from "@/components/eventos/ProximasAtividades";
import { NotasRapidas } from "@/components/eventos/NotasRapidas";
import { CARGO_LABELS, type Cargo } from "@/lib/equipe-shared";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import type { NotaEvento } from "./notas-actions";

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default async function ResumoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const resumo = await getResumoEvento(eventId);
  if (!resumo) {
    return <p className="text-sm text-gray-500">Evento não encontrado.</p>;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Notas (degrada se a migração 028 ainda não rodou).
  let notas: NotaEvento[] = [];
  const notasRes = await supabase
    .from("event_notes")
    .select("id, content, created_at, author_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (!notasRes.error) notas = (notasRes.data ?? []) as NotaEvento[];

  const eventLabel =
    resumo.event.name ||
    `${EVENT_TYPE_LABELS[resumo.event.type]}${resumo.client?.name ? ` — ${resumo.client.name}` : ""}`;

  const c = resumo.client;
  const contatos = [
    c?.phone && { icon: Phone, texto: c.phone },
    c?.email && { icon: Mail, texto: c.email },
    c?.instagram && { icon: AtSign, texto: c.instagram },
  ].filter(Boolean) as { icon: typeof Phone; texto: string }[];

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Coluna principal */}
      <div className="space-y-8 lg:col-span-2">
        <StatusOperacional
          eventId={eventId}
          saude={resumo.saude}
          criterios={resumo.criterios}
        />

        <ResumoOperacional eventId={eventId} op={resumo.operacional} />

        {/* Cliente */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Cliente</h2>
            <Link
              href={`/eventos/${eventId}/editar`}
              className="text-xs font-medium text-gray-500 hover:text-gray-900"
            >
              Editar dados do evento
            </Link>
          </div>

          {c ? (
            <div className="mt-3">
              <p className="text-base font-medium text-gray-900">{c.name}</p>
              {(contatos.length > 0 || c.whatsapp) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-600">
                  {c.whatsapp && (
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <MessageCircle size={14} />
                      {c.whatsapp}
                    </span>
                  )}
                  {contatos.map(({ icon: Icon, texto }, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <Icon size={14} className="text-gray-400" />
                      {texto}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {resumo.responsavel && (
                  <div>
                    <p className="text-xs text-gray-400">
                      Cerimonialista responsável
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar
                        src={null}
                        fallback={iniciais(resumo.responsavel.nome)}
                        size="sm"
                      />
                      <span className="text-sm text-gray-800">
                        {resumo.responsavel.nome}
                        <span className="text-gray-400">
                          {" "}
                          · {CARGO_LABELS[resumo.responsavel.cargo as Cargo] ??
                            resumo.responsavel.cargo}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
                {resumo.event.contract_value != null && (
                  <div>
                    <p className="text-xs text-gray-400">Valor contratado</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatCurrency(resumo.event.contract_value)}
                    </p>
                  </div>
                )}
                {resumo.formaPagamento && (
                  <div>
                    <p className="text-xs text-gray-400">Forma de pagamento</p>
                    <p className="mt-1 text-sm text-gray-800">
                      {resumo.formaPagamento}
                    </p>
                  </div>
                )}
                {resumo.event.guests != null && (
                  <div>
                    <p className="text-xs text-gray-400">Convidados esperados</p>
                    <p className="mt-1 text-sm text-gray-800">
                      {resumo.event.guests} pessoas
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <CircleUserRound size={15} className="text-gray-400" />
              Sem cliente vinculado.
            </p>
          )}
        </section>

        {/* Visão geral do evento */}
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Sparkles size={15} className="text-indigo-500" />
            Visão geral do evento
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {(
              [
                {
                  icon: Tag,
                  label: "Tipo de evento",
                  valor: EVENT_TYPE_LABELS[resumo.event.type],
                },
                {
                  icon: CalendarDays,
                  label: "Data",
                  valor: formatDate(resumo.event.date),
                },
                {
                  icon: MapPin,
                  label: "Local",
                  valor: resumo.event.location || resumo.event.city || "—",
                },
                resumo.event.guests != null && {
                  icon: Users,
                  label: "Convidados esperados",
                  valor: `${resumo.event.guests} pessoas`,
                },
                resumo.event.time && {
                  icon: Clock,
                  label: "Início previsto",
                  valor: resumo.event.time.slice(0, 5),
                },
              ].filter(Boolean) as {
                icon: typeof Tag;
                label: string;
                valor: string;
              }[]
            ).map(({ icon: Icon, label, valor }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon size={16} className="mt-0.5 shrink-0 text-gray-400" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="truncate text-sm font-medium text-gray-800">
                    {valor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <NotasRapidas
          eventId={eventId}
          notas={notas}
          currentUserId={user?.id ?? null}
        />
      </div>

      {/* Coluna lateral */}
      <div className="space-y-6">
        <AcoesRapidas eventId={eventId} eventLabel={eventLabel} />
        <ProximasAtividades eventId={eventId} proximas={resumo.proximas} />
      </div>
    </div>
  );
}
