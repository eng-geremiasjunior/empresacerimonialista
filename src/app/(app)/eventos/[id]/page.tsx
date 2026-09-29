// Visão geral do evento (Modelo A): Informações do evento à esquerda;
// à direita, o que vem a seguir (ou "Para começar" num evento novo), a
// Google Agenda de quem a conectou, as ações rápidas e a pergunta ao
// evento. Dados 100% reais.

import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getResumoEvento } from "@/lib/supabase/resumo-evento";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { Avatar } from "@/components/ui/Avatar";
import { avatarPublicUrl } from "@/lib/avatar";
import { AcoesRapidas } from "@/components/eventos/AcoesRapidas";
import { ColacaoLigada, type ElosColacao } from "@/components/eventos/ColacaoLigada";
import {
  ParaComecar,
  ProximasAtividades,
  type PassoParaComecar,
} from "@/components/eventos/ProximasAtividades";
import { GoogleAgendaDoEvento } from "@/components/eventos/GoogleAgendaDoEvento";
import { googleConfigurado } from "@/lib/google/oauth";
import type { ConexaoGoogleNaTela } from "@/lib/google/na-tela";
import { ObservacoesDoEvento } from "@/components/eventos/ObservacoesDoEvento";
import { AssistenteEvento } from "@/components/eventos/AssistenteEvento";
import {
  BriefingExtracaoCaixa,
  type FornecedorEscolhivel,
} from "@/components/eventos/BriefingExtracaoCaixa";
import { AvisosDoBriefing } from "@/components/eventos/AvisosDoBriefing";
import {
  normalizarBriefingV2,
  type PropostaBriefingV2,
} from "@/lib/briefing-core";
import { CARGO_LABELS, type Cargo } from "@/lib/equipe-shared";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
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

// Valor contratado e forma de pagamento: só quem contrata vê (regra de
// 15/09/2026 — o dado comercial não é operacional).
const VE_VALOR: Cargo[] = ["proprietaria", "coordenadora"];

const cartao: React.CSSProperties = {
  background: "var(--ev-card-bg)",
  border: "1px solid var(--ev-card-border)",
  borderRadius: 14,
  overflow: "hidden",
};

const rotulo: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ev-text-muted)",
};

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={rotulo}>{label}</span>
      {children}
    </div>
  );
}

export default async function ResumoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  /** a volta do Google Agenda (?google=&motivo=) quando ela conectou daqui */
  searchParams?: { google?: string; motivo?: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const resumo = await getResumoEvento(eventId);
  if (!resumo) {
    return <p className="text-sm text-gray-500">Evento não encontrado.</p>;
  }

  const [
    {
      data: { user },
    },
    { cargo },
    conexaoGoogle,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getMeuCargo(),
    // a agenda de quem está logado (168), pela função que devolve só o
    // que a tela mostra; sem a 168 ou sem as chaves do Google no
    // ambiente, sem o bloco — como em Configurações
    supabase.rpc("minha_conexao_google"),
  ]);
  const veValor = cargo !== null && VE_VALOR.includes(cargo);
  const googleDisponivel = googleConfigurado() && !conexaoGoogle.error;
  const google =
    ((conexaoGoogle.data as ConexaoGoogleNaTela[] | null) ?? [])[0] ?? null;

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

  // Observações (degrada se a migração 028 ainda não rodou).
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
  const [tetoRes, propostaRes, aplicadaRes] = await Promise.all([
    supabase.from("events").select("guests_max").eq("id", eventId).maybeSingle(),
    supabase
      .from("briefing_extracao")
      .select("id, payload")
      .eq("event_id", eventId)
      .eq("status", "proposta")
      .maybeSingle(),
    supabase
      .from("briefing_extracao")
      .select("id, aplicado")
      .eq("event_id", eventId)
      .eq("status", "conferida")
      .order("conferida_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const guestsMax = (tetoRes.data?.guests_max as number | null) ?? null;

  const aplicado = (aplicadaRes.data?.aplicado ?? null) as {
    avisos?: unknown;
    avisos_lidos?: unknown;
  } | null;
  const avisosDoBriefing =
    aplicado && aplicado.avisos_lidos !== true && Array.isArray(aplicado.avisos)
      ? (aplicado.avisos as unknown[]).filter(
          (a): a is string => typeof a === "string" && a.trim().length > 0
        )
      : [];

  let briefing: {
    id: string;
    proposta: PropostaBriefingV2;
    fornecedores: FornecedorEscolhivel[];
  } | null = null;
  if (propostaRes.data) {
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

  // "220 pessoas, pode chegar a 240": o teto mora ao lado do número.
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
  const telefone = c?.whatsapp || c?.phone || null;

  // Evento novo: os três primeiros passos, cada um com a fase certa.
  const passos: PassoParaComecar[] = [
    {
      titulo: "Começar pelo Planejamento",
      descricao: "Cada decisão vira tarefa com prazo na Organização.",
      acao: "Abrir",
      seg: "planejamento",
      feito: resumo.criterios.temTarefas,
    },
    {
      titulo: "Vincular os fornecedores",
      descricao: "Quem está contratado para este evento.",
      acao: "Vincular",
      seg: "fornecedores",
      feito: resumo.criterios.temFornecedores,
    },
    {
      titulo: "Montar o roteiro do dia",
      descricao: "A linha do tempo que cada fornecedor vê no link dele.",
      acao: "Montar",
      seg: "roteiro",
      feito: resumo.criterios.cronogramaOk,
    },
  ];
  const novo = resumo.saude.semDados;

  return (
    // Dois filhos diretos, sempre: a coluna das informações e a coluna
    // do que vem a seguir. Com mais filhos o auto-fit abriria uma
    // terceira coluna em telas largas.
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <section style={cartao} aria-label="Informações do evento">
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid var(--ev-card-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontFamily: "var(--font-title)", fontSize: 16, fontWeight: 600, color: "var(--ev-text-strong)" }}>
              Informações do evento
            </span>
            <Link
              href={`/eventos/${eventId}/editar`}
              style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ev-text-muted)" }}
              className="hover:!text-[color:var(--ev-text-strong)]"
            >
              Editar dados
            </Link>
          </div>

          <div
            style={{
              padding: "22px 24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 24,
            }}
          >
            {c ? (
              <div style={{ display: "flex", gap: 16, minWidth: 0 }}>
                <span
                  aria-hidden
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 999,
                    background: "var(--ev-nevoa)",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-title)",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--ev-text-body)",
                    flex: "none",
                  }}
                >
                  {iniciais(c.name)}
                </span>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ev-text-body)",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontFamily: "var(--font-title)", fontSize: 17, fontWeight: 600, color: "var(--ev-text-strong)" }}>
                      {c.name}
                    </span>
                    <span style={rotulo}>Cliente</span>
                  </div>
                  {resumo.responsavel && (
                    <Campo label="Cerimonialista responsável">
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Avatar
                          src={avatarPublicUrl(resumo.responsavel.user_id)}
                          fallback={iniciais(resumo.responsavel.nome)}
                          size="sm"
                          className="!h-5 !w-5 !text-[9px]"
                        />
                        {resumo.responsavel.nome}
                        <span style={{ color: "var(--ev-text-muted)" }}>
                          · {CARGO_LABELS[resumo.responsavel.cargo as Cargo] ?? resumo.responsavel.cargo}
                        </span>
                      </span>
                    </Campo>
                  )}
                  {telefone && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{telefone}</span>
                  )}
                  {c.email && <span style={{ overflowWrap: "anywhere" }}>{c.email}</span>}
                  {c.instagram && <span style={{ color: "var(--ev-text-muted)" }}>@{c.instagram.replace(/^@/, "")}</span>}
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ev-text-muted)" }}>
                <CircleUserRound size={15} />
                Sem cliente vinculado.
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              {veValor && resumo.event.contract_value != null && (
                <Campo label="Valor contratado">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 500, color: "var(--ev-text-strong)" }}>
                    {formatCurrency(resumo.event.contract_value)}
                  </span>
                </Campo>
              )}
              {veValor && resumo.formaPagamento && (
                <Campo label="Forma de pagamento">
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ev-text-strong)" }}>
                    {resumo.formaPagamento}
                  </span>
                </Campo>
              )}
              {textoConvidados && (
                <Campo label="Convidados esperados">
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ev-text-strong)" }}>
                    {textoConvidados}
                  </span>
                </Campo>
              )}
            </div>
          </div>

          <ObservacoesDoEvento
            eventId={eventId}
            notas={notas}
            currentUserId={user?.id ?? null}
          />
        </section>

        {briefing && (
          <BriefingExtracaoCaixa
            eventId={eventId}
            extracaoId={briefing.id}
            proposta={briefing.proposta}
            fornecedores={briefing.fornecedores}
          />
        )}
        {avisosDoBriefing.length > 0 && aplicadaRes.data && (
          <AvisosDoBriefing
            eventId={eventId}
            extracaoId={aplicadaRes.data.id as string}
            avisos={avisosDoBriefing}
          />
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {novo ? (
          <ParaComecar eventId={eventId} passos={passos} />
        ) : (
          <ProximasAtividades eventId={eventId} proximas={resumo.proximas} />
        )}
        {googleDisponivel && (
          <GoogleAgendaDoEvento
            eventId={eventId}
            dataEvento={resumo.event.date}
            conexao={google}
            aviso={searchParams?.google ?? null}
            motivo={searchParams?.motivo ?? null}
          />
        )}
        <AcoesRapidas eventId={eventId} eventLabel={eventLabel} tipo={resumo.event.type} />
        {elosColacao && <ColacaoLigada eventId={eventId} elo={elosColacao} />}
        <AssistenteEvento eventId={eventId} />
      </div>
    </div>
  );
}
