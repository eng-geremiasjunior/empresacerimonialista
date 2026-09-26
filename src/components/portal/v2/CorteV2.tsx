"use client";

// A corte e as 15 velas (portal v2). O palco escuro com as 15 velas em
// arco: cada pessoa acende uma, o brilho cresce com o total. A ordem de
// chamada muda arrastando (computador) ou com as setas; "Ensaiar as
// velas" chama uma por uma em tela cheia. Embaixo, os grupos da corte.
//
// Tudo grava no cortejo de sempre (evento_cortejo_pessoa): a vela é o
// papel 'vela' e "quem é para ela" mora em o_que_leva.

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { PessoaCortejo } from "@/lib/portal-pessoas-shared";
import {
  adicionarPessoaCortejo,
  removerPessoaCortejo,
  reordenarCortejo,
} from "@/app/(portal)/portal/[eventoId]/cortejo/actions";
import { NoTopo } from "./NoTopo";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";
const TOTAL = 15;
const PAPEIS_DA_VELA = ["avó", "avô", "madrinha", "padrinho", "melhor amiga", "prima", "tia", "tio", "irmão", "amiga da escola"];
const GRUPOS: { papel: string; nome: string; ph: string }[] = [
  { papel: "entrada", nome: "Acompanham a entrada", ph: "Nome" },
  { papel: "principe", nome: "Príncipe", ph: "Nome do príncipe" },
  { papel: "par_valsa", nome: "Pares da valsa", ph: "Ex.: Bia e Theo" },
  { papel: "dama", nome: "Damas", ph: "Nome" },
];

type Vela = { id: string; nome: string; papel: string };

export function CorteV2({
  eventoId,
  pessoas,
  debutante,
  horaDasVelas,
}: {
  eventoId: string;
  pessoas: PessoaCortejo[];
  debutante: string | null;
  horaDasVelas: string | null;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const doServidor = (): Vela[] =>
    pessoas
      .filter((p) => p.papel === "vela")
      .sort((a, b) => a.ordem - b.ordem)
      .map((p) => ({ id: p.id, nome: p.nome, papel: p.oQueLeva ?? "" }));
  const [velas, setVelas] = useState<Vela[]>(doServidor);
  const [sel, setSel] = useState<number | null>(null);
  const [nova, setNova] = useState<number>(-1);
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState<string>("");
  const [ensaio, setEnsaio] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const arrastando = useRef<number | null>(null);
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);

  // o servidor manda a lista de novo depois de cada gravação
  useEffect(() => {
    setVelas(doServidor());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoas]);

  useEffect(() => () => {
    if (intervalo.current) clearInterval(intervalo.current);
  }, []);

  const escolhida = sel !== null && sel < velas.length ? sel : velas.length - 1;
  const ela = debutante ?? "a debutante";

  function gravar(acao: () => Promise<{ ok?: true; error?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (r.error) setErro(r.error);
      router.refresh();
    });
  }

  function acender() {
    const n = nome.trim();
    if (!n || velas.length >= TOTAL) return;
    const lista = [...velas, { id: `novo-${Date.now()}`, nome: n, papel }];
    setVelas(lista);
    setSel(lista.length - 1);
    setNova(lista.length - 1);
    setNome("");
    setPapel("");
    gravar(() => adicionarPessoaCortejo(eventoId, { papel: "vela", nome: n, oQueLeva: papel || null }));
  }

  function mover(de: number, para: number) {
    if (para < 0 || para >= velas.length || de === para) return;
    const lista = velas.slice();
    const [x] = lista.splice(de, 1);
    lista.splice(para, 0, x);
    setVelas(lista);
    setSel(para);
    setNova(-1);
    const ids = lista.map((v) => v.id);
    if (ids.some((id) => id.startsWith("novo-"))) return; // ainda gravando a nova
    gravar(() => reordenarCortejo(eventoId, "vela", ids));
  }

  function tirar(i: number) {
    const v = velas[i];
    setVelas(velas.filter((_, j) => j !== i));
    setSel(null);
    setNova(-1);
    if (!v.id.startsWith("novo-")) gravar(() => removerPessoaCortejo(eventoId, v.id));
  }

  function ensaiar() {
    if (intervalo.current) clearInterval(intervalo.current);
    setEnsaio(0);
    intervalo.current = setInterval(() => {
      setEnsaio((e) => {
        if (e === null || e >= velas.length - 1) {
          if (intervalo.current) clearInterval(intervalo.current);
          return e;
        }
        return e + 1;
      });
    }, 3400);
  }

  function pararEnsaio(proxima?: number) {
    if (intervalo.current) clearInterval(intervalo.current);
    setEnsaio(proxima === undefined ? null : Math.max(0, Math.min(velas.length - 1, proxima)));
  }

  const resumo =
    velas.length >= TOTAL
      ? "as 15 velas definidas · na ordem em que são chamadas"
      : `${velas.length} de 15 velas · faltam ${TOTAL - velas.length}`;
  const brilho = (0.12 + (velas.length / TOTAL) * 0.5).toFixed(2);
  const atual = velas[escolhida];

  return (
    <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ paddingTop: 8 }}>
        <h1 className="pv2-h1" style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>
          A corte e as 15 velas
        </h1>
        <div style={{ fontSize: 14, color: "#4c443c" }}>{resumo}</div>
      </div>

      {/* o palco */}
      <div
        className="pv2-arco-velas"
        style={{
          position: "relative",
          borderRadius: 30,
          overflow: "hidden",
          background: `radial-gradient(60% 50% at 50% 70%,rgba(255,170,90,${brilho}),transparent 70%),radial-gradient(80% 60% at 50% 0%,color-mix(in oklch,var(--destaque) 35%,transparent),transparent 70%),#140e0c`,
          boxShadow: "0 40px 70px -36px rgba(20,12,10,.8)",
          animation: `pv2-entrar .8s ${ES} backwards`,
          transition: "background 1s",
        }}
      >
        {Array.from({ length: TOTAL }, (_, i) => {
          const acesa = i < velas.length;
          const destaque = acesa && i === escolhida;
          const k = i / (TOTAL - 1);
          return (
            <button
              key={i}
              type="button"
              onClick={() => acesa && (setSel(i), setNova(-1))}
              aria-label={acesa ? `Vela ${i + 1}: ${velas[i].nome}` : `Vela ${i + 1}`}
              style={{ position: "absolute", left: `${7 + k * 86}%`, top: `${34 - Math.sin(Math.PI * k) * 22}%`, width: 28, height: 72, marginLeft: -14, padding: 0, border: 0, background: "none", cursor: acesa ? "pointer" : "default", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}
            >
              {acesa && (
                <>
                  <span className="pv2-mov" style={{ position: "absolute", top: 0, left: "50%", width: 44, height: 44, marginLeft: -22, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,190,110,.55),transparent 70%)", animation: `pv2-brilho 2.4s ease-in-out ${i * 0.17}s infinite` }} />
                  <span
                    className="pv2-mov"
                    style={{
                      position: "relative", width: 11, height: 18, marginBottom: 1,
                      borderRadius: "50% 50% 45% 45%/60% 60% 40% 40%",
                      background: "radial-gradient(circle at 50% 72%,#fff7dc,#ffc25f 55%,#ff8b3d)",
                      boxShadow: "0 0 16px 5px rgba(255,170,80,.5)",
                      transformOrigin: "50% 100%",
                      animation: `${i === nova ? `pv2-acender .9s ${ES},` : ""}pv2-chama ${1.1 + (i % 4) * 0.21}s ease-in-out ${i === nova ? ".9s" : "0s"} infinite`,
                    }}
                  />
                </>
              )}
              <span style={{ width: destaque ? 10 : 8, height: destaque ? 40 : 34, borderRadius: "3px 3px 2px 2px", background: acesa ? "linear-gradient(90deg,#e9dcc6,#fbf4e6 50%,#e2d3ba)" : "rgba(255,255,255,.12)", boxShadow: destaque ? "0 0 0 2px var(--destaque)" : "none", transition: "background .4s" }} />
            </button>
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 22px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, color: "#fdfbf7" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.75 }}>
              {atual ? `Vela ${escolhida + 1}` : "As 15 velas"}
            </div>
            <div style={{ fontFamily: TITULO, fontSize: 28, lineHeight: 1.1 }}>{atual ? atual.nome : "Nenhuma vela acesa ainda"}</div>
            <div style={{ fontFamily: TITULO, fontStyle: "italic", fontSize: 17, opacity: 0.85 }}>
              {atual ? atual.papel : `comece por quem é mais importante para ${debutante ? `a ${debutante}` : "ela"}`}
            </div>
          </div>
          {velas.length > 0 && (
            <button
              type="button"
              onClick={ensaiar}
              style={{ flex: "none", height: 46, padding: "0 16px 0 12px", display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,.35)", borderRadius: 23, background: "rgba(255,255,255,.12)", WebkitBackdropFilter: "blur(10px)", backdropFilter: "blur(10px)", color: "#fdfbf7", fontSize: 14, cursor: "pointer" }}
            >
              <span aria-hidden style={{ width: 0, height: 0, borderLeft: "10px solid currentColor", borderTop: "6px solid transparent", borderBottom: "6px solid transparent" }} />
              Ensaiar as velas
            </button>
          )}
        </div>
      </div>

      {/* acender a próxima */}
      {velas.length < TOTAL && (
        <div className="pv2-vidro" style={{ padding: 18, borderRadius: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontFamily: TITULO, fontSize: 20, color: "#2b241f" }}>Acender a vela {velas.length + 1}</div>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && acender()}
            maxLength={80}
            placeholder="Nome"
            aria-label="Nome de quem acende a vela"
            style={{ ...campo, height: 50, borderRadius: 16 }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="group" aria-label={`Quem é para ${ela}`}>
            {PAPEIS_DA_VELA.map((t) => (
              <button key={t} type="button" aria-pressed={papel === t} onClick={() => setPapel(papel === t ? "" : t)} style={chip(papel === t)}>
                {t}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={acender}
            style={{ minHeight: 50, border: 0, borderRadius: 16, background: nome.trim() ? "var(--destaque-texto)" : "#ede8e2", color: nome.trim() ? "#fff" : "#6b6259", fontSize: 15, fontWeight: 500, cursor: "pointer", transition: "background .3s" }}
          >
            Acender
          </button>
        </div>
      )}

      {/* a ordem de chamada */}
      {velas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, fontSize: 23, color: "#332b24" }}>Ordem de chamada</h2>
            <span style={{ fontSize: 12.5, color: "#776d60" }}>arraste ou use as setas</span>
          </div>
          {velas.map((v, i) => (
            <div
              key={v.id}
              draggable
              onDragStart={(e) => {
                arrastando.current = i;
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (arrastando.current !== null) mover(arrastando.current, i);
                arrastando.current = null;
              }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px 6px 12px", borderRadius: 16, background: i === escolhida ? "#fff" : "rgba(255,255,255,.6)", boxShadow: i === escolhida ? "0 14px 28px -20px rgba(50,35,45,.6)" : "none", cursor: "grab", transition: "background .3s, box-shadow .3s", animation: `pv2-entrar .45s ease ${i * 40}ms backwards` }}
            >
              <span style={{ width: 26, flex: "none", fontWeight: 500, fontSize: 14, color: "var(--destaque-texto)" }}>{i + 1}</span>
              <button type="button" onClick={() => (setSel(i), setNova(-1))} style={{ flex: 1, minWidth: 0, padding: 0, border: 0, background: "none", textAlign: "left", cursor: "pointer" }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#2b241f" }}>{v.nome}</div>
                {v.papel && <div style={{ fontSize: 12.5, color: "#776d60" }}>{v.papel}</div>}
              </button>
              <button type="button" onClick={() => mover(i, i - 1)} aria-label={`Subir ${v.nome}`} style={seta}>↑</button>
              <button type="button" onClick={() => mover(i, i + 1)} aria-label={`Descer ${v.nome}`} style={seta}>↓</button>
              <button type="button" onClick={() => tirar(i)} aria-label={`Tirar ${v.nome}`} style={{ ...seta, fontSize: 18, color: "#928a81" }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* os grupos da corte */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 12 }}>
        {GRUPOS.map((g) => (
          <Grupo key={g.papel} eventoId={eventoId} grupo={g} pessoas={pessoas.filter((p) => p.papel === g.papel)} gravar={gravar} />
        ))}
      </div>
      {erro && <div role="alert" style={{ fontSize: 13, color: "#8a2f2f" }}>{erro}</div>}

      {/* o ensaio, em tela cheia */}
      {ensaio !== null && velas[ensaio] && (
        <NoTopo>
        <div className="pv2-ensaio" role="dialog" aria-modal="true" aria-label="Ensaio das velas">
          <div style={{ marginTop: 70, fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", opacity: 0.75 }}>
            {horaDasVelas ? `${horaDasVelas} · ` : ""}As 15 velas
          </div>
          <div key={ensaio} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 28px", textAlign: "center" }}>
            <div style={{ position: "relative", width: 120, height: 190, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
              <span className="pv2-mov" style={{ position: "absolute", top: -10, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,190,110,.6),transparent 70%)", animation: "pv2-esmaecer 1.2s ease .5s both, pv2-brilho 2.4s ease-in-out 1.7s infinite" }} />
              <span className="pv2-mov" style={{ position: "relative", width: 26, height: 40, marginBottom: 2, borderRadius: "50% 50% 45% 45%/60% 60% 40% 40%", background: "radial-gradient(circle at 50% 72%,#fff7dc,#ffc25f 55%,#ff8b3d)", boxShadow: "0 0 34px 12px rgba(255,170,80,.55)", transformOrigin: "50% 100%", animation: `pv2-acender 1s ${ES} .5s both, pv2-chama 1.3s ease-in-out 1.5s infinite` }} />
              <span style={{ width: 22, height: 110, borderRadius: "5px 5px 3px 3px", background: "linear-gradient(90deg,#e9dcc6,#fbf4e6 50%,#e2d3ba)" }} />
            </div>
            <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", opacity: 0.75, animation: "pv2-entrar .8s ease .2s backwards" }}>
              Vela {ensaio + 1} de {velas.length}
            </div>
            <div style={{ fontFamily: TITULO, fontSize: 44, lineHeight: 1.05, animation: `pv2-entrar 1s ${ES} .9s backwards` }}>{velas[ensaio].nome}</div>
            {velas[ensaio].papel && (
              <div style={{ fontFamily: TITULO, fontStyle: "italic", fontSize: 22, opacity: 0.85, animation: "pv2-entrar 1s ease 1.3s backwards" }}>{velas[ensaio].papel}</div>
            )}
          </div>
          <div aria-hidden style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", padding: "0 24px 18px" }}>
            {velas.map((v, i) => (
              <span key={v.id} style={{ position: "relative", width: 6, height: 22, marginTop: 14, borderRadius: 2, background: i <= ensaio ? "#f4ead8" : "rgba(255,255,255,.18)", transition: "background .5s" }}>
                {i <= ensaio && (
                  <span style={{ position: "absolute", left: "50%", top: -12, width: 8, height: 12, marginLeft: -4, borderRadius: "50% 50% 45% 45%/60% 60% 40% 40%", background: "radial-gradient(circle at 50% 70%,#fff6d8,#ffc15e 55%,#ff8a3d)", boxShadow: "0 0 10px 3px rgba(255,170,80,.5)", animation: `pv2-acender .7s ${ES} both` }} />
                )}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, padding: "0 24px 34px" }}>
            <button type="button" onClick={() => pararEnsaio(ensaio - 1)} style={botaoEnsaio}>‹ Anterior</button>
            <button type="button" onClick={() => pararEnsaio()} style={{ ...botaoEnsaio, background: "rgba(255,255,255,.1)" }}>Voltar</button>
            <button type="button" onClick={() => pararEnsaio(ensaio + 1)} style={botaoEnsaio}>Próxima ›</button>
          </div>
        </div>
        </NoTopo>
      )}
    </div>
  );
}

function Grupo({
  eventoId,
  grupo,
  pessoas,
  gravar,
}: {
  eventoId: string;
  grupo: { papel: string; nome: string; ph: string };
  pessoas: PessoaCortejo[];
  gravar: (acao: () => Promise<{ ok?: true; error?: string }>) => void;
}) {
  const [texto, setTexto] = useState("");
  const [itens, setItens] = useState(pessoas.map((p) => ({ id: p.id, nome: p.nome })));
  useEffect(() => setItens(pessoas.map((p) => ({ id: p.id, nome: p.nome }))), [pessoas]);

  function incluir() {
    const n = texto.trim();
    if (!n) return;
    setItens([...itens, { id: `novo-${Date.now()}`, nome: n }]);
    setTexto("");
    gravar(() => adicionarPessoaCortejo(eventoId, { papel: grupo.papel, nome: n }));
  }

  return (
    <div style={{ padding: 16, borderRadius: 22, background: "rgba(255,255,255,.75)", border: "1px solid rgba(255,255,255,.9)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontFamily: TITULO, fontSize: 19, color: "#2b241f" }}>{grupo.nome}</div>
        <span style={{ fontSize: 12, color: "#776d60" }}>{itens.length ? itens.length : "ninguém ainda"}</span>
      </div>
      {itens.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {itens.map((p) => (
            <span key={p.id} style={{ height: 34, padding: "0 6px 0 12px", display: "flex", alignItems: "center", gap: 4, borderRadius: 17, background: "var(--destaque-fundo)", color: "var(--destaque-texto)", fontSize: 13, animation: "pv2-entrar .4s ease backwards" }}>
              {p.nome}
              <button
                type="button"
                aria-label={`Tirar ${p.nome}`}
                onClick={() => {
                  setItens(itens.filter((x) => x.id !== p.id));
                  if (!p.id.startsWith("novo-")) gravar(() => removerPessoaCortejo(eventoId, p.id));
                }}
                style={{ width: 26, height: 26, border: 0, borderRadius: "50%", background: "none", color: "inherit", cursor: "pointer" }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && incluir()}
          maxLength={80}
          placeholder={grupo.ph}
          aria-label={`Incluir em ${grupo.nome}`}
          style={{ ...campo, flex: 1, minWidth: 0, height: 44, borderRadius: 14, fontSize: 14 }}
        />
        <button type="button" onClick={incluir} aria-label={`Incluir em ${grupo.nome}`} style={{ height: 44, padding: "0 14px", border: 0, borderRadius: 14, background: "var(--destaque-fundo)", color: "var(--destaque-texto)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          +
        </button>
      </div>
    </div>
  );
}

const campo: CSSProperties = { padding: "0 16px", border: "1px solid #e7dfd2", background: "#fff", fontSize: 15, color: "#332b24" };
const seta: CSSProperties = { width: 40, height: 44, border: 0, borderRadius: 12, background: "none", fontSize: 16, color: "#6b6259", cursor: "pointer", flex: "none" };
const botaoEnsaio: CSSProperties = { minHeight: 48, padding: "0 18px", border: "1px solid rgba(255,255,255,.3)", borderRadius: 24, background: "none", color: "#fdfbf7", fontSize: 14, cursor: "pointer" };
function chip(on: boolean): CSSProperties {
  return { height: 38, padding: "0 14px", border: `1px solid ${on ? "var(--destaque-texto)" : "#e7dfd2"}`, borderRadius: 19, background: on ? "var(--destaque-texto)" : "#fff", color: on ? "#fff" : "#3a312a", fontSize: 13, cursor: "pointer", transition: "background .25s" };
}
