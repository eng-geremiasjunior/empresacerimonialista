"use client";

// Faixa de contexto (handoff §4): verba + arquétipo + previsto por objetivo
// + aviso de distribuição desatualizada. No Modo Amplo encolhe para uma
// linha — a tela pertence à linha do tempo.
//
// A lista "previsto por objetivo" É a lista de objetivos (objetivo =
// categoria de verba, mesma entidade): clicar rola até o objetivo na
// jornada; o valor é editável inline (tudo permanece editável — a sugestão
// nunca manda).

import { useEffect, useRef, useState } from "react";
import type { Objetivo, Verba } from "@/lib/supabase/planejamento";
import {
  brl,
  C,
  CENARIOS,
  ESCALAS,
  F_MONO,
  F_TITLE,
  F_UI,
  monoLabel,
  rotuloArquetipo,
} from "./celebra";

// ------------------------------------------------------------------
// Chip de arquétipo com menu (▾)
// ------------------------------------------------------------------

function ChipArquetipo({
  valor,
  placeholder,
  opcoes,
  onEscolher,
  disabled,
}: {
  valor: string | null;
  placeholder: string;
  opcoes: { valor: string; rotulo: string }[];
  onEscolher: (valor: string) => void;
  disabled?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setAberto(false);
    }
    if (aberto) document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAberto((a) => !a)}
        style={{
          height: 32,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: `1.5px solid ${C.bordaForte}`,
          borderRadius: 8,
          background: C.zona2,
          fontFamily: F_TITLE,
          fontWeight: 500,
          fontSize: 13,
          color: valor ? C.tinta : C.fantasma,
          cursor: disabled ? "default" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {rotuloArquetipo(valor) ?? placeholder}
        <span style={{ color: C.meta }}>▾</span>
      </button>
      {aberto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 30,
            minWidth: 168,
            background: "#fff",
            border: `1px solid ${C.bordaMedia}`,
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(35,38,42,.12)",
            padding: 4,
          }}
        >
          {opcoes.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => {
                setAberto(false);
                if (o.valor !== valor) onEscolher(o.valor);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 6,
                border: "none",
                background: o.valor === valor ? C.tint : "transparent",
                fontFamily: F_UI,
                fontSize: 13,
                color: C.tinta,
                cursor: "pointer",
              }}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Barra segmentada da verba: previsto (ameixa) + reserva (ameixa clara)
// sobre o fundo (saldo livre)
// ------------------------------------------------------------------

function BarraVerba({
  verba,
  altura,
  largura,
}: {
  verba: Verba;
  altura: number;
  largura?: number | string;
}) {
  const total = verba.total ?? 0;
  const previsto = Math.max(0, verba.comprometido - verba.reservaValor);
  const pctPrev = total > 0 ? Math.min(100, (previsto / total) * 100) : 0;
  const pctRes =
    total > 0
      ? Math.min(100 - pctPrev, (verba.reservaValor / total) * 100)
      : 0;
  return (
    <div
      style={{
        display: "flex",
        height: altura,
        width: largura ?? "100%",
        border: `1px solid ${C.bordaMedia}`,
        borderRadius: altura / 2,
        overflow: "hidden",
        background: C.zona,
        flexShrink: 0,
      }}
    >
      <div style={{ width: `${pctPrev}%`, background: C.ameixa }} />
      <div style={{ width: `${pctRes}%`, background: C.ameixaClara }} />
    </div>
  );
}

// ------------------------------------------------------------------
// Linha editável do previsto por objetivo
// ------------------------------------------------------------------

function LinhaPrevisto({
  objetivo,
  base,
  maiorValor,
  onIr,
  onEditar,
  ultima,
}: {
  objetivo: Objetivo;
  base: number | null;
  maiorValor: number;
  onIr: () => void;
  onEditar: (valor: number | null) => void;
  ultima: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState(
    objetivo.valorPrevisto !== null ? String(objetivo.valorPrevisto) : ""
  );
  useEffect(
    () =>
      setV(objetivo.valorPrevisto !== null ? String(objetivo.valorPrevisto) : ""),
    [objetivo.valorPrevisto]
  );

  const valor = objetivo.valorPrevisto !== null ? Number(objetivo.valorPrevisto) : 0;
  const pct = base && base > 0 ? Math.round((valor / base) * 100) : null;
  const larguraBarra = maiorValor > 0 ? (valor / maiorValor) * 100 : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "7px 0",
        borderBottom: ultima ? "none" : `1px solid ${C.divisoria}`,
      }}
    >
      <button
        type="button"
        onClick={onIr}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          border: "none",
          background: "none",
          padding: 0,
          fontFamily: F_UI,
          fontSize: 14,
          lineHeight: "18px",
          color: C.tinta,
          cursor: "pointer",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {objetivo.nome}
      </button>
      <div
        style={{
          width: 150,
          height: 6,
          background: C.zona,
          borderRadius: 3,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${larguraBarra}%`,
            height: "100%",
            background: C.ameixa,
          }}
        />
      </div>
      <span
        style={{
          width: 44,
          textAlign: "right",
          fontFamily: F_MONO,
          fontSize: 12,
          color: C.meta,
          flexShrink: 0,
        }}
      >
        {pct !== null ? `${pct}%` : "—"}
      </span>
      {editando ? (
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          value={v}
          onChange={(e) => setV(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={() => {
            setEditando(false);
            const num = v === "" ? null : Number(v);
            const atual =
              objetivo.valorPrevisto !== null ? Number(objetivo.valorPrevisto) : null;
            if (num !== atual) onEditar(num);
          }}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.target as HTMLInputElement).blur()
          }
          style={{
            width: 86,
            textAlign: "right",
            fontFamily: F_MONO,
            fontSize: 13,
            color: C.tinta,
            border: `1px solid ${C.ameixa}`,
            borderRadius: 6,
            padding: "2px 4px",
            outline: "none",
            flexShrink: 0,
          }}
        />
      ) : (
        <button
          type="button"
          title="Editar o previsto"
          onClick={() => setEditando(true)}
          style={{
            width: 86,
            textAlign: "right",
            fontFamily: F_MONO,
            fontSize: 13,
            color: C.tinta,
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {brl(objetivo.valorPrevisto)}
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// A faixa
// ------------------------------------------------------------------

export function FaixaContexto({
  verba,
  objetivos,
  escala,
  cenario,
  compacta,
  avisoVisivel,
  onArquetipo,
  onSugerir,
  sugerindo,
  erroSugerir,
  onEditarPrevisto,
  onIrParaObjetivo,
  onManterAviso,
}: {
  verba: Verba;
  objetivos: Objetivo[];
  escala: string | null;
  cenario: string | null;
  /** Modo Amplo: a faixa encolhe para uma linha (§4.4). */
  compacta: boolean;
  avisoVisivel: boolean;
  onArquetipo: (eixo: "escala" | "cenario", valor: string) => void;
  onSugerir: () => void;
  sugerindo: boolean;
  erroSugerir: string | null;
  onEditarPrevisto: (objetivoId: string, valor: number | null) => void;
  onIrParaObjetivo: (objetivoId: string) => void;
  onManterAviso: () => void;
}) {
  const [previstoAberto, setPrevistoAberto] = useState(true);
  const [verTodos, setVerTodos] = useState(false);
  const [detalhar, setDetalhar] = useState(false);

  const ativos = objetivos.filter((o) => o.ativo);
  const comPrevisto = [...ativos].sort(
    (a, b) => Number(b.valorPrevisto ?? 0) - Number(a.valorPrevisto ?? 0)
  );
  const maior = Number(comPrevisto[0]?.valorPrevisto ?? 0);
  const visiveis = verTodos ? comPrevisto : comPrevisto.slice(0, 4);
  const restantes = comPrevisto.length - 4;
  const base =
    verba.total !== null ? verba.total - verba.reservaValor : null;
  const previstoSemReserva = Math.max(
    0,
    verba.comprometido - verba.reservaValor
  );

  const chips = (
    <>
      <ChipArquetipo
        valor={escala}
        placeholder="Escala"
        opcoes={ESCALAS}
        onEscolher={(v) => onArquetipo("escala", v)}
      />
      <ChipArquetipo
        valor={cenario}
        placeholder="Cenário"
        opcoes={CENARIOS}
        onEscolher={(v) => onArquetipo("cenario", v)}
      />
    </>
  );

  const aviso = avisoVisivel && (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 20px",
        borderTop: `1.5px dashed ${C.bordaForte}`,
        background: C.avisoBg,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          flex: 1,
          minWidth: 220,
          fontFamily: F_UI,
          fontSize: 13,
          lineHeight: "18px",
          color: C.corpo,
        }}
      >
        {cenario ? (
          <>
            O cenário mudou para{" "}
            <strong>{rotuloArquetipo(cenario)?.toLowerCase()}</strong> — a
            distribuição ficou desatualizada.
          </>
        ) : (
          <>O arquétipo mudou — a distribuição ficou desatualizada.</>
        )}
      </span>
      <button
        type="button"
        onClick={onSugerir}
        disabled={sugerindo}
        style={{
          height: 30,
          padding: "0 12px",
          border: `1.5px solid ${C.ameixa}`,
          borderRadius: 8,
          background: "transparent",
          fontFamily: F_TITLE,
          fontWeight: 600,
          fontSize: 12,
          color: C.ameixa,
          cursor: "pointer",
          opacity: sugerindo ? 0.6 : 1,
        }}
      >
        {sugerindo ? "Sugerindo…" : "Re-sugerir"}
      </button>
      <button
        type="button"
        onClick={onManterAviso}
        style={{
          border: "none",
          background: "none",
          fontFamily: F_UI,
          fontSize: 13,
          color: C.meta,
          cursor: "pointer",
        }}
      >
        Manter como está
      </button>
    </div>
  );

  // ---- versão compacta (Modo Amplo) ----
  if (compacta && !detalhar) {
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
            gap: 18,
            padding: "12px 18px",
            flexWrap: "wrap",
          }}
        >
          <span style={monoLabel}>verba</span>
          <BarraVerba verba={verba} altura={10} largura={190} />
          <span
            style={{
              fontFamily: F_MONO,
              fontSize: 12,
              color: C.corpo,
              whiteSpace: "nowrap",
            }}
          >
            {brl(previstoSemReserva)} previsto · {brl(verba.reservaValor)}{" "}
            reserva ·{" "}
            {verba.saldo !== null ? `${brl(verba.saldo)} livre` : "sem verba"}
          </span>
          <div
            style={{ width: 1, alignSelf: "stretch", background: C.bordaSutil }}
          />
          {chips}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setDetalhar(true)}
            style={{
              border: "none",
              background: "none",
              fontFamily: F_MONO,
              fontSize: 11,
              color: C.meta,
              cursor: "pointer",
            }}
          >
            detalhar ▾
          </button>
        </div>
        {aviso}
      </div>
    );
  }

  // ---- versão completa (Modo Foco, ou Amplo com "detalhar") ----
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
          padding: "18px 20px",
          display: "flex",
          gap: 28,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* esquerda: verba */}
        <div
          style={{
            flex: 1,
            minWidth: 280,
            display: "flex",
            flexDirection: "column",
            gap: 11,
          }}
        >
          <span style={monoLabel}>
            verba{verba.total !== null ? ` · ${brl(verba.total)}` : ""}
          </span>
          <BarraVerba verba={verba} altura={14} />
          <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
            {[
              { r: "previsto", v: previstoSemReserva },
              { r: "reserva", v: verba.reservaValor },
              {
                r: "saldo livre",
                v: verba.saldo,
              },
            ].map((n) => (
              <div key={n.r}>
                <div style={{ ...monoLabel, color: C.meta }}>{n.r}</div>
                <div
                  style={{
                    fontFamily: F_TITLE,
                    fontWeight: 600,
                    fontSize: 18,
                    lineHeight: "24px",
                    letterSpacing: "-0.02em",
                    color: C.tinta,
                  }}
                >
                  {n.v !== null ? brl(n.v) : "—"}
                </div>
              </div>
            ))}
          </div>
          {verba.total === null && (
            <p
              style={{
                fontFamily: F_UI,
                fontSize: 12,
                lineHeight: "17px",
                color: C.meta,
              }}
            >
              A verba total vem da decisão “Levantar o budget”, em Estrutura e
              datas.
            </p>
          )}
        </div>

        <div
          style={{ width: 1, alignSelf: "stretch", background: C.bordaSutil }}
        />

        {/* direita: arquétipo */}
        <div
          style={{
            width: 310,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}
        >
          <span style={monoLabel}>arquétipo do casamento</span>
          <div style={{ display: "flex", gap: 8 }}>{chips}</div>
          <span
            style={{
              fontFamily: F_UI,
              fontSize: 11,
              lineHeight: "16px",
              color: C.meta,
            }}
          >
            Escala e cenário definem quais objetivos existem, os prazos e os %
            de referência.
          </span>
          <button
            type="button"
            onClick={onSugerir}
            disabled={sugerindo}
            style={{
              alignSelf: "flex-start",
              height: 40,
              padding: "0 14px",
              border: `1.5px solid ${C.ameixa}`,
              borderRadius: 8,
              background: "transparent",
              fontFamily: F_TITLE,
              fontWeight: 600,
              fontSize: 13,
              color: C.ameixa,
              cursor: "pointer",
              opacity: sugerindo ? 0.6 : 1,
              transition: "background 150ms ease",
            }}
          >
            {sugerindo ? "Sugerindo…" : "Sugerir distribuição"}
          </button>
          {erroSugerir && (
            <span
              style={{ fontFamily: F_UI, fontSize: 12, color: C.atrasadaFg }}
            >
              {erroSugerir}
            </span>
          )}
        </div>
      </div>

      {/* linha 2 — previsto por objetivo (a própria lista de objetivos) */}
      <div
        style={{
          padding: "6px 20px 16px",
          borderTop: `1px dashed ${C.bordaMedia}`,
        }}
      >
        <button
          type="button"
          onClick={() => setPrevistoAberto((a) => !a)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 0 8px",
            border: "none",
            background: "none",
            cursor: "pointer",
          }}
        >
          <span style={monoLabel}>previsto por objetivo</span>
          <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.meta }}>
            {previstoAberto ? "▾ recolher" : "› abrir"}
          </span>
        </button>
        {previstoAberto && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {visiveis.map((o, i) => (
              <LinhaPrevisto
                key={o.id}
                objetivo={o}
                base={base}
                maiorValor={maior}
                onIr={() => onIrParaObjetivo(o.id)}
                onEditar={(v) => onEditarPrevisto(o.id, v)}
                ultima={i === visiveis.length - 1 && restantes <= 0}
              />
            ))}
            {restantes > 0 && !verTodos && (
              <button
                type="button"
                onClick={() => setVerTodos(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 0",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{ fontFamily: F_UI, fontSize: 13, color: C.meta }}
                >
                  + {restantes} objetivos
                </span>
                <span
                  style={{ fontFamily: F_MONO, fontSize: 12, color: C.meta }}
                >
                  ver todos ›
                </span>
              </button>
            )}
            {verTodos && restantes > 0 && (
              <button
                type="button"
                onClick={() => setVerTodos(false)}
                style={{
                  alignSelf: "flex-start",
                  padding: "7px 0",
                  border: "none",
                  background: "none",
                  fontFamily: F_MONO,
                  fontSize: 12,
                  color: C.meta,
                  cursor: "pointer",
                }}
              >
                ▴ mostrar menos
              </button>
            )}
          </div>
        )}
      </div>

      {compacta && detalhar && (
        <div style={{ padding: "0 20px 12px" }}>
          <button
            type="button"
            onClick={() => setDetalhar(false)}
            style={{
              border: "none",
              background: "none",
              fontFamily: F_MONO,
              fontSize: 11,
              color: C.meta,
              cursor: "pointer",
            }}
          >
            ▴ recolher
          </button>
        </div>
      )}

      {aviso}
    </div>
  );
}
