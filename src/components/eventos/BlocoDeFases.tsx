"use client";

// O bloco de fases (Modelo A): um cartão só, com os três cartões de fase
// e, quando uma fase com abas está aberta, a linha de abas dela dentro
// do mesmo contêiner, com a ponta apontando para a coluna.
//
// Substitui FasesDoEvento + EventTabs. Cada célula é o link da fase e
// diz, em ordem: número e nome, o que pende (só quando pende), a
// contagem real (resumo-evento.ts), onde estão os menus, e a barra.
// Sem "?" em lugar nenhum: a explicação do menu vira dica ao passar o
// mouse.

import { usePathname } from "next/navigation";
import { DestinoDoEvento } from "@/components/eventos/DestinoDoEvento";
import { tem } from "@/lib/capacidades";
import { explicacaoDoEvento } from "@/lib/explicacoes-do-menu";
import {
  FASES,
  faseDoSegmento,
  segmentoDoCaminho,
  type FaseDoEvento,
  type NavegacaoDoEvento,
  type TabCounters,
} from "@/lib/fases-do-evento";
import type { FasesEvento } from "@/lib/supabase/resumo-evento";
import { plural } from "@/lib/format";

function dica(seg: string): string | undefined {
  const e = explicacaoDoEvento(seg);
  return e ? `${e.oQueE}\n${e.comoUsar}` : undefined;
}

export function BlocoDeFases({
  eventId,
  fases,
  tipoEvento,
  counters,
  pendencias,
  respostasDaCliente = 0,
  navegacao,
}: {
  eventId: string;
  fases: FasesEvento;
  tipoEvento?: string | null;
  counters: TabCounters;
  /** alertas do Requer atenção, contados por fase */
  pendencias: Record<FaseDoEvento, number>;
  /** blocos do Planejamento com resposta da cliente sem conferir (091) */
  respostasDaCliente?: number;
  /** só na demonstração da página de vendas: troca a tela sem roteador */
  navegacao?: NavegacaoDoEvento;
}) {
  const pathname = usePathname() ?? "";
  const base = `/eventos/${eventId}`;
  const segAtual = navegacao ? navegacao.seg : segmentoDoCaminho(pathname, eventId);
  const faseAtiva = faseDoSegmento(segAtual);
  const idx = FASES.findIndex((f) => f.id === faseAtiva);
  const aberta = idx >= 0 ? FASES[idx] : null;
  // só as abas que este tipo de evento tem (um show não tem RSVP nem mesas)
  const abasDe = (d: (typeof FASES)[number]) =>
    d.abas.filter((a) => !a.requer || tem(tipoEvento, a.requer));
  const abas = aberta ? abasDe(aberta) : [];

  return (
    <div
      style={{
        background: "var(--ev-card-bg)",
        border: "1px solid var(--ev-card-border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <nav
        aria-label="Fases do evento"
        className="ev-fases-grade"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        {FASES.map((f, i) => {
          const dados = fases.lista.find((x) => x.id === f.faseId);
          const pct = Math.max(0, Math.min(100, dados?.pct ?? 0));
          const anterior = i > 0 ? fases.lista.find((x) => x.id === FASES[i - 1].faseId) : null;
          const anteriorPronta = (anterior?.pct ?? 0) >= 100;
          const ativa = f.id === faseAtiva;

          // O que pende nesta fase: os alertas cujo destino cai aqui e,
          // no Planejamento, as respostas da cliente à espera de conferência
          // (a única coisa que espera ação de OUTRA pessoa).
          const partes: string[] = [];
          if (pendencias[f.id] > 0) partes.push(plural(pendencias[f.id], "pendência", "pendências"));
          if (f.id === "planejar" && respostasDaCliente > 0) {
            partes.push(
              respostasDaCliente === 1
                ? "1 resposta da cliente"
                : `${respostasDaCliente} respostas da cliente`
            );
          }

          return (
            <DestinoDoEvento
              key={f.id}
              href={`${base}/${f.rota}`}
              seg={f.rota}
              navegacao={navegacao}
              title={dica(f.rota)}
              ativo={ativa}
              className="ev-fase"
              style={{
                position: "relative",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                padding: "18px 22px 18px 26px",
                borderLeft: i > 0 ? "1px solid var(--ev-card-border)" : "none",
                background: ativa ? "var(--ev-accent-tint)" : "transparent",
                boxShadow: ativa ? "inset 0 -2px 0 var(--ev-text-strong)" : "none",
                color: "var(--ev-text-strong)",
                minWidth: 0,
                transition: "background 150ms ease",
              }}
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className="ev-conector"
                  style={{
                    position: "absolute",
                    left: -12,
                    top: "50%",
                    marginTop: -11,
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: "#fff",
                    border: "1px solid var(--ev-card-border)",
                    display: "grid",
                    placeItems: "center",
                    color: anteriorPronta ? "var(--ev-ok)" : "var(--ev-text-muted)",
                    zIndex: 1,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              )}
              <span
                style={{
                  fontFamily: "var(--font-title)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: ativa ? "var(--ev-accent)" : "var(--ev-text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {f.eyebrow}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 15,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {f.titulo}
              </span>
              {partes.length > 0 && (
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ev-warn)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  ● {partes.join(" · ")}
                </span>
              )}
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ev-text-muted)" }}>
                {dados?.contagem ?? ""}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ev-text-body)",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                {/* a lista sai das abas que existem para este tipo; o
                    Planejamento não tem abas e diz o que tem dentro */}
                {abasDe(f).length > 0 ? abasDe(f).map((a) => a.label).join(" · ") : f.telas}
              </span>
              <span
                aria-hidden
                style={{
                  marginTop: 10,
                  height: 4,
                  borderRadius: 9,
                  background: "var(--ev-track)",
                  overflow: "hidden",
                }}
              >
                <span
                  className="block h-full transition-[width] duration-500 motion-reduce:transition-none"
                  style={{ width: `${pct}%`, background: "var(--ev-ok)", borderRadius: 9 }}
                />
              </span>
              <span className="sr-only">{`${pct}% concluído.`}</span>
            </DestinoDoEvento>
          );
        })}
      </nav>

      {abas.length > 0 && (
        <div
          style={{
            position: "relative",
            borderTop: "1px solid var(--ev-card-border)",
            background: "var(--ev-marfim)",
            padding: "0 12px",
          }}
        >
          <span
            aria-hidden
            className="ev-ponta"
            style={{
              position: "absolute",
              top: -6,
              left: `calc(${idx * 33.333 + 16.667}% - 5px)`,
              width: 10,
              height: 10,
              background: "var(--ev-marfim)",
              borderLeft: "1px solid var(--ev-card-border)",
              borderTop: "1px solid var(--ev-card-border)",
              transform: "rotate(45deg)",
            }}
          />
          <nav aria-label={`Telas de ${aberta?.titulo}`} style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {abas.map((aba) => {
              const href = `${base}/${aba.seg}`;
              const ativa = segAtual === aba.seg || (aba.seg === "organizacao" && segAtual === "tarefas");
              const n = aba.counter ? counters[aba.counter] ?? 0 : 0;
              return (
                <DestinoDoEvento
                  key={aba.seg}
                  href={href}
                  seg={aba.seg}
                  navegacao={navegacao}
                  title={dica(aba.seg)}
                  ativo={ativa}
                  className="ev-aba"
                  style={{
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "12px 12px 11px",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-ui)",
                    fontSize: 14,
                    fontWeight: ativa ? 600 : 400,
                    color: ativa ? "var(--ev-text-strong)" : "var(--ev-text-body)",
                    borderBottom: `2px solid ${ativa ? "var(--ev-text-strong)" : "transparent"}`,
                    transition: "color 140ms ease",
                  }}
                >
                  {aba.label}
                  {n > 0 && (
                    <span
                      style={{
                        minWidth: 18,
                        padding: "2px 5px",
                        borderRadius: 999,
                        background: "var(--ev-text-strong)",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 600,
                        textAlign: "center",
                        lineHeight: 1.2,
                      }}
                    >
                      {n}
                    </span>
                  )}
                </DestinoDoEvento>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
