"use client";

// Modo Foco (handoff §7): "o que eu faço agora" — a fila das decisões
// críticas + a jornada por janelas (AGORA / PRÓXIMAS / DEPOIS / NÃO SE
// APLICA). A jornada NUNCA some. Tempo sempre relativo; sem Kanban.
//
// Sem linha "Destrava X" e sem estado "bloqueada": dependência entre
// decisões não existe no banco — nada de copy que promete fluxo que não
// existe. O sistema sugere ordem, não trava.

import { useState } from "react";
import type { Decisao, DecisaoCritica, Objetivo } from "@/lib/supabase/planejamento";
import {
  brl,
  C,
  DOT_COR,
  estadoVisual,
  F_MONO,
  F_TITLE,
  F_UI,
  monoLabel,
  PILULA,
  prazoRelativo,
  tituloStyle,
} from "./celebra";
import { resumoCampos, type SupplierRef } from "./DrawerDecisao";
import { rotuloResponsavel } from "@/lib/papel";

// O rótulo do papel mora em lib/papel.ts — era esta função, duplicada
// aqui e no ModoFoco, e ausente na Organização.
const respLabel = rotuloResponsavel;

// ------------------------------------------------------------------
// Fila "Decidir agora"
// ------------------------------------------------------------------

function CardCritica({
  decisao,
  primeira,
  onAbrir,
  onNaoSeAplica,
}: {
  decisao: DecisaoCritica;
  primeira: boolean;
  onAbrir: () => void;
  onNaoSeAplica: () => void;
}) {
  const vazios = decisao.campos.length - decisao.camposPreenchidos;
  const prazo = prazoRelativo(decisao.prazoPrevisto);
  const meta = [
    `${vazios} ${vazios === 1 ? "campo vazio" : "campos vazios"}`,
    ...(prazo ? [prazo] : []),
  ].join(" · ");

  return (
    <div
      style={{
        border: `1px solid ${C.bordaForte}`,
        borderRadius: 10,
        background: "#fff",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxShadow: "0 1px 2px rgba(0,0,0,.04)",
      }}
    >
      <span style={{ ...monoLabel, color: C.meta }}>
        {decisao.objetivoNome}
      </span>
      <span style={tituloStyle(16, 22)}>{decisao.titulo}</span>
      <span
        style={{
          fontFamily: F_MONO,
          fontSize: 11,
          lineHeight: "16px",
          color: C.secundario,
        }}
      >
        {meta}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 2,
        }}
      >
        <button
          type="button"
          onClick={onAbrir}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 8,
            border: primeira ? "none" : `1.5px solid ${C.bordaForte}`,
            background: primeira ? C.ameixa : "#fff",
            color: primeira ? "#fff" : C.tinta,
            fontFamily: F_TITLE,
            fontWeight: 500,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Abrir
        </button>
        <button
          type="button"
          onClick={onNaoSeAplica}
          style={{
            border: "none",
            background: "none",
            fontFamily: F_UI,
            fontSize: 12,
            color: C.meta,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Não se aplica
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Linha de decisão dentro do objetivo expandido
// ------------------------------------------------------------------

function LinhaDecisao({
  tipoEvento,
  decisao,
  suppliers,
  onAbrir,
  onReativar,
}: {
  tipoEvento: string;
  decisao: Decisao;
  suppliers: SupplierRef[];
  onAbrir: () => void;
  onReativar: () => void;
}) {
  const ev = estadoVisual(decisao);
  const na = ev === "na";
  const vazios = decisao.campos.length - decisao.camposPreenchidos;
  const resumo =
    ev === "decidida" ? resumoCampos(decisao.campos, suppliers) : null;
  // "N da cliente" fura a cascata: resposta esperando conferência é o que
  // a cerimonialista mais precisa ver na lista (091).
  const daCliente = decisao.aguardamConferencia;
  const meta = na
    ? "não se aplica"
    : daCliente > 0
      ? `${daCliente} ${daCliente === 1 ? "resposta da cliente" : "respostas da cliente"}`
      : resumo ??
        (decisao.campos.length > 0
          ? vazios > 0
            ? `${vazios} de ${decisao.campos.length} campos vazios`
            : `${decisao.campos.length} campos preenchidos`
          : respLabel(decisao.responsavel, tipoEvento));
  const prazo = na || ev === "decidida" ? null : prazoRelativo(decisao.prazoPrevisto);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 0",
        paddingLeft: na ? 14 : 0,
        borderBottom: `1px solid ${C.divisoria2}`,
        opacity: na ? 0.55 : 1,
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
      <button
        type="button"
        onClick={na ? onReativar : onAbrir}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          border: "none",
          background: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <span
          style={{
            display: "block",
            fontFamily: F_UI,
            fontSize: 14,
            lineHeight: "18px",
            color: C.tinta,
            textDecoration: na ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {decisao.titulo}
        </span>
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontFamily: F_MONO,
            fontSize: 10,
            lineHeight: "14px",
            // resposta da cliente fura a cascata também na COR: na lista,
            // o olho acha o tom pendente sem ler linha a linha
            color: !na && daCliente > 0 ? C.pendenteFg : C.meta,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {meta}
          {na && (
            <span style={{ textDecoration: "underline", marginLeft: 6 }}>
              reativar
            </span>
          )}
        </span>
      </button>
      {prazo && (
        <span
          style={{
            fontFamily: F_MONO,
            fontSize: 11,
            color: ev === "atrasada" ? C.atrasadaFg : C.secundario,
            flexShrink: 0,
          }}
        >
          {prazo}
        </span>
      )}
      {!na && (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 20,
            fontFamily: F_UI,
            fontSize: 11,
            background: PILULA[ev].bg,
            color: PILULA[ev].fg,
            flexShrink: 0,
          }}
        >
          {PILULA[ev].rotulo}
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Linha de objetivo (expansível)
// ------------------------------------------------------------------

function LinhaObjetivo({
  tipoEvento,
  objetivo,
  expandido,
  suppliers,
  onToggle,
  onAbrirDecisao,
  onReativarDecisao,
  onCriarDecisao,
  onDesligar,
  compactar,
}: {
  tipoEvento: string;
  objetivo: Objetivo;
  expandido: boolean;
  suppliers: SupplierRef[];
  onToggle: () => void;
  onAbrirDecisao: (d: Decisao) => void;
  onReativarDecisao: (d: Decisao) => void;
  onCriarDecisao: (titulo: string) => Promise<void>;
  onDesligar: () => void;
  compactar?: "proximas" | "depois";
}) {
  const [novo, setNovo] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [criando, setCriando] = useState(false);
  const pct =
    objetivo.aplicaveis > 0
      ? (objetivo.decididas / objetivo.aplicaveis) * 100
      : 0;
  const pad = compactar === "depois" ? 10 : compactar === "proximas" ? 11 : 12;

  return (
    <div id={`objetivo-${objetivo.id}`}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: `${pad}px 16px`,
          borderBottom: `1px solid ${C.bordaSutil}`,
          background: expandido ? C.tint : "transparent",
          // "depois" é esmaecido porque ainda não é a vez dele; resolvido
          // não — está pronto, e ler o que já se conquistou vale
          opacity:
            compactar === "depois" && objetivo.bucket !== "concluido" ? 0.62 : 1,
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <span
          style={{
            fontFamily: F_MONO,
            fontSize: 11,
            color: expandido ? C.ameixa : C.meta,
            width: 12,
            flexShrink: 0,
          }}
        >
          {expandido ? "▾" : "›"}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontFamily: F_TITLE,
              fontWeight: 600,
              fontSize: 15,
              lineHeight: "20px",
              letterSpacing: "-0.02em",
              color: C.tinta,
            }}
          >
            {objetivo.nome}
          </span>
          <span
            style={{
              display: "block",
              marginTop: 2,
              fontFamily: F_MONO,
              fontSize: 10,
              lineHeight: "14px",
              color: C.meta,
            }}
          >
            objetivo + categoria de verba ·{" "}
            {respLabel(objetivo.responsavelDominante, tipoEvento)} · previsto{" "}
            {brl(objetivo.valorPrevisto)}
          </span>
        </div>
        {/* Categoria resolvida diz que ACABOU, não uma fração que a
            pessoa precisa comparar de cabeça para descobrir o mesmo. */}
        {objetivo.bucket === "concluido" ? (
          <span
            style={{
              fontFamily: F_MONO,
              fontSize: 11,
              color: "var(--state-ok)",
              background: "var(--state-ok-bg)",
              padding: "3px 9px",
              borderRadius: 999,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            tudo decidido · {objetivo.aplicaveis}
          </span>
        ) : (
          <span
            style={{
              fontFamily: F_MONO,
              fontSize: 11,
              color: C.secundario,
              flexShrink: 0,
            }}
          >
            decisões {objetivo.decididas}/{objetivo.aplicaveis}
          </span>
        )}
        {compactar !== "proximas" && compactar !== "depois" && (
          <div
            style={{
              width: 64,
              height: 5,
              background: C.zona,
              borderRadius: 3,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: C.ameixa,
              }}
            />
          </div>
        )}
      </div>

      {expandido && (
        <div
          style={{
            padding: "4px 16px 12px 40px",
            borderBottom: `1px solid ${C.bordaSutil}`,
          }}
        >
          {objetivo.decisoes.map((d) => (
            <LinhaDecisao
              tipoEvento={tipoEvento}
              key={d.id}
              decisao={d}
              suppliers={suppliers}
              onAbrir={() => onAbrirDecisao(d)}
              onReativar={() => onReativarDecisao(d)}
            />
          ))}

          {/* fantasma: + adicionar decisão (liberdade) */}
          {novo ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: "9px 0",
              }}
            >
              <input
                autoFocus
                type="text"
                value={titulo}
                placeholder="título da decisão"
                onChange={(e) => setTitulo(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && titulo.trim() && !criando) {
                    setCriando(true);
                    await onCriarDecisao(titulo);
                    setCriando(false);
                    setTitulo("");
                    setNovo(false);
                  }
                  if (e.key === "Escape") setNovo(false);
                }}
                style={{
                  flex: 1,
                  height: 34,
                  border: `1px solid ${C.bordaMedia}`,
                  borderRadius: 8,
                  padding: "0 10px",
                  fontFamily: F_UI,
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <button
                type="button"
                disabled={criando || !titulo.trim()}
                onClick={async () => {
                  setCriando(true);
                  await onCriarDecisao(titulo);
                  setCriando(false);
                  setTitulo("");
                  setNovo(false);
                }}
                style={{
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "none",
                  background: C.ameixa,
                  color: "#fff",
                  fontFamily: F_TITLE,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  opacity: criando || !titulo.trim() ? 0.5 : 1,
                }}
              >
                {criando ? "…" : "Criar"}
              </button>
              <button
                type="button"
                onClick={() => setNovo(false)}
                style={{
                  border: "none",
                  background: "none",
                  fontFamily: F_UI,
                  fontSize: 12,
                  color: C.meta,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "9px 0 0",
              }}
            >
              <button
                type="button"
                onClick={() => setNovo(true)}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontFamily: F_TITLE,
                  fontWeight: 500,
                  fontSize: 13,
                  color: C.fantasma,
                  cursor: "pointer",
                }}
              >
                + adicionar decisão
              </button>
              <button
                type="button"
                onClick={onDesligar}
                title="Este assunto não existe neste casamento"
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontFamily: F_UI,
                  fontSize: 11,
                  color: C.fantasma,
                  cursor: "pointer",
                }}
              >
                Não se aplica a este casamento
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Modo Foco
// ------------------------------------------------------------------

export function ModoFoco({
  tipoEvento,
  criticas,
  objetivos,
  mesAtualRotulo,
  suppliers,
  objetivosExpandidos,
  onToggleObjetivo,
  onAbrirDecisao,
  onNaoSeAplicaDecisao,
  onReativarDecisao,
  onCriarDecisao,
  onCriarObjetivo,
  onAlternarObjetivo,
}: {
  tipoEvento: string;
  criticas: DecisaoCritica[];
  objetivos: Objetivo[];
  mesAtualRotulo: string;
  suppliers: SupplierRef[];
  objetivosExpandidos: Set<string>;
  onToggleObjetivo: (id: string) => void;
  onAbrirDecisao: (d: Decisao) => void;
  onNaoSeAplicaDecisao: (d: Decisao) => void;
  onReativarDecisao: (d: Decisao) => void;
  onCriarDecisao: (objetivoId: string, titulo: string) => Promise<void>;
  onCriarObjetivo: (nome: string) => Promise<void>;
  onAlternarObjetivo: (objetivoId: string, ativo: boolean) => void;
}) {
  const [novoObj, setNovoObj] = useState(false);
  const [nomeObj, setNomeObj] = useState("");
  const [criandoObj, setCriandoObj] = useState(false);

  const ativos = objetivos.filter((o) => o.ativo);
  const desligados = objetivos.filter((o) => !o.ativo);
  const grupos: {
    chave: string;
    rotulo: string;
    extra?: string;
    lista: Objetivo[];
    compactar?: "proximas" | "depois";
  }[] = [
    {
      chave: "agora",
      rotulo: "agora",
      extra: "vence nesta janela",
      lista: ativos.filter((o) => o.bucket === "agora"),
    },
    {
      chave: "proximas",
      rotulo: "próximas",
      lista: ativos.filter((o) => o.bucket === "proximas"),
      compactar: "proximas",
    },
    {
      chave: "depois",
      rotulo: "depois",
      lista: ativos.filter((o) => o.bucket === "depois"),
      compactar: "depois",
    },
    // No fim, e só quando existe: o que já foi resolvido não disputa
    // atenção com o que falta, mas também não pode ficar escondido no
    // meio do que "ainda vem".
    {
      chave: "concluido",
      rotulo: "resolvidas",
      extra: "nada mais a decidir aqui",
      lista: ativos.filter((o) => o.bucket === "concluido"),
      compactar: "depois",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Decidir agora */}
      {criticas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={tituloStyle(16, 22)}>Decidir agora</span>
            <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.meta }}>
              {criticas.length}{" "}
              {criticas.length === 1
                ? "decisão no topo da fila"
                : "decisões no topo da fila"}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(3, criticas.length)}, 1fr)`,
              gap: 14,
            }}
          >
            {criticas.map((d, i) => (
              <CardCritica
                key={d.id}
                decisao={d}
                primeira={i === 0}
                onAbrir={() => onAbrirDecisao(d)}
                onNaoSeAplica={() => onNaoSeAplicaDecisao(d)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Jornada — nunca some */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <span style={tituloStyle(16, 22)}>Jornada</span>
          <span style={{ fontFamily: F_MONO, fontSize: 11, color: C.meta }}>
            {mesAtualRotulo}
          </span>
        </div>

        <div
          style={{
            border: `1px solid ${C.bordaForte}`,
            borderRadius: 10,
            background: "#fff",
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(0,0,0,.04)",
          }}
        >
          {grupos.map(
            (g) =>
              g.lista.length > 0 && (
                <div key={g.chave}>
                  <div
                    style={{
                      padding: "8px 16px",
                      background: C.zona,
                      borderBottom: `1px solid ${C.bordaSutil}`,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={monoLabel}>{g.rotulo}</span>
                    {g.extra && (
                      <span style={{ ...monoLabel, color: C.meta }}>
                        {g.extra}
                      </span>
                    )}
                  </div>
                  {g.lista.map((o) => (
                    <LinhaObjetivo
                      tipoEvento={tipoEvento}
                      key={o.id}
                      objetivo={o}
                      expandido={objetivosExpandidos.has(o.id)}
                      suppliers={suppliers}
                      onToggle={() => onToggleObjetivo(o.id)}
                      onAbrirDecisao={onAbrirDecisao}
                      onReativarDecisao={onReativarDecisao}
                      onCriarDecisao={(t) => onCriarDecisao(o.id, t)}
                      onDesligar={() => onAlternarObjetivo(o.id, false)}
                      compactar={g.compactar}
                    />
                  ))}
                </div>
              )
          )}

          {/* NÃO SE APLICA — objetivos desligados, reativáveis */}
          {desligados.length > 0 && (
            <div>
              <div
                style={{
                  padding: "8px 16px",
                  background: C.zona,
                  borderBottom: `1px solid ${C.bordaSutil}`,
                }}
              >
                <span style={monoLabel}>não se aplica</span>
              </div>
              {desligados.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px 10px 30px",
                    borderBottom: `1px solid ${C.bordaSutil}`,
                    opacity: 0.55,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontFamily: F_TITLE,
                      fontWeight: 600,
                      fontSize: 14,
                      letterSpacing: "-0.02em",
                      color: C.tinta,
                      textDecoration: "line-through",
                    }}
                  >
                    {o.nome}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAlternarObjetivo(o.id, true)}
                    style={{
                      border: "none",
                      background: "none",
                      fontFamily: F_MONO,
                      fontSize: 11,
                      color: C.secundario,
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    reativar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* fantasma: + adicionar objetivo */}
          <div style={{ padding: "10px 16px" }}>
            {novoObj ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  autoFocus
                  type="text"
                  value={nomeObj}
                  placeholder="nome do objetivo"
                  onChange={(e) => setNomeObj(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && nomeObj.trim() && !criandoObj) {
                      setCriandoObj(true);
                      await onCriarObjetivo(nomeObj);
                      setCriandoObj(false);
                      setNomeObj("");
                      setNovoObj(false);
                    }
                    if (e.key === "Escape") setNovoObj(false);
                  }}
                  style={{
                    flex: 1,
                    height: 34,
                    border: `1px solid ${C.bordaMedia}`,
                    borderRadius: 8,
                    padding: "0 10px",
                    fontFamily: F_UI,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  disabled={criandoObj || !nomeObj.trim()}
                  onClick={async () => {
                    setCriandoObj(true);
                    await onCriarObjetivo(nomeObj);
                    setCriandoObj(false);
                    setNomeObj("");
                    setNovoObj(false);
                  }}
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "none",
                    background: C.ameixa,
                    color: "#fff",
                    fontFamily: F_TITLE,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    opacity: criandoObj || !nomeObj.trim() ? 0.5 : 1,
                  }}
                >
                  {criandoObj ? "…" : "Criar"}
                </button>
                <button
                  type="button"
                  onClick={() => setNovoObj(false)}
                  style={{
                    border: "none",
                    background: "none",
                    fontFamily: F_UI,
                    fontSize: 12,
                    color: C.meta,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNovoObj(true)}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontFamily: F_TITLE,
                  fontWeight: 500,
                  fontSize: 13,
                  color: C.fantasma,
                  cursor: "pointer",
                }}
              >
                + adicionar objetivo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
