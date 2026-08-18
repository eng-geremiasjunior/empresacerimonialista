"use client";

// Modo Amplo (handoff §8): a jornada inteira, mês a mês, do início até o
// dia D. Mesmo dado do Foco, só afastado. Eixo cronológico — nada de Kanban.
//
// PREVISTO do mês = "A FECHAR": soma do valor_previsto dos objetivos cuja
// decisão de contratação (*_contratar) vence naquele mês e AINDA não tem
// valor_contratado. Invariante do modelo (três dinheiros): nunca se soma
// com parcelas — depois do contrato o dinheiro vive só nas parcelas, no
// Financeiro.

import type { Decisao, Objetivo } from "@/lib/supabase/planejamento";
import {
  brl,
  C,
  DOT_COR,
  estadoVisual,
  F_MONO,
  F_TITLE,
  F_UI,
  monoLabel,
} from "./celebra";

type Mes = {
  chave: string; // yyyy-mm
  rotulo: string; // "Agosto 2025"
  mesesAteEvento: number | null;
  decisoes: Decisao[];
  decididas: number;
  atrasadas: number;
  /** respostas da cliente esperando conferência (091) */
  daCliente: number;
  previsto: number; // "a fechar" no mês
  passado: boolean;
  atual: boolean;
};

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function chaveMes(iso: string): string {
  return iso.slice(0, 7);
}

function rotuloMes(chave: string): string {
  const [a, m] = chave.split("-").map(Number);
  return `${MESES_PT[m - 1]} ${a}`;
}

function proximoMes(chave: string): string {
  const [a, m] = chave.split("-").map(Number);
  const d = new Date(a, m, 1); // m já é o próximo (Date é 0-based)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function diffMeses(de: string, ate: string): number {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

export function montarMeses(
  objetivos: Objetivo[],
  dataEvento: string | null
): { meses: Mes[]; diaD: Mes | null } {
  const ativos = objetivos.filter((o) => o.ativo);
  const todas = ativos.flatMap((o) => o.decisoes);
  const comPrazo = todas.filter(
    (d) => d.prazoPrevisto !== null && d.estado !== "nao_se_aplica"
  );
  if (comPrazo.length === 0) return { meses: [], diaD: null };

  const hoje = new Date();
  const chaveHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const chaves = comPrazo.map((d) => chaveMes(d.prazoPrevisto!)).sort();
  const primeira = chaves[0] < chaveHoje ? chaves[0] : chaveHoje;
  const chaveEvento = dataEvento ? chaveMes(dataEvento) : chaves[chaves.length - 1];

  // objetivo → mês da decisão de contratação (para o "a fechar")
  const aFecharPorMes = new Map<string, number>();
  for (const o of ativos) {
    if (o.valorPrevisto === null) continue;
    const contratar = o.decisoes.find(
      (d) => d.codigo?.endsWith("_contratar") && d.estado !== "nao_se_aplica"
    );
    if (!contratar?.prazoPrevisto) continue;
    // já tem contrato? (valor_contratado preenchido) → saiu do "a fechar"
    const valorContratado = contratar.campos.find(
      (c) => c.codigo === "valor_contratado" && c.valorNumero !== null
    );
    if (valorContratado) continue;
    const chave = chaveMes(contratar.prazoPrevisto);
    aFecharPorMes.set(
      chave,
      (aFecharPorMes.get(chave) ?? 0) + Number(o.valorPrevisto)
    );
  }

  const porMes = new Map<string, Decisao[]>();
  for (const d of comPrazo) {
    const ch = chaveMes(d.prazoPrevisto!);
    const arr = porMes.get(ch) ?? [];
    arr.push(d);
    porMes.set(ch, arr);
  }

  const meses: Mes[] = [];
  let diaD: Mes | null = null;
  let cursor = primeira;
  // percorre até o mês do evento (limite duro de 36 para nunca laçar)
  for (let i = 0; i < 36 && cursor <= chaveEvento; i++) {
    const decisoes = (porMes.get(cursor) ?? []).sort((a, b) =>
      (a.prazoPrevisto ?? "").localeCompare(b.prazoPrevisto ?? "")
    );
    const decididas = decisoes.filter((d) => d.estado === "decidida").length;
    const atrasadas = decisoes.filter(
      (d) => estadoVisual(d) === "atrasada"
    ).length;
    const daCliente = decisoes.reduce(
      (s, d) => s + (d.aguardamConferencia ?? 0),
      0
    );
    const m: Mes = {
      chave: cursor,
      rotulo: rotuloMes(cursor),
      mesesAteEvento: dataEvento ? diffMeses(cursor, chaveEvento) : null,
      decisoes,
      decididas,
      atrasadas,
      daCliente,
      previsto: aFecharPorMes.get(cursor) ?? 0,
      passado: cursor < chaveHoje,
      atual: cursor === chaveHoje,
    };
    if (cursor === chaveEvento && dataEvento) diaD = m;
    else meses.push(m);
    cursor = proximoMes(cursor);
  }
  return { meses, diaD };
}

export function ModoAmplo({
  objetivos,
  dataEvento,
  diasAteEvento,
  mesExpandido,
  onToggleMes,
  onAbrirDecisao,
}: {
  objetivos: Objetivo[];
  dataEvento: string | null;
  diasAteEvento: number | null;
  mesExpandido: string | null;
  onToggleMes: (chave: string) => void;
  onAbrirDecisao: (d: Decisao) => void;
}) {
  const { meses, diaD } = montarMeses(objetivos, dataEvento);

  if (meses.length === 0 && !diaD) {
    return (
      <div
        style={{
          border: `1px solid ${C.bordaForte}`,
          borderRadius: 10,
          background: "#fff",
          padding: 24,
          fontFamily: F_UI,
          fontSize: 13,
          color: C.meta,
        }}
      >
        Defina a data do casamento para ver a jornada mês a mês.
      </div>
    );
  }

  const linhaMes = (m: Mes) => {
    const aberto = m.atual ? mesExpandido !== `fechado:${m.chave}` : mesExpandido === m.chave;
    return (
      <div key={m.chave}>
        <div
          onClick={() =>
            onToggleMes(
              m.atual ? (aberto ? `fechado:${m.chave}` : m.chave) : aberto ? "" : m.chave
            )
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: m.atual ? "12px 16px" : "9px 16px",
            borderBottom: `1px solid ${C.divisoria}`,
            borderTop: m.atual ? `1.5px solid ${C.bordaForte}` : "none",
            background: m.atual ? C.tint : "transparent",
            opacity: m.passado ? (m.atrasadas > 0 ? 0.7 : 0.55) : 1,
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden
            style={{
              width: m.atual ? 9 : 8,
              height: m.atual ? 9 : 8,
              borderRadius: "50%",
              flexShrink: 0,
              background: m.atual
                ? C.ameixa
                : m.passado
                  ? m.atrasadas > 0
                    ? C.atrasadaFg
                    : C.decididaFg
                  : "transparent",
              border:
                !m.passado && !m.atual ? `1.5px solid ${C.bordaMedia}` : "none",
            }}
          />
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: F_TITLE,
                fontWeight: 600,
                fontSize: m.atual ? 18 : 14,
                lineHeight: m.atual ? "24px" : "19px",
                letterSpacing: "-0.02em",
                color: C.tinta,
              }}
            >
              {m.rotulo}
            </span>
            {m.atual && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: C.tint2,
                  color: C.ameixa,
                  fontFamily: F_MONO,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                mês atual
              </span>
            )}
            <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.meta }}>
              {m.mesesAteEvento !== null
                ? m.mesesAteEvento === 0
                  ? "mês do dia D"
                  : `${m.mesesAteEvento} ${m.mesesAteEvento === 1 ? "mês" : "meses"}`
                : ""}
              {m.atual && diasAteEvento !== null
                ? ` · faltam ${diasAteEvento} dias`
                : ""}
              {m.atrasadas > 0
                ? ` · ${m.atrasadas} ${m.atrasadas === 1 ? "atrasada" : "atrasadas"}`
                : ""}
              {m.daCliente > 0 ? (
                <span style={{ color: C.pendenteFg }}>
                  {` · ${m.daCliente} da cliente`}
                </span>
              ) : (
                ""
              )}
            </span>
          </div>
          <span
            style={{
              width: 150,
              fontFamily: F_MONO,
              fontSize: 11,
              color: C.secundario,
              flexShrink: 0,
            }}
          >
            decisões {m.decididas}/{m.decisoes.length}
          </span>
          <span
            style={{
              width: 110,
              textAlign: "right",
              fontFamily: F_MONO,
              fontSize: 11,
              color: C.tinta,
              flexShrink: 0,
            }}
          >
            {brl(m.previsto)}
          </span>
          {m.atual && (
            <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.ameixa }}>
              {aberto ? "▾" : "›"}
            </span>
          )}
        </div>

        {aberto && m.decisoes.length > 0 && (
          <div
            style={{
              background: m.atual ? C.tint : C.cardSec,
              padding: "6px 16px 14px 44px",
              borderBottom: `1px solid ${C.divisoria}`,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span style={{ ...monoLabel, marginBottom: 2 }}>
              decisões desta janela
            </span>
            {m.decisoes.map((d) => {
              const ev = estadoVisual(d);
              const vazios = d.campos.length - d.camposPreenchidos;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAbrirDecisao(d);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    background: "#fff",
                    border: `1px solid ${C.bordaMedia}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
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
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: F_UI,
                      fontSize: 14,
                      color: C.tinta,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.titulo}{" "}
                    <span style={{ fontSize: 11, color: C.meta }}>
                      {vazios > 0
                        ? `· ${vazios} ${vazios === 1 ? "campo vazio" : "campos vazios"}`
                        : ""}
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: F_MONO,
                      fontSize: 11,
                      color: C.meta,
                      flexShrink: 0,
                    }}
                  >
                    abrir ›
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
      {/* cabeçalho da tabela */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px 8px 44px",
          background: C.zona,
          borderBottom: `1px solid ${C.bordaSutil}`,
        }}
      >
        <span style={{ ...monoLabel, flex: 1 }}>mês</span>
        <span style={{ ...monoLabel, width: 150 }}>decisões</span>
        <span style={{ ...monoLabel, width: 110, textAlign: "right" }}>
          previsto
        </span>
      </div>

      {meses.map(linhaMes)}

      {/* dia D */}
      {diaD && dataEvento && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: C.zona,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 9,
              height: 9,
              background: C.tinta,
              transform: "rotate(45deg)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              flex: 1,
              fontFamily: F_TITLE,
              fontWeight: 600,
              fontSize: 18,
              lineHeight: "24px",
              letterSpacing: "-0.02em",
              color: C.tinta,
            }}
          >
            {(() => {
              const [a, m, d] = dataEvento.split("-").map(Number);
              return `${d} de ${MESES_PT[m - 1].toLowerCase()} de ${a} — dia D`;
            })()}
          </span>
          <span
            style={{
              width: 150,
              fontFamily: F_MONO,
              fontSize: 11,
              color: C.secundario,
            }}
          >
            decisões {diaD.decididas}/{diaD.decisoes.length}
          </span>
          <span
            style={{
              width: 110,
              textAlign: "right",
              fontFamily: F_MONO,
              fontSize: 11,
              color: C.tinta,
            }}
          >
            {brl(diaD.previsto)}
          </span>
        </div>
      )}
    </div>
  );
}
