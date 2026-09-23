"use client";

// Caderno do evento (172): o planejamento como ela o teria no papel. Uma
// página por mês até a data; em cada uma, as decisões do mês (a decidida
// riscada), as reuniões e as anotações DELA — que não viram tarefa.
//
// Os meses são os mesmos do Amplo (montarMeses): o Caderno não inventa um
// segundo cálculo de prazo, só acrescenta o que ela escreve.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Decisao, Objetivo } from "@/lib/supabase/planejamento";
import {
  anotarNoCaderno,
  apagarNotaDoCaderno,
  editarNotaDoCaderno,
  marcarReuniao,
  type NotaDoCaderno,
  type ReuniaoDoCaderno,
} from "@/app/(app)/eventos/[id]/planejamento/caderno-actions";
import { montarMeses } from "./ModoAmplo";
import { C, F_MONO, F_TITLE, F_UI, estadoVisual, prazoRelativo } from "./celebra";
import { inicioDoDiaBR } from "@/lib/tempo";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function chaveDaNota(n: NotaDoCaderno) {
  return (n.mes ?? n.criadaEm).slice(0, 7);
}
function diaMes(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MESES[m - 1]}`;
}
function faltam(n: number | null) {
  if (n === null) return "";
  if (n <= 0) return "mês do evento";
  return n === 1 ? "falta 1 mês" : `faltam ${n} meses`;
}

type Pagina = {
  chave: string;
  rotulo: string;
  mesesAteEvento: number | null;
  passado: boolean;
  atual: boolean;
  diaD: boolean;
  decisoes: Decisao[];
};

const linha: React.CSSProperties = {
  borderBottom: `1px dashed ${C.bordaSutil}`,
  padding: "9px 2px",
  fontFamily: F_UI,
  fontSize: 14,
  lineHeight: "20px",
  color: C.tinta,
};
const nota: React.CSSProperties = {
  fontFamily: F_UI,
  fontStyle: "italic",
  fontSize: 13.5,
  lineHeight: "19px",
  color: C.corpo,
};
const entrada: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderBottom: `1px solid ${C.bordaMedia}`,
  background: "transparent",
  padding: "6px 2px",
  fontFamily: F_UI,
  fontSize: 13.5,
  color: C.tinta,
  outline: "none",
};

export function ModoCaderno({
  eventId,
  objetivos,
  dataEvento,
  notas,
  reunioes,
  onAbrirDecisao,
}: {
  eventId: string;
  objetivos: Objetivo[];
  dataEvento: string | null;
  notas: NotaDoCaderno[];
  reunioes: ReuniaoDoCaderno[];
  onAbrirDecisao: (d: Decisao) => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [verPassado, setVerPassado] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [reuniaoEm, setReuniaoEm] = useState<string | null>(null);
  const [novaReuniao, setNovaReuniao] = useState({ titulo: "", data: "", hora: "" });
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  // páginas em que ela abriu as decididas
  const [verDecididas, setVerDecididas] = useState<Set<string>>(new Set());

  function rodar(f: () => Promise<{ error: string } | { success: true }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await f();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      depois?.();
      router.refresh();
    });
  }

  const { meses, diaD } = montarMeses(objetivos, dataEvento);
  const paginas: Pagina[] = [
    ...meses.map((m) => ({ ...m, diaD: false })),
    ...(diaD ? [{ ...diaD, diaD: true }] : []),
  ];
  // sem data do evento, o caderno ainda existe: uma página só
  if (paginas.length === 0) {
    const d = inicioDoDiaBR();
    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    paginas.push({
      chave: hoje,
      rotulo: "Sem data do evento",
      mesesAteEvento: null,
      passado: false,
      atual: true,
      diaD: false,
      decisoes: [],
    });
  }
  const primeira = paginas[0].chave;
  const ultima = paginas[paginas.length - 1].chave;
  // o que cai fora do intervalo vai para a página da ponta mais próxima
  const naPagina = (chave: string) => (chave < primeira ? primeira : chave > ultima ? ultima : chave);

  const soltas = notas.filter((n) => !n.decisaoId && !n.reuniaoId);
  const daDecisao = (id: string) => notas.filter((n) => n.decisaoId === id);
  const daReuniao = (id: string) => notas.filter((n) => n.reuniaoId === id);

  const passadas = paginas.filter((p) => p.passado);
  const visiveis = verPassado ? paginas : paginas.filter((p) => !p.passado);

  const nota_ = (n: NotaDoCaderno) =>
    editando?.id === n.id ? (
      <input
        key={n.id}
        autoFocus
        style={entrada}
        value={editando.texto}
        onChange={(e) => setEditando({ id: n.id, texto: e.target.value })}
        onBlur={() => setEditando(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter") rodar(() => editarNotaDoCaderno(eventId, n.id, editando.texto), () => setEditando(null));
          if (e.key === "Escape") setEditando(null);
        }}
      />
    ) : (
      <div key={n.id} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <span style={{ ...nota, flex: 1, cursor: "text" }} onClick={() => setEditando({ id: n.id, texto: n.texto })}>
          {n.texto}
        </span>
        <button
          type="button"
          aria-label="Apagar anotação"
          onClick={() => {
            if (window.confirm("Apagar esta anotação?")) rodar(() => apagarNotaDoCaderno(eventId, n.id));
          }}
          style={{ border: "none", background: "none", color: C.fantasma, cursor: "pointer", fontSize: 13 }}
        >
          ×
        </button>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {passadas.length > 0 && (
        <button
          type="button"
          onClick={() => setVerPassado((v) => !v)}
          style={{
            alignSelf: "flex-start",
            border: "none",
            background: "none",
            padding: 0,
            fontFamily: F_UI,
            fontSize: 13,
            color: C.secundario,
            textDecoration: "underline",
            textUnderlineOffset: 3,
            cursor: "pointer",
          }}
        >
          {verPassado ? "esconder o que já passou" : `já passou · ${passadas.length === 1 ? "1 mês" : `${passadas.length} meses`}`}
        </button>
      )}

      {visiveis.map((p) => {
        const reunioesDaPagina = reunioes.filter((r) => naPagina(r.data.slice(0, 7)) === p.chave);
        const soltasDaPagina = soltas.filter((n) => naPagina(chaveDaNota(n)) === p.chave);
        return (
          <section
            key={p.chave}
            style={{
              background: "#fff",
              border: `1px solid ${p.atual ? C.ameixaClara : C.bordaMedia}`,
              borderRadius: 10,
              padding: "18px 22px 16px",
            }}
          >
            <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <h3 style={{ fontFamily: F_TITLE, fontWeight: 600, fontSize: 17, color: C.tinta, margin: 0 }}>
                {p.diaD ? `${p.rotulo} · o evento` : p.rotulo}
              </h3>
              <span style={{ fontFamily: F_MONO, fontSize: 11, color: p.atual ? C.ameixa : C.meta }}>
                {p.atual ? "este mês" : faltam(p.mesesAteEvento)}
              </span>
            </header>

            {(() => {
              // o que falta vem em cima; as decididas recolhem numa linha
              // (a que tem anotação continua à vista)
              const abertas = verDecididas.has(p.chave);
              const pendentes = p.decisoes.filter((d) => estadoVisual(d) !== "decidida");
              const decididas = p.decisoes.filter((d) => estadoVisual(d) === "decidida");
              const comNota = decididas.filter((d) => daDecisao(d.id).length > 0);
              const mostrar = abertas ? [...pendentes, ...decididas] : [...pendentes, ...comNota];
              const escondidas = decididas.length - (abertas ? decididas.length : comNota.length);
              return (
                <>
            {mostrar.map((d) => {
              const ev = estadoVisual(d);
              const feita = ev === "decidida";
              const notasDela = daDecisao(d.id);
              return (
                <div key={d.id} style={linha}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <span aria-hidden style={{ fontFamily: F_MONO, fontSize: 13, color: feita ? C.ameixa : C.fantasma, width: 14 }}>
                      {feita ? "✓" : "○"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAbrirDecisao(d)}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        border: "none",
                        background: "none",
                        padding: 0,
                        fontFamily: F_UI,
                        fontSize: 14,
                        color: feita ? C.meta : C.tinta,
                        textDecoration: feita ? "line-through" : "none",
                        cursor: "pointer",
                      }}
                    >
                      {d.titulo}
                    </button>
                    {!feita && (
                      <span style={{ fontFamily: F_MONO, fontSize: 11, color: ev === "atrasada" ? C.atrasadaFg : C.meta, whiteSpace: "nowrap" }}>
                        {prazoRelativo(d.prazoPrevisto)}
                      </span>
                    )}
                  </div>
                  {notasDela.length > 0 && (
                    <div style={{ paddingLeft: 24, marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                      {notasDela.map((n) => nota_(n))}
                    </div>
                  )}
                </div>
              );
            })}

            {(escondidas > 0 || (abertas && decididas.length > 0)) && (
              <button
                type="button"
                onClick={() =>
                  setVerDecididas((v) => {
                    const n = new Set(v);
                    if (n.has(p.chave)) n.delete(p.chave);
                    else n.add(p.chave);
                    return n;
                  })
                }
                style={{
                  ...linha,
                  width: "100%",
                  textAlign: "left",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  background: "none",
                  color: C.meta,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontFamily: F_MONO, color: C.ameixa, marginRight: 10 }}>✓</span>
                {abertas
                  ? "recolher as decididas"
                  : `${escondidas} ${escondidas === 1 ? "decidida" : "decididas"} · ver`}
              </button>
            )}
                </>
              );
            })()}

            {reunioesDaPagina.map((r) => {
              const chave = `r:${r.id}`;
              return (
                <div key={r.id} style={linha}>
                  <div style={{ fontFamily: F_UI, fontSize: 14, fontWeight: 600, color: C.tinta }}>
                    Reunião · {diaMes(r.data)}
                    {r.hora ? ` · ${r.hora.slice(0, 5)}` : ""} · {r.titulo}
                  </div>
                  <div style={{ paddingLeft: 12, marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                    {daReuniao(r.id).map((n) => nota_(n))}
                    <input
                      style={entrada}
                      placeholder="o que ficou combinado…"
                      value={rascunho[chave] ?? ""}
                      disabled={pendente}
                      onChange={(e) => setRascunho({ ...rascunho, [chave]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (rascunho[chave] ?? "").trim())
                          rodar(() => anotarNoCaderno(eventId, { texto: rascunho[chave], reuniaoId: r.id }), () =>
                            setRascunho({ ...rascunho, [chave]: "" })
                          );
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {soltasDaPagina.length > 0 && (
              <div style={{ ...linha, display: "flex", flexDirection: "column", gap: 4 }}>
                {soltasDaPagina.map((n) => nota_(n))}
              </div>
            )}

            {/* anotar no mês: Enter salva, não vira tarefa */}
            <input
              style={{ ...entrada, marginTop: 8 }}
              placeholder="+ anotar"
              value={rascunho[p.chave] ?? ""}
              disabled={pendente}
              onChange={(e) => setRascunho({ ...rascunho, [p.chave]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (rascunho[p.chave] ?? "").trim())
                  rodar(() => anotarNoCaderno(eventId, { texto: rascunho[p.chave], mes: p.chave }), () =>
                    setRascunho({ ...rascunho, [p.chave]: "" })
                  );
              }}
            />

            {reuniaoEm === p.chave ? (
              <form
                style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  rodar(() => marcarReuniao(eventId, novaReuniao), () => {
                    setReuniaoEm(null);
                    setNovaReuniao({ titulo: "", data: "", hora: "" });
                  });
                }}
              >
                <input
                  autoFocus
                  placeholder="Reunião (ex.: Degustação)"
                  value={novaReuniao.titulo}
                  onChange={(e) => setNovaReuniao({ ...novaReuniao, titulo: e.target.value })}
                  style={{ ...entrada, width: 220 }}
                />
                <input
                  type="date"
                  value={novaReuniao.data}
                  onChange={(e) => setNovaReuniao({ ...novaReuniao, data: e.target.value })}
                  style={{ ...entrada, width: 150 }}
                  aria-label="Data"
                />
                <input
                  type="time"
                  value={novaReuniao.hora}
                  onChange={(e) => setNovaReuniao({ ...novaReuniao, hora: e.target.value })}
                  style={{ ...entrada, width: 100 }}
                  aria-label="Hora"
                />
                <button
                  type="submit"
                  disabled={pendente || !novaReuniao.titulo.trim() || !novaReuniao.data}
                  style={{
                    height: 32,
                    padding: "0 12px",
                    border: "none",
                    borderRadius: 7,
                    background: C.tinta,
                    color: "#fff",
                    fontFamily: F_TITLE,
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: "pointer",
                    opacity: pendente || !novaReuniao.titulo.trim() || !novaReuniao.data ? 0.4 : 1,
                  }}
                >
                  Marcar
                </button>
                <button
                  type="button"
                  onClick={() => setReuniaoEm(null)}
                  style={{ border: "none", background: "none", fontFamily: F_UI, fontSize: 12.5, color: C.secundario, cursor: "pointer" }}
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setReuniaoEm(p.chave);
                  setNovaReuniao({ titulo: "", data: p.atual || p.chave < new Date().toISOString().slice(0, 7) ? "" : `${p.chave}-01`, hora: "" });
                }}
                style={{
                  marginTop: 8,
                  border: "none",
                  background: "none",
                  padding: 0,
                  fontFamily: F_UI,
                  fontSize: 12.5,
                  color: C.secundario,
                  cursor: "pointer",
                }}
              >
                + reunião
              </button>
            )}
          </section>
        );
      })}

      {erro && <p style={{ fontFamily: F_UI, fontSize: 13, color: C.atrasadaFg }}>{erro}</p>}
    </div>
  );
}

/** As anotações presas a uma decisão, dentro do drawer dela. */
export function AnotacoesDaDecisao({
  eventId,
  decisaoId,
  notas,
}: {
  eventId: string;
  decisaoId: string;
  notas: NotaDoCaderno[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const minhas = notas.filter((n) => n.decisaoId === decisaoId);

  return (
    <div style={{ borderTop: `1px solid ${C.bordaSutil}`, paddingTop: 12 }}>
      <p style={{ fontFamily: F_MONO, fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: C.secundario, margin: 0 }}>
        anotações
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
        {minhas.map((n) => (
          <div key={n.id} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ ...nota, flex: 1 }}>{n.texto}</span>
            <button
              type="button"
              aria-label="Apagar anotação"
              onClick={() =>
                iniciar(async () => {
                  const r = await apagarNotaDoCaderno(eventId, n.id);
                  if ("error" in r) setErro(r.error);
                  else router.refresh();
                })
              }
              style={{ border: "none", background: "none", color: C.fantasma, cursor: "pointer", fontSize: 13 }}
            >
              ×
            </button>
          </div>
        ))}
        <input
          style={entrada}
          placeholder="+ anotar"
          value={texto}
          disabled={pendente}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && texto.trim()) {
              setErro(null);
              iniciar(async () => {
                const r = await anotarNoCaderno(eventId, { texto, decisaoId });
                if ("error" in r) setErro(r.error);
                else {
                  setTexto("");
                  router.refresh();
                }
              });
            }
          }}
        />
        {erro && <span style={{ fontFamily: F_UI, fontSize: 12, color: C.atrasadaFg }}>{erro}</span>}
      </div>
    </div>
  );
}
