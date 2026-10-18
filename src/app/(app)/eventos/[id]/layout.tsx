import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { Pencil, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventoContainer } from "@/components/evento/EventoContainer";
import { CapaDoEvento } from "@/components/eventos/CapaDoEvento";
import { AcoesDoEvento } from "@/components/eventos/AcoesDoEvento";
import { PartesDoEvento } from "@/components/moldura/PartesDoEvento";
import { BlocoDeFases } from "@/components/eventos/BlocoDeFases";
import { faseDoSegmento, type FaseDoEvento } from "@/lib/fases-do-evento";
import { FatosDaBarra } from "@/components/moldura/contexto";
import { RequerAtencao } from "@/components/eventos/RequerAtencao";
import { UltimaAba } from "@/components/eventos/UltimaAba";
import { LembrarEvento } from "@/components/eventos/LembrarEvento";
import { getCabecalhoEvento } from "@/lib/supabase/resumo-evento";
import { formatDate } from "@/lib/format";
import { rotuloPublico } from "@/lib/capacidades";
import {
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type EventStatus,
  type EventType,
} from "@/lib/types";
import { inicioDoDiaBR } from "@/lib/tempo";
import { FaixaDoExemplo } from "@/components/evento/FaixaDoExemplo";
import { AREAS_DO_EXEMPLO } from "@/lib/evento-exemplo";

// Página do evento — Modelo A (28/09/2026, handoff do Claude Design), na
// moldura de programa desde 15/10/2026: as partes do evento (PartesDoEvento)
// ficam na faixa do alto e são a navegação; o cabeçalho com a foto grande
// continua — é a identidade do evento (pedido dele, 16/10/2026). O bloco
// das três fases saiu: a navegação passou para a faixa.
// O cabeçalho tem a foto de capa à esquerda, o título em 40px, a linha
// de data em mono e os três atalhos (Visão geral · O que o cliente vê ·
// Histórico de alterações). Abaixo, o bloco de fases É a navegação: a
// fase aberta mostra só as abas dela. "Requer atenção" é uma linha, só
// quando há alerta.

// Pílula de status: bolinha + rótulo. Confirmado em sálvia; o resto sem
// comemoração (tokens --ev-st-* em globals.css).
const STATUS_VARS: Record<EventStatus, string> = {
  orcamento: "orcamento",
  confirmado: "confirmado",
  concluido: "concluido",
  cancelado: "cancelado",
};

export default async function EventoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = createClient();

  const { data } = await supabase
    .from("events")
    .select(
      "id, type, name, date, time, location, city, status, guests, exemplo, exemplo_visto, cover_image_url, clients(name)"
    )
    .eq("id", params.id)
    .single();

  if (!data) notFound();

  const event = data as unknown as {
    id: string;
    type: EventType;
    name: string | null;
    date: string;
    time: string | null;
    location: string | null;
    city: string | null;
    status: EventStatus;
    guests: number | null;
    exemplo: boolean | null;
    exemplo_visto: string[] | null;
    cover_image_url: string | null;
    clients: { name: string } | null;
  };

  const [{ saude, fases, contadores }, { count: comAcesso }] = await Promise.all([
    getCabecalhoEvento(event.id, event.date),
    // o portal da cliente em evidência (16/10/2026): quantas pessoas da
    // família já entram; falha vira null e o botão só diz "Portal da cliente"
    supabase
      .from("evento_acesso")
      .select("id", { count: "exact", head: true })
      .eq("event_id", params.id)
      .eq("status", "ativo"),
  ]);
  const acessos = typeof comAcesso === "number" ? comAcesso : null;

  const tipoLabel = EVENT_TYPE_LABELS[event.type];
  const titulo =
    event.name ||
    `${tipoLabel}${event.clients?.name ? ` — ${event.clients.name}` : ""}`;

  const dias = differenceInCalendarDays(
    new Date(`${event.date}T00:00:00`),
    inicioDoDiaBR()
  );
  const proximidade =
    dias > 0
      ? `faltam ${dias} dia${dias === 1 ? "" : "s"}`
      : dias === 0
        ? "é hoje"
        : "já realizado";

  // Linha de data (mono): 31/10/2026 · 10:00 · faltam 33 dias
  const linhaData = [formatDate(event.date), event.time?.slice(0, 5), proximidade]
    .filter(Boolean)
    .join(" · ");

  // Meta: Casamento · Orla · 400 convidados. O tipo só se repete quando o
  // título não o diz (título com nome próprio).
  const local = event.location || event.city;
  const publico =
    event.guests != null && event.guests > 0
      ? event.type === "show"
        ? `${event.guests.toLocaleString("pt-BR")} de público esperado`
        : `${event.guests.toLocaleString("pt-BR")} ${rotuloPublico(event.type)}`
      : null;
  const meta = [event.name ? tipoLabel : null, local, publico].filter(Boolean).join(" · ");

  // Modo Evento: destaque cresce com a proximidade (regra mantida).
  const modoDestaque = dias <= 7 && dias >= 0;
  const modoHoje = dias === 0;

  // Evento sem nada montado: os alertas diriam "monte o checklist, vincule
  // fornecedores, monte o roteiro" — exatamente os passos do "Para começar"
  // da Visão geral. Uma vez só.
  const alertas = saude.semDados ? [] : saude.alertas;

  // Pendências por fase (os blocos das fases do celular)
  const pendencias: Record<FaseDoEvento, number> = { planejar: 0, organizar: 0, executar: 0 };
  for (const a of alertas) {
    const f = faseDoSegmento(a.destino);
    if (f) pendencias[f] += 1;
  }

  // Os fatos da barra de status: quanto falta e onde.
  const fatos = [proximidade, local].filter(Boolean).join(" · ");

  return (
    <EventoContainer>
      <PartesDoEvento
        eventId={event.id}
        tipo={event.type}
        nome={titulo}
        data={event.date}
        modoEventoPerto={false}
      />
      <FatosDaBarra texto={fatos} />
      <UltimaAba eventId={event.id} />
      <LembrarEvento
        eventId={event.id}
        titulo={titulo}
        data={formatDate(event.date)}
        capa={event.cover_image_url}
        tipo={event.type}
      />
      {/* o evento de exemplo da conta nova (174): bem à vista, em toda tela dele */}
      {event.exemplo && (
        <FaixaDoExemplo
          eventId={event.id}
          areas={AREAS_DO_EXEMPLO.map((a) => ({ ...a }))}
          visto={event.exemplo_visto ?? []}
          tipo={event.type}
        />
      )}

      <div>

        {/* CABEÇALHO DO EVENTO */}
        {/* sem overflow:hidden no cartão: o menu "Ações ▾" nasce dentro
            dele e precisa sair por baixo. Os cantos da foto são arredondados
            na própria foto (.ev-capa). */}
        <header
          className="ev-cabecalho"
          style={{
            display: "flex",
            minHeight: 190,
            background: "var(--ev-card-bg)",
            border: "1px solid var(--ev-card-border)",
            borderRadius: 14,
          }}
        >
          <CapaDoEvento eventId={event.id} atual={event.cover_image_url} />

          <div
            className="ev-cabecalho-texto"
            style={{
              flex: 1,
              minWidth: 0,
              padding: "24px 28px 20px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "16px 24px",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, maxWidth: "100%" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: `var(--ev-st-${STATUS_VARS[event.status]}-bg)`,
                  color: `var(--ev-st-${STATUS_VARS[event.status]}-fg)`,
                }}
              >
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />
                {EVENT_STATUS_LABELS[event.status]}
              </span>

              <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
                <h1
                  className="ev-titulo"
                  title={titulo}
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-title)",
                    fontWeight: 500,
                    fontSize: 40,
                    lineHeight: 1.05,
                    letterSpacing: "-0.025em",
                    color: "var(--ev-text-strong)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                  }}
                >
                  {titulo}
                </h1>
                <Link
                  href={`/eventos/${event.id}/editar`}
                  aria-label="Editar dados do evento"
                  title="Editar dados do evento"
                  className="shrink-0 rounded p-1 text-[color:var(--ev-text-faint)] hover:bg-black/5 hover:text-[color:var(--ev-text-body)]"
                >
                  <Pencil size={15} />
                </Link>
              </div>

              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  letterSpacing: "0.01em",
                  color: "var(--ev-text-body)",
                  whiteSpace: "nowrap",
                  fontWeight: modoDestaque ? 600 : 400,
                }}
              >
                {linhaData}
              </p>

              {meta && (
                <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ev-text-muted)" }}>
                  {meta}
                </p>
              )}

              {/* Panorama e Imprimir evento (18/10/2026) no lugar dos três atalhos:
                  "O que o cliente vê" virou o botão Portal da cliente; Resumo e
                  Histórico ficam no Mais da faixa do alto */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <Link
                  href={`/eventos/${event.id}/panorama`}
                  className="ev-foco"
                  style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid var(--ev-card-border)", background: "var(--ev-marfim)", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, color: "var(--ev-text-strong)", textDecoration: "none" }}
                >
                  Panorama do evento
                </Link>
                <Link
                  href={`/imprimir/evento/${event.id}`}
                  target="_blank"
                  className="ev-foco"
                  style={{ display: "inline-flex", alignItems: "center", height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid var(--ev-card-border)", background: "var(--ev-marfim)", fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 600, color: "var(--ev-text-strong)", textDecoration: "none" }}
                >
                  Imprimir evento
                </Link>
              </div>
            </div>

            <div style={{ display: "flex", flex: "0 1 auto", maxWidth: "100%", gap: 8, alignItems: "center", whiteSpace: "nowrap", flexWrap: "wrap" }}>
              {/* o portal da cliente, em evidência: entrar e mandar o acesso */}
              <Link
                href={`/eventos/${event.id}/area-do-cliente`}
                className="ev-foco"
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 10,
                  fontFamily: "var(--font-ui)",
                  border: "1px solid #6E3F5F",
                  background: "#F3EBF0",
                  color: "#6E3F5F",
                  lineHeight: 1.15,
                  textDecoration: "none",
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Portal da cliente</span>
                <span style={{ fontSize: 11.5, opacity: 0.85 }}>
                  {acessos === null
                    ? "abrir e enviar o acesso"
                    : acessos === 0
                      ? "ainda sem acesso · enviar"
                      : `${acessos} ${acessos === 1 ? "pessoa entra" : "pessoas entram"} · enviar mais`}
                </span>
              </Link>
              <Link
                href={`/eventos/${event.id}/modo-evento`}
                className={modoDestaque ? "ev-btn-primario ev-foco" : "ev-btn-secundario ev-foco"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 10,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  border: modoDestaque ? "1px solid transparent" : "1px solid var(--ev-card-border)",
                  background: modoDestaque ? "var(--ev-cta)" : "var(--ev-card-bg)",
                  color: modoDestaque ? "#fff" : "var(--ev-text-strong)",
                  boxShadow: modoHoje ? "0 0 0 3px var(--ev-cta-ring)" : "none",
                  transition: "background 140ms ease, border-color 140ms ease",
                }}
              >
                <Play size={14} strokeWidth={2} />
                Modo Evento
              </Link>
              <AcoesDoEvento eventId={event.id} secundario={modoDestaque} />
            </div>
          </div>
        </header>
      </div>

      {/* no celular, os blocos das fases são a navegação (o modelo anterior) */}
      <style dangerouslySetInnerHTML={{ __html: ".ev-so-celular{display:none}@media (max-width:1023px){.ev-so-celular{display:block}}" }} />
      <div className="ev-so-celular">
        <BlocoDeFases
          eventId={event.id}
          fases={fases}
          tipoEvento={event.type}
          counters={{
            fornecedores: contadores.fornecedoresPendentes,
            comunicacao: contadores.comunicacaoNaoLidas,
            financeiro: contadores.financeiroVencendo,
            planejamento: contadores.planejamentoDaCliente,
            contratos: contadores.contratosAguardando,
            tarefas: contadores.tarefasVencidas,
          }}
          pendencias={pendencias}
          respostasDaCliente={contadores.planejamentoDaCliente}
        />
      </div>

      <RequerAtencao alertas={alertas} eventId={event.id} />

      <div>{children}</div>
    </EventoContainer>
  );
}
