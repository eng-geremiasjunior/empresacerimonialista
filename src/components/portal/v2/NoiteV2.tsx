"use client";

// A noite (portal v2). Um palco que muda de luz a cada momento do roteiro
// (dia, dourada, foco, valsa, penumbra, velas, jantar, balada, noite),
// a linha do tempo que se arrasta, "Ensaiar a noite" (um momento a cada
// 3,4 s) e, na lista, "Sugerir mudança": o horário que a família prefere
// e o porquê. Quem muda o roteiro é a cerimonialista.
//
// Lê o programa pela janela da 092 (só horário, título e duração) e as
// sugestões de roteiro_sugestao.

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { MomentoDoDia, SugestaoCronograma } from "@/lib/supabase/programa-do-dia";
import { sugerirHorario } from "@/app/(portal)/portal/[eventoId]/cronograma/actions";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";

type Luz = "dia" | "dourada" | "foco" | "valsa" | "penumbra" | "velas" | "jantar" | "balada" | "noite";

const LUZ: Record<Luz, string> = {
  dia: "radial-gradient(40% 50% at 82% 12%,rgba(255,244,214,.95),transparent 70%),linear-gradient(180deg,#efe2cb,#e3cfae 60%,#cdb28a)",
  dourada: "radial-gradient(70% 60% at 72% 18%,rgba(255,206,140,.75),transparent 70%),linear-gradient(180deg,#5a3b28,#2a1b15)",
  foco: "radial-gradient(20% 75% at 50% 25%,rgba(255,248,232,.9),transparent 72%),#0f0c0e",
  valsa: "radial-gradient(34% 40% at 50% 66%,color-mix(in oklch,var(--destaque) 85%,#fff),transparent 72%),radial-gradient(16% 70% at 50% 18%,rgba(255,250,236,.6),transparent),#120e12",
  penumbra: "radial-gradient(55% 45% at 50% 55%,color-mix(in oklch,var(--destaque-profundo) 70%,#555),transparent),#0d0a0c",
  velas: "radial-gradient(55% 32% at 50% 76%,rgba(255,176,96,.6),transparent 72%),#150e0a",
  jantar: "radial-gradient(80% 60% at 50% 38%,rgba(255,216,168,.5),transparent 70%),linear-gradient(180deg,#3d2c23,#1d1511)",
  balada: "radial-gradient(40% 40% at 30% 70%,color-mix(in oklch,var(--destaque) 70%,transparent),transparent 70%),radial-gradient(35% 35% at 75% 60%,rgba(80,190,255,.45),transparent 70%),#0a080c",
  noite: "radial-gradient(60% 40% at 50% 0%,color-mix(in oklch,var(--destaque) 40%,transparent),transparent),#0b0a12",
};

/** A luz do momento pelo que ele é; sem pista, pela hora. */
function luzDe(titulo: string, min: number): Luz {
  const t = titulo.toLowerCase();
  if (/making|prepara|maquiag|cabelo|penteado/.test(t)) return min < 18 * 60 ? "dia" : "penumbra";
  if (/recep|chegada|coquetel|boas[- ]vindas/.test(t)) return "dourada";
  if (/entrada|cortejo/.test(t)) return "foco";
  if (/valsa|dança/.test(t)) return "valsa";
  if (/troca|vestido|camarim/.test(t)) return "penumbra";
  if (/vela|parab[eé]ns|bolo/.test(t)) return "velas";
  if (/jantar|buffet|ceia|almoço/.test(t)) return "jantar";
  if (/balada|pista|dj|show|festa/.test(t)) return "balada";
  if (/encerra|sa[ií]da|despedida|fim/.test(t)) return "noite";
  return min < 17 * 60 ? "dia" : min < 19 * 60 ? "dourada" : "noite";
}

type Momento = MomentoDoDia & { min: number; hhmm: string; luz: Luz };

export function NoiteV2({
  eventoId,
  momentos,
  sugestoes,
  cerimonialista,
  linha,
  musicas = {},
}: {
  eventoId: string;
  momentos: MomentoDoDia[];
  sugestoes: SugestaoCronograma[];
  cerimonialista: string;
  linha: string;
  /** a música da trilha (180) de cada momento do roteiro, pelo id */
  musicas?: Record<string, string>;
}) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();

  // os minutos da noite; o que passa da meia-noite continua contando
  const lista: Momento[] = useMemo(() => {
    // o roteiro chega ordenado pelo relógio ("03:00 Encerramento" antes de
    // "14:00 Montagem"): a madrugada de uma festa que começa de tarde é
    // depois da meia-noite
    const comHora = momentos.filter((m) => m.hora);
    const temTarde = comHora.some((m) => minutos(m.hora!) >= 12 * 60);
    return comHora
      .map((m) => {
        let min = minutos(m.hora!);
        if (temTarde && min < 6 * 60) min += 24 * 60;
        return { ...m, min, hhmm: m.hora!.slice(0, 5), luz: luzDe(m.titulo, min % (24 * 60)) };
      })
      .sort((a, b) => a.min - b.min);
  }, [momentos]);
  const semHora = momentos.filter((m) => !m.hora);

  const inicio = lista.length ? Math.floor(lista[0].min / 60) * 60 : 0;
  const fim = lista.length ? Math.max(inicio + 60, Math.ceil((lista[lista.length - 1].min + 1) / 60) * 60) : 60;
  const total = fim - inicio;

  const [t, setT] = useState(lista.length ? lista[0].min - inicio : 0);
  const [tocando, setTocando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [form, setForm] = useState<{ id: string; de: string; motivo: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);
  const puxando = useRef(false);

  useEffect(() => () => {
    if (intervalo.current) clearInterval(intervalo.current);
  }, []);

  let idx = 0;
  lista.forEach((m, i) => {
    if (t >= m.min - inicio) idx = i;
  });
  const atual = lista[idx];

  // a sugestão mais recente de cada momento
  const sugestaoDo = new Map<string, SugestaoCronograma>();
  for (const s of sugestoes) {
    if (s.tipo === "horario" && s.roteiroItemId && !sugestaoDo.has(s.roteiroItemId)) sugestaoDo.set(s.roteiroItemId, s);
  }

  function ensaiar() {
    if (intervalo.current) clearInterval(intervalo.current);
    if (tocando) return setTocando(false);
    let i = idx >= lista.length - 1 ? 0 : idx + 1;
    setTocando(true);
    setT(lista[i].min - inicio);
    intervalo.current = setInterval(() => {
      i += 1;
      if (i >= lista.length) {
        if (intervalo.current) clearInterval(intervalo.current);
        setTocando(false);
        return;
      }
      setT(lista[i].min - inicio);
    }, 3400);
  }

  function irPara(i: number) {
    if (intervalo.current) clearInterval(intervalo.current);
    setTocando(false);
    setT(lista[i].min - inicio);
  }

  function puxar(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setT(Math.round(k * total));
  }

  function enviar() {
    if (!form) return;
    setErro(null);
    iniciar(async () => {
      const r = await sugerirHorario(eventoId, form.id, form.de, form.motivo.trim());
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setForm(null);
      router.refresh();
    });
  }

  const pct = (v: number) => `${(v / total) * 100}%`;
  const horas = [0, 1, 2, 3].map((q) => {
    const m = inicio + Math.round((total * q) / 3 / 60) * 60;
    return { x: pct(m - inicio), t: `${Math.floor((m / 60) % 24)}h` };
  });

  if (lista.length === 0) {
    return (
      <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 className="pv2-h1" style={{ margin: 0, paddingTop: 8, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>A noite</h1>
        <div style={{ padding: 22, borderRadius: 22, background: "rgba(255,255,255,.7)", fontSize: 15, color: "#4c443c" }}>
          {cerimonialista} ainda está montando o roteiro da noite.
        </div>
      </div>
    );
  }

  const escuro = atual.luz !== "dia";

  return (
    <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ paddingTop: 8 }}>
        <h1 className="pv2-h1" style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>A noite</h1>
        {linha && <div style={{ fontSize: 14, color: "#4c443c" }}>{linha}</div>}
      </div>

      {/* o palco */}
      <div className="pv2-palco" style={{ position: "relative", borderRadius: 30, overflow: "hidden", background: "#0d0a0c", boxShadow: "0 40px 70px -36px rgba(20,12,18,.8)", animation: `pv2-entrar .8s ${ES} backwards` }}>
        {(Object.keys(LUZ) as Luz[]).map((k) => (
          <div key={k} aria-hidden style={{ position: "absolute", inset: 0, background: LUZ[k], opacity: atual.luz === k ? 1 : 0, transition: "opacity 1.4s ease" }} />
        ))}
        {atual.luz === "balada" && (
          <div aria-hidden className="pv2-so-cheio" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <span className="pv2-mov" style={{ position: "absolute", left: "18%", top: "-20%", width: 90, height: "140%", background: "linear-gradient(180deg,color-mix(in oklch,var(--destaque) 60%,transparent),transparent 80%)", transformOrigin: "50% 0", animation: "pv2-feixe 3.2s ease-in-out infinite alternate", filter: "blur(6px)" }} />
            <span className="pv2-mov" style={{ position: "absolute", right: "18%", top: "-20%", width: 90, height: "140%", background: "linear-gradient(180deg,rgba(90,200,255,.45),transparent 80%)", transformOrigin: "50% 0", animation: "pv2-feixe 2.6s ease-in-out -1.3s infinite alternate-reverse", filter: "blur(6px)" }} />
          </div>
        )}
        <div aria-hidden style={{ position: "absolute", left: "8%", right: "8%", bottom: "-18%", height: "46%", borderRadius: "50%", background: "radial-gradient(closest-side,rgba(255,255,255,.14),transparent)" }} />
        {atual.luz === "velas" && (
          <div aria-hidden className="pv2-chamas" style={{ position: "absolute", left: 0, right: 0, top: "40%", display: "flex", justifyContent: "center" }}>
            {Array.from({ length: 15 }, (_, i) => (
              <span key={i} style={{ position: "relative", width: 5, height: 22, borderRadius: 2, background: "#f4ead8" }}>
                <span className="pv2-mov" style={{ position: "absolute", left: "50%", top: -13, width: 9, height: 14, marginLeft: -4.5, borderRadius: "50% 50% 45% 45%/60% 60% 40% 40%", background: "radial-gradient(circle at 50% 70%,#fff6d8,#ffc15e 55%,#ff8a3d)", boxShadow: "0 0 14px 4px rgba(255,170,80,.55)", transformOrigin: "50% 100%", animation: `pv2-chama ${1.1 + (i % 4) * 0.23}s ease-in-out infinite` }} />
              </span>
            ))}
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, padding: "22px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", color: escuro ? "#fdfbf7" : "#2b241f", transition: "color 1s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.85 }}>
              momento {idx + 1} de {lista.length}
            </span>
            <button
              type="button"
              onClick={ensaiar}
              style={{ height: 44, padding: "0 16px 0 12px", display: "flex", alignItems: "center", gap: 10, border: `1px solid ${escuro ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.15)"}`, borderRadius: 22, background: escuro ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.5)", WebkitBackdropFilter: "blur(10px)", backdropFilter: "blur(10px)", color: "inherit", fontSize: 14, cursor: "pointer" }}
            >
              {tocando ? (
                <span aria-hidden style={{ display: "flex", gap: 3 }}>
                  <span style={{ width: 4, height: 14, background: "currentColor", borderRadius: 1 }} />
                  <span style={{ width: 4, height: 14, background: "currentColor", borderRadius: 1 }} />
                </span>
              ) : (
                <span aria-hidden style={{ width: 0, height: 0, borderLeft: "11px solid currentColor", borderTop: "7px solid transparent", borderBottom: "7px solid transparent" }} />
              )}
              {tocando ? "Pausar" : "Ensaiar a noite"}
            </button>
          </div>
          <div key={atual.id} style={{ display: "flex", flexDirection: "column", gap: 4, animation: `pv2-entrar .7s ${ES} backwards` }}>
            <div className="pv2-palco-hora" style={{ fontFamily: TITULO, lineHeight: 0.9, letterSpacing: "-.02em" }}>{atual.hhmm}</div>
            <div style={{ fontFamily: TITULO, fontSize: 30, lineHeight: 1.1 }}>{atual.titulo}</div>
            {atual.duracao ? <div style={{ fontSize: 14, opacity: 0.85 }}>{duracaoEmTexto(atual.duracao)}</div> : null}
            {musicas[atual.id] && (
              <div style={{ marginTop: 6, alignSelf: "flex-start", maxWidth: "100%", height: 32, padding: "0 12px", display: "flex", alignItems: "center", gap: 8, borderRadius: 16, background: "rgba(0,0,0,.28)", WebkitBackdropFilter: "blur(8px)", backdropFilter: "blur(8px)", fontSize: 13, color: "#fdfbf7", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                <span aria-hidden style={{ display: "flex", gap: 2, alignItems: "center", height: 14 }}>
                  {[0, 0.2, 0.4].map((d) => (
                    <span key={d} className="pv2-mov" style={{ width: 2.5, height: 14, background: "var(--destaque)", borderRadius: 1, animation: `pv2-eq .8s ease-in-out ${d}s infinite`, animationPlayState: tocando ? "running" : "paused" }} />
                  ))}
                </span>
                {musicas[atual.id]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* a linha do tempo */}
      <div
        role="slider"
        aria-label="Linha do tempo da noite"
        aria-valuemin={0}
        aria-valuemax={lista.length - 1}
        aria-valuenow={idx}
        aria-valuetext={`${atual.hhmm} ${atual.titulo}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") irPara(Math.min(lista.length - 1, idx + 1));
          if (e.key === "ArrowLeft") irPara(Math.max(0, idx - 1));
        }}
        onPointerDown={(e) => {
          if (intervalo.current) clearInterval(intervalo.current);
          e.currentTarget.setPointerCapture(e.pointerId);
          puxando.current = true;
          setTocando(false);
          setArrastando(true);
          puxar(e);
        }}
        onPointerMove={(e) => puxando.current && puxar(e)}
        onPointerUp={() => {
          puxando.current = false;
          setArrastando(false);
        }}
        onPointerCancel={() => {
          puxando.current = false;
          setArrastando(false);
        }}
        style={{ position: "relative", height: 64, margin: "0 6px", touchAction: "none", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: 26, height: 4, borderRadius: 2, background: "rgba(0,0,0,.08)" }} />
        <div style={{ position: "absolute", left: 0, top: 26, height: 4, borderRadius: 2, width: pct(t), background: "linear-gradient(90deg,var(--destaque-linha),var(--destaque-texto))", transition: arrastando ? "none" : `width .9s ${ES}` }} />
        {lista.map((m, i) => (
          <span key={m.id} style={{ position: "absolute", left: pct(m.min - inicio), top: 22, width: 12, height: 12, marginLeft: -6, borderRadius: "50%", background: i <= idx ? "var(--destaque-texto)" : "#d8cfc2", boxShadow: "0 0 0 2px #f7f3ed", transition: "background .4s" }} />
        ))}
        {horas.map((h) => (
          <span key={h.x} style={{ position: "absolute", left: h.x, top: 44, transform: "translateX(-50%)", fontSize: 11, color: "#776d60" }}>{h.t}</span>
        ))}
        <span style={{ position: "absolute", left: pct(t), top: 12, width: 32, height: 32, marginLeft: -16, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 3px var(--destaque-texto),0 10px 20px -8px var(--destaque-texto)", transition: arrastando ? "none" : `left .9s ${ES}` }} />
      </div>

      {/* a lista, com a sugestão de cada momento */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {[...lista, ...semHora.map((m) => ({ ...m, min: -1, hhmm: "—", luz: "noite" as Luz }))].map((m, i) => {
          const noAr = m.min >= 0 && i === idx;
          const sug = sugestaoDo.get(m.id);
          const aberto = form?.id === m.id;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", margin: "0 -14px", borderRadius: 18, background: noAr ? "rgba(255,255,255,.85)" : "transparent", transition: "background .5s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button type="button" onClick={() => m.min >= 0 && irPara(i)} style={{ width: 58, flex: "none", padding: 0, border: 0, background: "none", textAlign: "left", fontWeight: 500, fontSize: 16, color: noAr ? "var(--destaque-texto)" : "#4c443c", cursor: "pointer" }}>
                  {m.hhmm}
                </button>
                <button type="button" onClick={() => m.min >= 0 && irPara(i)} style={{ flex: 1, minWidth: 0, padding: 0, border: 0, background: "none", textAlign: "left", cursor: "pointer" }}>
                  <div style={{ fontFamily: TITULO, fontSize: 19, lineHeight: 1.2, color: "#2b241f" }}>{m.titulo}</div>
                  {m.duracao || musicas[m.id] ? (
                    <div style={{ fontSize: 12.5, color: "#776d60" }}>{[m.duracao ? duracaoEmTexto(m.duracao) : null, musicas[m.id]].filter(Boolean).join(" · ")}</div>
                  ) : null}
                </button>
                {m.min >= 0 && !aberto && (!sug || sug.estado !== "pendente") && (
                  <button type="button" onClick={() => setForm({ id: m.id, de: m.hhmm, motivo: "" })} style={{ flex: "none", height: 40, padding: "0 12px", border: "1px solid rgba(0,0,0,.08)", borderRadius: 14, background: "rgba(255,255,255,.8)", fontSize: 13, color: "#3a312a", cursor: "pointer" }}>
                    Sugerir mudança
                  </button>
                )}
              </div>
              {aberto && (
                <div className="pv2-sugerir" style={{ display: "flex", flexWrap: "wrap", gap: 8, animation: "pv2-entrar .4s ease backwards" }}>
                  <input type="time" value={form.de} onChange={(e) => setForm({ ...form, de: e.target.value })} aria-label="Novo horário" style={{ ...campo, width: 110 }} />
                  <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} maxLength={300} placeholder="Por quê?" aria-label="Por quê?" style={{ ...campo, flex: "1 1 140px", minWidth: 0 }} />
                  <button type="button" disabled={enviando} onClick={enviar} style={{ height: 46, padding: "0 16px", border: 0, borderRadius: 14, background: "var(--destaque-texto)", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                    Enviar para {cerimonialista}
                  </button>
                  <button type="button" onClick={() => setForm(null)} style={{ height: 46, padding: "0 12px", border: 0, background: "none", fontSize: 13, color: "#6b6259", cursor: "pointer" }}>
                    Cancelar
                  </button>
                  {erro && <div role="alert" style={{ width: "100%", fontSize: 13, color: "#8a2f2f" }}>{erro}</div>}
                </div>
              )}
              {sug && !aberto && (
                <div className="pv2-sugerir" style={{ padding: "10px 12px", borderRadius: 14, background: "rgba(255,255,255,.75)", fontSize: 13, lineHeight: 1.45, color: "#3a312a" }}>
                  <div style={{ fontWeight: 600, color: "var(--destaque-texto)" }}>
                    Vocês sugeriram {sug.horarioSugerido?.slice(0, 5)}
                    {sug.mensagem ? `: ${sug.mensagem}` : ""}
                  </div>
                  <div>
                    {sug.estado === "pendente"
                      ? `aguardando ${cerimonialista}`
                      : sug.estado === "aceita"
                        ? `${cerimonialista} aceitou`
                        : `${cerimonialista} respondeu${sug.motivoRecusa ? `: ${sug.motivoRecusa}` : ": fica como está"}`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

function duracaoEmTexto(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}

const campo: CSSProperties = { height: 46, padding: "0 12px", border: "1px solid #e7dfd2", borderRadius: 14, background: "#fff", fontSize: 15, color: "#332b24" };
