"use client";

// O Início do portal v2 (desenho "Portal da Família v2", 25/09/2026):
// em 5 segundos, quanto falta, o que precisa da família e o que a
// cerimonialista está fazendo. Três blocos que entram em cascata depois
// da abertura.

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useCasca } from "./CascaV2";

export type ItemPrecisa = {
  id: string;
  /** "Pergunta · Festa", "Pagamento" */
  tipo: string;
  titulo: string;
  sub: string | null;
  /** "faltam 4 dias", "vence em 15 dias" */
  tempo: string;
  urgente: boolean;
  href: string;
};

export type ItemCuidando = { t: string; q: string };
export type ItemNovo = { t: string; q: string; href: string | null };

const ES = "cubic-bezier(.2,.8,.2,1)";

export function InicioV2({
  nomeDeQuemAbriu,
  titulo,
  dias,
  hora,
  linhaDoLocal,
  pessoa,
  precisa,
  mostrarPrecisa,
  cerimonialista,
  cuidando,
  novo,
}: {
  nomeDeQuemAbriu: string | null;
  titulo: string;
  dias: number | null;
  /** "20:00" — o relógio conta até ela */
  hora: string | null;
  /** "sábado, 20:00 · Casa Lírio, Itu" */
  linhaDoLocal: string;
  pessoa: string | null;
  precisa: ItemPrecisa[];
  mostrarPrecisa: boolean;
  cerimonialista: string;
  cuidando: ItemCuidando[];
  novo: ItemNovo[];
}) {
  const { estilo, abrirCaraDaFesta, revelado, comAbertura } = useCasca();
  const [saudacao, setSaudacao] = useState<string | null>(null);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    const per = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    setSaudacao(nomeDeQuemAbriu ? `${per}, ${nomeDeQuemAbriu.split(" ")[0]}` : per);
  }, [nomeDeQuemAbriu]);

  const rv = (atraso: number): CSSProperties => ({
    opacity: revelado ? 1 : 0,
    transform: revelado ? "none" : "translateY(26px)",
    transition: `opacity .9s ease ${atraso}s,transform 1s ${ES} ${atraso}s`,
  });
  // a tinta do topo muda com o fundo (portal-v2.css, data-escuro)
  const tinta = "var(--pv2-tinta)";
  const suave = "var(--pv2-tinta-suave)";
  const comRetrato = estilo.topo === "retrato" && !!estilo.retratoUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, paddingBottom: 8 }}>
      {/* o topo: contagem, título e a cor da festa */}
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", ...rv(0.1) }}>
        <div
          className={comRetrato ? "pv2-heroi pv2-heroi-retrato" : "pv2-heroi"}
          style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ fontSize: 14, color: suave, minHeight: 20 }}>{saudacao ?? " "}</div>
          <div className="pv2-titulo-heroi" style={{ fontFamily: "var(--pv2-titulo)", fontStyle: "italic", color: tinta }}>
            {titulo}
          </div>
          {dias !== null && dias >= 0 && (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 4 }}>
                <span
                  className="pv2-contagem"
                  style={{ fontFamily: "var(--pv2-titulo)", lineHeight: 0.82, color: tinta, letterSpacing: "-.02em" }}
                >
                  {dias === 0 ? "Hoje" : <Conta valor={dias} animar={comAbertura} comecar={revelado} />}
                </span>
                {dias > 0 && (
                  <span style={{ fontFamily: "var(--pv2-titulo)", fontSize: 26, lineHeight: 1, color: tinta, paddingBottom: 6 }}>
                    {dias === 1 ? "dia" : "dias"}
                  </span>
                )}
              </div>
              {hora && <Relogio hora={hora} cor={suave} />}
            </>
          )}
          <div style={{ fontSize: 14, lineHeight: 1.5, color: suave }}>{linhaDoLocal}</div>
          <button
            type="button"
            onClick={abrirCaraDaFesta}
            style={{
              alignSelf: "flex-start", marginTop: 8, height: 44, padding: "0 16px 0 8px", display: "flex",
              alignItems: "center", gap: 10, borderRadius: 22, border: "1px solid rgba(255,255,255,.9)",
              background: "rgba(255,255,255,.72)", WebkitBackdropFilter: "blur(14px)", backdropFilter: "blur(14px)",
              fontSize: 14, color: "#332b24", cursor: "pointer",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 28, height: 28, borderRadius: "50%", boxShadow: "0 0 0 1px rgba(0,0,0,.06)",
                background: "conic-gradient(var(--destaque) 0 50%,var(--destaque-linha) 0 75%,#fdfbf7 0)",
              }}
            />
            Cor da festa · {estilo.cor.nome}
            <span style={{ color: "#928a81" }}>›</span>
          </button>
        </div>

        {/* o arco: a foto dela, ou a letra dela na cor da festa */}
        {!comRetrato && (
          <button
            type="button"
            onClick={abrirCaraDaFesta}
            aria-label={pessoa ? `Foto da ${pessoa}` : "Foto"}
            className="pv2-arco"
            style={{
              flex: "none", borderRadius: "999px 999px 26px 26px", padding: 5, border: 0, cursor: "pointer",
              background: "rgba(255,255,255,.55)", boxShadow: "0 30px 60px -30px rgba(50,35,45,.6)",
            }}
          >
            <span
              style={{
                position: "relative", overflow: "hidden", width: "100%", height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center", borderRadius: "999px 999px 22px 22px",
                background: estilo.retratoUrl
                  ? "#221e1b"
                  : "linear-gradient(180deg,color-mix(in oklch,var(--destaque-linha) 70%,#fff),var(--destaque-fundo))",
              }}
            >
              {estilo.retratoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={estilo.retratoUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontFamily: "var(--pv2-titulo)", fontStyle: "italic", fontSize: "3em", color: "var(--destaque-texto)", opacity: 0.7 }}>
                  {(pessoa ?? titulo).charAt(0).toUpperCase()}
                </span>
              )}
              <span
                className="pv2-mov"
                style={{
                  position: "absolute", top: "-10%", bottom: "-10%", left: 0, width: "34%",
                  background: "linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent)",
                  animation: "pv2-varrer 6.5s ease-in-out 2.6s infinite",
                }}
              />
            </span>
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "30px 36px", alignItems: "flex-start" }}>
        {mostrarPrecisa && (
          <div style={{ flex: "1 1 440px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14, ...rv(0.35) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h2 style={{ margin: 0, fontFamily: "var(--pv2-titulo)", fontWeight: 400, fontSize: 27, color: "#332b24" }}>
                Precisa de vocês
              </h2>
              {precisa.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLista((l) => !l)}
                  style={{ minHeight: 44, padding: "0 4px", border: 0, background: "none", fontSize: 13, color: "#6b6259", textDecoration: "underline", cursor: "pointer" }}
                >
                  {lista ? "Ver em cartões" : "Ver tudo em lista"}
                </button>
              )}
            </div>
            {precisa.length === 0 ? (
              <p className="pv2-vidro" style={{ margin: 0, padding: "18px 20px", borderRadius: 22, fontSize: 15, color: "#4c443c" }}>
                Nada esperando por vocês agora.
              </p>
            ) : lista ? (
              <div className="pv2-vidro" style={{ borderRadius: 22, padding: "4px 20px" }}>
                {precisa.map((c) => (
                  <Link
                    key={c.id}
                    href={c.href}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, minHeight: 68, padding: "12px 0",
                      borderBottom: "1px solid #f2ece3", textDecoration: "none",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#776d60" }}>{c.tipo}</div>
                      <div style={{ fontSize: 16, fontWeight: 500, color: "#332b24" }}>{c.titulo}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.urgente ? "var(--destaque-texto)" : "#4c443c", flex: "none" }}>
                      {c.tempo}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Pilha itens={precisa} />
            )}
          </div>
        )}

        <div style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22, ...rv(0.6) }}>
          {cuidando.length > 0 && (
            <div className="pv2-vidro" style={{ padding: 20, borderRadius: 24, display: "flex", flexDirection: "column", gap: 12, background: "rgba(255,255,255,.72)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  aria-hidden
                  style={{
                    width: 44, height: 44, borderRadius: "50%", background: "var(--destaque-fundo)",
                    boxShadow: "0 0 0 2px #fff,0 0 0 3px var(--destaque-linha)", display: "flex",
                    alignItems: "center", justifyContent: "center", fontFamily: "var(--pv2-titulo)", fontSize: 19,
                    color: "var(--destaque-texto)",
                  }}
                >
                  {cerimonialista.charAt(0).toUpperCase()}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 20, color: "#332b24" }}>
                    {cerimonialista} está cuidando
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#4c443c" }}>
                    <span
                      className="pv2-mov"
                      style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--destaque)", animation: "pv2-pulsar 1.8s ease-out infinite" }}
                    />
                    agora
                  </div>
                </div>
              </div>
              <div style={{ minHeight: 54, fontFamily: "var(--pv2-titulo)", fontStyle: "italic", fontSize: 21, lineHeight: 1.3, color: "#2b241f" }}>
                <Datilografa texto={cuidando[0].t} comecar={revelado} />
              </div>
              {cuidando[0].q && <div style={{ fontSize: 13, color: "#776d60", marginTop: -6 }}>{cuidando[0].q}</div>}
              {cuidando.slice(1).map((c, i) => (
                <div
                  key={i}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,.06)", fontSize: 14, color: "#3a312a" }}
                >
                  <span>{c.t}</span>
                  <span style={{ flex: "none", fontSize: 12.5, color: "#776d60" }}>{c.q}</span>
                </div>
              ))}
            </div>
          )}

          {novo.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ margin: 0, fontFamily: "var(--pv2-titulo)", fontWeight: 400, fontSize: 22, color: "#332b24" }}>
                Chegou de novo
              </h2>
              <div
                style={{
                  display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", margin: "0 -20px",
                  padding: "0 20px 8px", scrollbarWidth: "none",
                }}
              >
                {novo.map((c, i) => {
                  // sem foto não há faixa de imagem: um lugar de foto vazio
                  // parece imagem que não carregou
                  const corpo = (
                    <>
                      <div style={{ height: 4, background: "var(--destaque-linha)" }} />
                      <div style={{ padding: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 14, lineHeight: 1.4, color: "#332b24" }}>{c.t}</div>
                        <div style={{ fontSize: 12, color: "#776d60" }}>{c.q}</div>
                      </div>
                    </>
                  );
                  const estiloCartao: CSSProperties = {
                    flex: "none", width: 210, scrollSnapAlign: "start", padding: 0, borderRadius: 20, overflow: "hidden",
                    border: "1px solid rgba(255,255,255,.9)", background: "rgba(255,255,255,.8)", textAlign: "left",
                    textDecoration: "none", boxShadow: "0 18px 36px -28px rgba(50,35,45,.5)",
                    animation: `pv2-entrar .7s ${ES} ${700 + i * 90}ms backwards`,
                  };
                  return c.href ? (
                    <Link key={i} href={c.href} className="pv2-novo" style={estiloCartao}>
                      {corpo}
                    </Link>
                  ) : (
                    <div key={i} style={estiloCartao}>
                      {corpo}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** O número que sobe até o valor (ease-out quart), depois da abertura. */
function Conta({ valor, animar, comecar }: { valor: number; animar: boolean; comecar: boolean }) {
  const [v, setV] = useState(animar ? 0 : valor);
  useEffect(() => {
    if (!animar) {
      setV(valor);
      return;
    }
    if (!comecar) return;
    const t0 = performance.now();
    const D = 2200;
    let id = 0;
    const passo = () => {
      const k = Math.min(1, (performance.now() - t0) / D);
      setV(Math.round(valor * (1 - Math.pow(1 - k, 4))));
      if (k < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [valor, animar, comecar]);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>;
}

/** "e 5h 12min 03s" até a hora da festa, ao vivo. */
function Relogio({ hora, cor }: { hora: string; cor: string }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const i = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (agora === null) return <div style={{ marginTop: 6, minHeight: 18 }} />;
  const [hh, mm] = hora.split(":").map(Number);
  const d = new Date(agora);
  const alvo = new Date(agora);
  alvo.setHours(hh || 0, mm || 0, 0, 0);
  let s = Math.floor((alvo.getTime() - d.getTime()) / 1000);
  if (s < 0) s += 86400;
  const p = (x: number) => String(x).padStart(2, "0");
  return (
    <div style={{ marginTop: 6, fontSize: 13, color: cor, fontVariantNumeric: "tabular-nums" }}>
      e {Math.floor(s / 3600)}h {p(Math.floor((s % 3600) / 60))}min {p(s % 60)}s
    </div>
  );
}

/** O texto aparecendo letra a letra (26 ms), com o cursor na cor da festa. */
function Datilografa({ texto, comecar }: { texto: string; comecar: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!comecar) return;
    setN(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setN(i);
      if (i >= texto.length) clearInterval(t);
    }, 26);
    return () => clearInterval(t);
  }, [texto, comecar]);
  return (
    <span>
      {texto.slice(0, n)}
      <span
        aria-hidden
        style={{
          display: "inline-block", width: 2, height: "1em", marginLeft: 2, verticalAlign: "-2px",
          background: "var(--destaque)", opacity: n >= texto.length ? 0 : 1, transition: "opacity .4s",
        }}
      />
      {/* quem lê a tela ouve o texto inteiro, não letra a letra */}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{texto}</span>
    </span>
  );
}

/** A pilha de cartões: arrastar para o lado manda para o fim. */
function Pilha({ itens }: { itens: ItemPrecisa[] }) {
  const [topo, setTopo] = useState(0);
  const [dx, setDx] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const inicio = useRef<number | null>(null);
  const n = itens.length;
  const idx = topo % n;

  function voar(dir: number) {
    setArrastando(false);
    setDx(dir * 520);
    setTimeout(() => {
      setTopo((t) => t + 1);
      setDx(0);
    }, 260);
  }

  return (
    <>
      <div className="pv2-pilha" style={{ position: "relative" }}>
        {itens.map((c, i) => {
          const k = (i - idx + n) % n;
          const frente = k === 0;
          const tf = frente ? `translateX(${dx}px) rotate(${dx / 22}deg)` : `translateY(${k * 14}px) scale(${1 - k * 0.05})`;
          const op = k > 2 ? 0 : frente ? 1 - Math.min(Math.abs(dx) / 700, 0.6) : 1 - k * 0.2;
          const eventos = frente
            ? {
                onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
                  if ((e.target as HTMLElement).closest("a,button")) return;
                  inicio.current = e.clientX;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setArrastando(true);
                },
                onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
                  if (inicio.current !== null) setDx(e.clientX - inicio.current);
                },
                onPointerUp: () => {
                  if (inicio.current === null) return;
                  inicio.current = null;
                  if (Math.abs(dx) > 90) voar(Math.sign(dx));
                  else {
                    setArrastando(false);
                    setDx(0);
                  }
                },
              }
            : {};
          return (
            <div
              key={c.id}
              {...eventos}
              onPointerCancel={frente ? () => { inicio.current = null; setArrastando(false); setDx(0); } : undefined}
              aria-hidden={!frente}
              className="pv2-cartao-pilha"
              style={{
                position: "absolute", left: 0, right: 0, top: 0, transform: tf, transformOrigin: "50% 100%",
                opacity: op, zIndex: 10 - k, pointerEvents: frente ? "auto" : "none",
                transition: frente && arrastando ? "none" : `transform .55s ${ES},opacity .45s ease`,
                touchAction: "pan-y", cursor: "grab", userSelect: "none", padding: 22, borderRadius: 24,
                background: "rgba(255,255,255,.86)", WebkitBackdropFilter: "blur(18px)", backdropFilter: "blur(18px)",
                border: "1px solid rgba(255,255,255,.9)", boxShadow: "0 28px 50px -30px rgba(50,35,45,.55)",
                display: "flex", flexDirection: "column", gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#776d60" }}>{c.tipo}</span>
                <span
                  style={{
                    height: 28, padding: "0 12px", display: "flex", alignItems: "center", borderRadius: 14,
                    background: c.urgente ? "var(--destaque-texto)" : "var(--destaque-fundo)",
                    color: c.urgente ? "#fff" : "var(--destaque-texto)", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
                  }}
                >
                  {c.tempo}
                </span>
              </div>
              <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 27, lineHeight: 1.15, color: "#2b241f" }}>{c.titulo}</div>
              {c.sub && <div style={{ fontSize: 14, color: "#4c443c" }}>{c.sub}</div>}
              <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
                <Link
                  href={c.href}
                  tabIndex={frente ? 0 : -1}
                  style={{
                    flex: 1, height: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 14,
                    background: "var(--destaque-texto)", color: "#fff", fontSize: 15, fontWeight: 500, textDecoration: "none",
                  }}
                >
                  Resolver agora
                </Link>
                {n > 1 && (
                  <button
                    type="button"
                    tabIndex={frente ? 0 : -1}
                    onClick={() => voar(-1)}
                    style={{ height: 48, padding: "0 18px", border: "1px solid #e7dfd2", borderRadius: 14, background: "#fff", fontSize: 15, color: "#3a312a", cursor: "pointer" }}
                  >
                    Depois
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {itens.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === idx ? 20 : 6, height: 6, borderRadius: 3, transition: "width .4s,background .4s",
                background: i === idx ? "var(--destaque-texto)" : "var(--destaque-linha)",
              }}
            />
          ))}
          <span style={{ marginLeft: 8, fontSize: 12.5, color: "#776d60" }}>
            {idx + 1} de {n}
          </span>
        </div>
      )}
    </>
  );
}
