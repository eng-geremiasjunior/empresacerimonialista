"use client";

// Mapa mental (handoff §9) — SOMENTE LEITURA. Arquitetura do casamento de
// uma olhada; clicar num nó leva DE VOLTA ao modo Foco, na decisão/objetivo.
//
// Duas propostas (1c radial, 1d árvore) com um alternador TEMPORÁRIO — a
// versão final terá só uma; o alternador existe para a escolha ser feita
// vendo dado real, e depois sai.
//
// Vínculos mostrados são os REAIS: objetivo → decisões → tarefas que a
// decisão gera (4C). Sem curvas decisão→decisão (dependência não existe no
// banco) e sem qualquer conceito de bloqueio.

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Decisao, Objetivo } from "@/lib/supabase/planejamento";
import {
  brl,
  C,
  dataBr,
  DOT_COR,
  estadoVisual,
  F_MONO,
  F_TITLE,
  F_UI,
  monoLabel,
  rotuloArquetipo,
  tituloStyle,
} from "./celebra";

type Props = {
  objetivos: Objetivo[];
  clienteNome: string | null;
  localEvento: string | null;
  dataEvento: string | null;
  diasAteEvento: number | null;
  escala: string | null;
  cenario: string | null;
  verbaTotal: number | null;
  onFechar: () => void;
  onIrParaObjetivo: (objetivoId: string) => void;
  onIrParaDecisao: (d: Decisao) => void;
};

function CartaoEvento({
  clienteNome,
  dataEvento,
  localEvento,
  escala,
  cenario,
  verbaTotal,
  diasAteEvento,
  largura,
}: Pick<
  Props,
  | "clienteNome"
  | "dataEvento"
  | "localEvento"
  | "escala"
  | "cenario"
  | "verbaTotal"
  | "diasAteEvento"
> & { largura: number }) {
  const linha1 = [
    dataEvento ? dataBr(dataEvento) : null,
    localEvento,
    rotuloArquetipo(escala)?.toLowerCase(),
    rotuloArquetipo(cenario)?.toLowerCase(),
  ]
    .filter(Boolean)
    .join(" · ");
  const linha2 = [
    verbaTotal !== null ? brl(verbaTotal) : null,
    diasAteEvento !== null ? `${diasAteEvento} dias` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      style={{
        width: largura,
        background: C.tinta,
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: F_TITLE,
          fontWeight: 600,
          fontSize: 19,
          lineHeight: "25px",
          letterSpacing: "-0.02em",
          color: "#fff",
        }}
      >
        {clienteNome ?? "Casamento"}
      </span>
      {linha1 && (
        <span style={{ fontFamily: F_MONO, fontSize: 10, lineHeight: "15px", color: "#B8BCC0" }}>
          {linha1}
        </span>
      )}
      {linha2 && (
        <span style={{ fontFamily: F_MONO, fontSize: 10, lineHeight: "15px", color: "#B8BCC0" }}>
          {linha2}
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// 1c — Radial: evento no centro, objetivos em elipse ao redor
// ------------------------------------------------------------------

function MapaRadial(props: Props) {
  const ativos = props.objetivos.filter((o) => o.ativo);
  const atualId = ativos.find((o) => o.bucket === "agora")?.id ?? null;
  const n = ativos.length;

  // posições em % sobre a área (elipse), começando no topo
  const pos = ativos.map((_, i) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return {
      x: 50 + 38 * Math.cos(ang),
      y: 50 + 40 * Math.sin(ang),
    };
  });

  return (
    <div style={{ position: "relative", height: 660, background: "#fff" }}>
      {/* arestas centro → nó (vínculo real objetivo-do-evento) */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {pos.map((p, i) => (
          <line
            key={i}
            x1={50}
            y1={50}
            x2={p.x}
            y2={p.y}
            stroke={C.bordaMedia}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* centro */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 2,
        }}
      >
        <CartaoEvento {...props} largura={240} />
      </div>

      {/* nós */}
      {ativos.map((o, i) => {
        const ativo = o.id === atualId;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => props.onIrParaObjetivo(o.id)}
            title="Abrir no modo Foco"
            style={{
              position: "absolute",
              left: `${pos[i].x}%`,
              top: `${pos[i].y}%`,
              transform: "translate(-50%,-50%)",
              width: 190,
              background: "#fff",
              border: `1.5px solid ${ativo ? C.ameixa : C.bordaForte}`,
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "left",
              cursor: "pointer",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: F_TITLE,
                fontWeight: 600,
                fontSize: 14,
                lineHeight: "19px",
                letterSpacing: "-0.02em",
                color: C.tinta,
              }}
            >
              {o.nome}
            </span>
            <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.meta }}>
              {o.decididas}/{o.aplicaveis} · {brl(o.valorPrevisto)}
            </span>
            {ativo && (
              <span style={{ display: "flex", gap: 3, marginTop: 2 }}>
                {o.decisoes
                  .filter((d) => d.estado !== "nao_se_aplica")
                  .slice(0, 8)
                  .map((d) => (
                    <span
                      key={d.id}
                      style={{
                        width: 16,
                        height: 6,
                        borderRadius: 3,
                        background:
                          d.estado === "decidida" ? C.ameixa : C.bordaSutil,
                      }}
                    />
                  ))}
              </span>
            )}
          </button>
        );
      })}

      {/* legenda */}
      <p
        style={{
          position: "absolute",
          left: 22,
          bottom: 14,
          maxWidth: 420,
          fontFamily: F_UI,
          fontSize: 11,
          lineHeight: "16px",
          color: C.meta,
        }}
      >
        Linha cheia = objetivo do evento · barrinhas = decisões resolvidas do
        objetivo da janela atual.
      </p>
    </div>
  );
}

// ------------------------------------------------------------------
// 1d — Árvore horizontal: evento → objetivos → decisões (e as tarefas
// que cada decisão gera, vínculo real da 4C)
// ------------------------------------------------------------------

function MapaArvore(props: Props) {
  const ativos = props.objetivos.filter((o) => o.ativo);
  const atual = ativos.find((o) => o.bucket === "agora") ?? ativos[0] ?? null;

  const JANELA: Record<string, string> = {
    agora: "agora",
    proximas: "próximas",
    depois: "depois",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        padding: "26px 22px 30px",
        background: "#fff",
        overflowX: "auto",
      }}
    >
      {/* coluna 1 — evento */}
      <div style={{ flexShrink: 0, alignSelf: "flex-start" }}>
        <CartaoEvento {...props} largura={210} />
      </div>

      {/* espinha 1 */}
      <div
        style={{
          width: 34,
          flexShrink: 0,
          borderLeft: `1.5px solid ${C.bordaMedia}`,
          marginLeft: 34,
        }}
      />

      {/* coluna 2 — objetivos · categorias de verba */}
      <div
        style={{
          width: 250,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span style={{ ...monoLabel, marginBottom: 2 }}>
          objetivos · categorias de verba
        </span>
        {ativos.map((o) => {
          const ehAtual = atual?.id === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => props.onIrParaObjetivo(o.id)}
              title="Abrir no modo Foco"
              style={{
                textAlign: "left",
                background: "#fff",
                border: `1.5px solid ${ehAtual ? C.ameixa : C.bordaForte}`,
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
                opacity:
                  o.bucket === "depois" ? 0.6 : o.bucket === "proximas" ? 0.75 : 1,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <span
                style={{
                  fontFamily: F_TITLE,
                  fontWeight: 600,
                  fontSize: 14,
                  lineHeight: "19px",
                  letterSpacing: "-0.02em",
                  color: C.tinta,
                }}
              >
                {o.nome}
              </span>
              <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.meta }}>
                {o.decididas}/{o.aplicaveis} · {brl(o.valorPrevisto)} ·{" "}
                {JANELA[o.bucket]}
              </span>
            </button>
          );
        })}
      </div>

      {/* espinha 2 */}
      <div
        style={{
          width: 34,
          flexShrink: 0,
          borderLeft: `1.5px solid ${C.bordaMedia}`,
          marginLeft: 34,
        }}
      />

      {/* coluna 3 — decisões penduradas no objetivo da janela atual */}
      <div style={{ flex: 1, minWidth: 300 }}>
        <span style={{ ...monoLabel, display: "block", marginBottom: 10 }}>
          decisões penduradas no objetivo
          {atual ? ` — ${atual.nome.toLowerCase()}` : ""}
        </span>
        {atual && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            {atual.decisoes.map((d) => {
              const ev = estadoVisual(d);
              const na = ev === "na";
              const vazios = d.campos.length - d.camposPreenchidos;
              const meta = na
                ? "não se aplica"
                : ev === "decidida"
                  ? "decidida"
                  : d.campos.length > 0
                    ? `${vazios} ${vazios === 1 ? "vazio" : "vazios"}`
                    : "pendente";
              const tarefas =
                d.gerariaTarefas.length > 0
                  ? ` · gera ${d.gerariaTarefas.length} tarefas`
                  : "";
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => props.onIrParaDecisao(d)}
                  title="Abrir no modo Foco"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#fff",
                    border: `1px solid ${C.bordaMedia}`,
                    borderRadius: 8,
                    padding: "9px 11px",
                    cursor: "pointer",
                    textAlign: "left",
                    opacity: na ? 0.6 : 1,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: DOT_COR[ev],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontFamily: F_UI,
                        fontSize: 13,
                        lineHeight: "17px",
                        color: C.tinta,
                        textDecoration: na ? "line-through" : "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.titulo}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontFamily: F_MONO,
                        fontSize: 10,
                        color: C.meta,
                      }}
                    >
                      {meta}
                      {tarefas}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p
          style={{
            marginTop: 14,
            fontFamily: F_UI,
            fontSize: 11,
            lineHeight: "16px",
            color: C.meta,
          }}
        >
          “gera N tarefas” é o vínculo real com a Organização: decidir cria as
          tarefas; reverter remove só as pendentes.
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Contêiner com cabeçalho próprio
// ------------------------------------------------------------------

export function MapaMental(props: Props) {
  // Alternador TEMPORÁRIO entre as duas propostas — sai quando a escolha
  // for feita com dado real.
  const [proposta, setProposta] = useState<"radial" | "arvore">("radial");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onFechar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        border: `1px solid ${C.bordaForte}`,
        borderRadius: 10,
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 22px",
          background: C.zona2,
          borderBottom: `1px solid ${C.bordaSutil}`,
          flexWrap: "wrap",
        }}
      >
        <span style={tituloStyle(17, 23)}>Mapa mental</span>
        <span
          style={{
            padding: "3px 9px",
            borderRadius: 20,
            background: "#E4E6E8",
            fontFamily: F_MONO,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: C.secundario,
          }}
        >
          somente leitura
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 200,
            fontFamily: F_UI,
            fontSize: 12,
            color: C.meta,
          }}
        >
          Arquitetura do casamento de uma olhada. Clicar num nó leva de volta à
          decisão no modo Foco.
        </span>
        {/* alternador temporário (avaliação com dado real) */}
        <span style={{ display: "flex", gap: 2 }}>
          {(["radial", "arvore"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProposta(p)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                background: proposta === p ? C.tinta : "transparent",
                fontFamily: F_MONO,
                fontSize: 11,
                color: proposta === p ? "#fff" : C.secundario,
                cursor: "pointer",
              }}
            >
              {p === "radial" ? "radial" : "árvore"}
            </button>
          ))}
        </span>
        <button
          type="button"
          onClick={props.onFechar}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            border: "none",
            background: "none",
            fontFamily: F_TITLE,
            fontWeight: 600,
            fontSize: 13,
            color: C.tinta,
            cursor: "pointer",
          }}
        >
          Fechar <X size={14} />
        </button>
      </div>

      {proposta === "radial" ? (
        <MapaRadial {...props} />
      ) : (
        <MapaArvore {...props} />
      )}
    </div>
  );
}
