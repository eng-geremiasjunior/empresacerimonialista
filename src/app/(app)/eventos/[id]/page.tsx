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
import { avatarPublicUrl } from "@/lib/avatar";
import { StatusOperacional } from "@/components/eventos/StatusOperacional";
import { ResumoOperacional } from "@/components/eventos/ResumoOperacional";
import { AcoesRapidas } from "@/components/eventos/AcoesRapidas";
import { ColacaoLigada, type ElosColacao } from "@/components/eventos/ColacaoLigada";
import { ProximasAtividades } from "@/components/eventos/ProximasAtividades";
import { NotasRapidas } from "@/components/eventos/NotasRapidas";
import { AssistenteEvento } from "@/components/eventos/AssistenteEvento";
import {
  BriefingExtracaoCaixa,
  type FornecedorEscolhivel,
} from "@/components/eventos/BriefingExtracaoCaixa";
import {
  normalizarBriefingV2,
  type PropostaBriefingV2,
} from "@/lib/briefing-core";
import { CARGO_LABELS, type Cargo } from "@/lib/equipe-shared";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import type { NotaEvento } from "./notas-actions";

type LinhaFornecedor = {
  id: string;
  name: string;
  supplier_categorias?: { categoria: string }[] | null;
};

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

  // Formatura: o elo baile ↔ colação (125). Filho aponta o pai; pai com
  // colação própria ganha o atalho; turma "separados" sem o evento ainda
  // ganha o formulário de criar. Fora disso, nada aparece.
  let elosColacao: ElosColacao | null = null;
  if (resumo.event.type === "formatura") {
    const [{ data: euMesmo }, { data: filho }] = await Promise.all([
      supabase
        .from("events")
        .select("evento_pai_id")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("events")
        .select("id, date, name")
        .eq("evento_pai_id", eventId)
        .maybeSingle(),
    ]);
    if (euMesmo?.evento_pai_id) {
      const { data: pai } = await supabase
        .from("events")
        .select("id, name")
        .eq("id", euMesmo.evento_pai_id)
        .maybeSingle();
      if (pai) {
        elosColacao = {
          modo: "filho",
          paiId: pai.id,
          paiNome: pai.name ?? "o baile da turma",
        };
      }
    } else if (filho) {
      elosColacao = { modo: "tem", filhoId: filho.id, filhoData: filho.date };
    } else {
      const { data: campo } = await supabase
        .from("evento_campo_valor")
        .select("valor_opcao")
        .eq("event_id", eventId)
        .eq("codigo", "celebracao_formato")
        .maybeSingle();
      if (campo?.valor_opcao === "Separados (a colação em outra data)") {
        elosColacao = { modo: "oferecer" };
      }
    }
  }

  // Notas (degrada se a migração 028 ainda não rodou).
  let notas: NotaEvento[] = [];
  const notasRes = await supabase
    .from("event_notes")
    .select("id, content, created_at, author_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (!notasRes.error) notas = (notasRes.data ?? []) as NotaEvento[];

  // O briefing colado que virou proposta e ainda espera conferência (143),
  // e o teto de convidados que ele guardou. Degrada em silêncio nos bancos
  // onde a migração ainda não rodou.
  const [tetoRes, propostaRes] = await Promise.all([
    supabase.from("events").select("guests_max").eq("id", eventId).maybeSingle(),
    supabase
      .from("briefing_extracao")
      .select("id, payload")
      .eq("event_id", eventId)
      .eq("status", "proposta")
      .maybeSingle(),
  ]);
  const guestsMax = (tetoRes.data?.guests_max as number | null) ?? null;

  let briefing: {
    id: string;
    proposta: PropostaBriefingV2;
    fornecedores: FornecedorEscolhivel[];
  } | null = null;
  if (propostaRes.data) {
    // o select do cadastro agrupa por categoria; sem a 026 a caixa ainda
    // funciona, só sem o agrupamento
    const comCat = await supabase
      .from("suppliers")
      .select("id, name, supplier_categorias(categoria)")
      .order("name")
      .limit(2000);
    const linhas = (comCat.error
      ? (
          await supabase
            .from("suppliers")
            .select("id, name")
            .order("name")
            .limit(2000)
        ).data ?? []
      : comCat.data ?? []) as unknown as LinhaFornecedor[];
    briefing = {
      id: propostaRes.data.id as string,
      proposta: normalizarBriefingV2(propostaRes.data.payload),
      fornecedores: linhas.map((s) => ({
        id: s.id,
        nome: s.name,
        categorias: (s.supplier_categorias ?? []).map((c) => c.categoria),
      })),
    };
  }

  // "220 pessoas, pode chegar a 240": o teto mora ao lado do número, não
  // numa caixa própria.
  const g = resumo.event.guests;
  const textoConvidados =
    g != null
      ? guestsMax != null && guestsMax > g
        ? `${g} pessoas, pode chegar a ${guestsMax}`
        : `${g} pessoas`
      : guestsMax != null
        ? `pode chegar a ${guestsMax} pessoas`
        : null;

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

        {briefing && (
          <BriefingExtracaoCaixa
            eventId={eventId}
            extracaoId={briefing.id}
            proposta={briefing.proposta}
            fornecedores={briefing.fornecedores}
          />
        )}

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
                        src={avatarPublicUrl(resumo.responsavel.user_id)}
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
                {textoConvidados && (
                  <div>
                    <p className="text-xs text-gray-400">Convidados esperados</p>
                    <p className="mt-1 text-sm text-gray-800">{textoConvidados}</p>
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
                textoConvidados && {
                  icon: Users,
                  label: "Convidados esperados",
                  valor: textoConvidados,
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
                  <p
                    title={valor}
                    className="truncate text-sm font-medium text-gray-800"
                  >
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
        {elosColacao && <ColacaoLigada eventId={eventId} elo={elosColacao} />}
        <AcoesRapidas
          eventId={eventId}
          eventLabel={eventLabel}
          tipo={resumo.event.type}
        />
        <AssistenteEvento eventId={eventId} />
        <ProximasAtividades eventId={eventId} proximas={resumo.proximas} />
      </div>
    </div>
  );
}
