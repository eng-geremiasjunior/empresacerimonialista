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
// Verba total editável no lugar (é a cerimonialista quem informa; o
// portal da cliente entra depois). Sem copy explicando de onde vem: o
// número é o próprio controle.
// ------------------------------------------------------------------

function VerbaEditavel({
  total,
  onSalvar,
  compacta,
}: {
  total: number | null;
  onSalvar: (valor: number | null) => void;
  compacta?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState(total !== null ? String(total) : "");
  useEffect(() => setV(total !== null ? String(total) : ""), [total]);

  function confirmar() {
    setEditando(false);
    const num = v.trim() === "" ? null : Number(v.replace(/\./g, "").replace(",", "."));
    const novo = num !== null && !Number.isNaN(num) ? num : null;
    if (novo !== total) onSalvar(novo);
  }

  if (editando) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={monoLabel}>verba · R$</span>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          value={v}
          onChange={(e) => setV(e.target.value.replace(/[^\d.,]/g, ""))}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setV(total !== null ? String(total) : "");
              setEditando(false);
            }
          }}
          placeholder="0"
          style={{
            width: 120,
            height: 26,
            border: `1.5px solid ${C.ameixa}`,
            borderRadius: 6,
            padding: "0 8px",
            fontFamily: F_MONO,
            fontSize: 12,
            color: C.tinta,
            outline: "none",
            boxShadow: "0 0 0 3px rgba(110,63,95,.18)",
          }}
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      title="Editar a verba total"
      style={{
        border: "none",
        background: "none",
        padding: 0,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={monoLabel}>
        verba{total !== null ? ` · ${brl(total)}` : ""}
      </span>
      {total === null && (
        <span
          style={{
            fontFamily: F_UI,
            fontSize: compacta ? 12 : 13,
            color: C.ameixa,
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          informar verba
        </span>
      )}
      {total !== null && (
        <span style={{ fontFamily: F_MONO, fontSize: 10, color: C.fantasma }}>
          editar
        </span>
      )}
    </button>
  );
}

const valorGrande: React.CSSProperties = {
  fontFamily: F_TITLE,
  fontWeight: 600,
  fontSize: 18,
  lineHeight: "24px",
  letterSpacing: "-0.02em",
  color: C.tinta,
};

// A reserva de imprevistos é a fatia da verba que evita o efeito cascata
// (estourou no espaço → compensa na decoração → estoura de novo). No banco
// ela é um %, mas AQUI se edita em R$ — é o número que está à vista, e
// quem clica num valor em reais digita reais. O % vira consequência,
// mostrado no rótulo.
function ReservaEditavel({
  valor,
  verbaTotal,
  onSalvar,
}: {
  valor: number;
  verbaTotal: number | null;
  /** recebe o % correspondente ao valor digitado */
  onSalvar: (pct: number | null) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState(valor ? String(valor) : "");
  useEffect(() => setV(valor ? String(valor) : ""), [valor]);

  const semVerba = verbaTotal === null || verbaTotal <= 0;

  if (editando) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontFamily: F_MONO, fontSize: 12, color: C.meta }}>
          R$
        </span>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          value={v}
          onChange={(e) => setV(e.target.value.replace(/[^\d.,]/g, ""))}
          onBlur={() => {
            setEditando(false);
            const n =
              v.trim() === ""
                ? null
                : Number(v.replace(/\./g, "").replace(",", "."));
            if (n === null || Number.isNaN(n)) {
              onSalvar(null);
              return;
            }
            // a reserva nunca pode passar da verba inteira
            const limitado = Math.max(0, Math.min(verbaTotal ?? 0, n));
            const pct =
              verbaTotal && verbaTotal > 0
                ? Math.round((limitado / verbaTotal) * 1000) / 10
                : null;
            onSalvar(pct);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setV(valor ? String(valor) : "");
              setEditando(false);
            }
          }}
          style={{
            width: 110,
            height: 26,
            border: `1.5px solid ${C.ameixa}`,
            borderRadius: 6,
            padding: "0 8px",
            fontFamily: F_MONO,
            fontSize: 12,
            color: C.tinta,
            outline: "none",
            boxShadow: "0 0 0 3px rgba(110,63,95,.18)",
          }}
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={semVerba}
      onClick={() => setEditando(true)}
      title={
        semVerba
          ? "Informe a verba total primeiro"
          : "Editar a reserva para imprevistos"
      }
      style={{
        border: "none",
        background: "none",
        padding: 0,
        cursor: semVerba ? "default" : "pointer",
        textAlign: "left",
        borderBottom: semVerba ? "none" : `1px dashed ${C.bordaMedia}`,
      }}
    >
      <span style={valorGrande}>{brl(valor)}</span>
    </button>
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
          title="Editar o previsto deste objetivo"
          onClick={() => setEditando(true)}
          style={{
            width: 86,
            textAlign: "right",
            fontFamily: F_MONO,
            fontSize: 13,
            // vazio ≠ zero: "—" convida, "R$ 0" parece um valor decidido
            color: objetivo.valorPrevisto === null ? C.fantasma : C.tinta,
            border: "none",
            borderBottom: `1px dashed ${C.bordaMedia}`,
            background: "none",
            padding: "0 0 1px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {objetivo.valorPrevisto === null ? "—" : brl(objetivo.valorPrevisto)}
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
  onSalvarVerba,
  onSalvarReserva,
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
  /** A cerimonialista informa a verba aqui mesmo. */
  onSalvarVerba: (valor: number | null) => void;
  onSalvarReserva: (pct: number | null) => void;
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
  // Maior verba primeiro. Quem não consome verba (sem faixa de referência —
  // Estrutura, Convidados, Lua de mel…) vai para o fim: encabeçar a lista
  // com quatro linhas de "—" esconde justamente o que importa.
  const comPrevisto = [...ativos].sort((a, b) => {
    const semA = a.faixaPctIdeal === null ? 1 : 0;
    const semB = b.faixaPctIdeal === null ? 1 : 0;
    if (semA !== semB) return semA - semB;
    return Number(b.valorPrevisto ?? 0) - Number(a.valorPrevisto ?? 0);
  });
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
          <VerbaEditavel total={verba.total} onSalvar={onSalvarVerba} compacta />
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
          <VerbaEditavel total={verba.total} onSalvar={onSalvarVerba} />
          <BarraVerba verba={verba} altura={14} />
          <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
            <div>
              <div style={{ ...monoLabel, color: C.meta }}>previsto</div>
              <div style={valorGrande}>{brl(previstoSemReserva)}</div>
            </div>
            <div>
              <div style={{ ...monoLabel, color: C.meta }}>
                reserva
                {verba.reservaPct !== null ? ` · ${verba.reservaPct}%` : ""}
              </div>
              <ReservaEditavel
                valor={verba.reservaValor}
                verbaTotal={verba.total}
                onSalvar={onSalvarReserva}
              />
            </div>
            <div>
              <div style={{ ...monoLabel, color: C.meta }}>saldo livre</div>
              <div
                style={{
                  ...valorGrande,
                  color:
                    verba.saldo !== null && verba.saldo < 0
                      ? C.atrasadaFg
                      : C.tinta,
                }}
              >
                {verba.saldo !== null ? brl(verba.saldo) : "—"}
              </div>
            </div>
          </div>
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
