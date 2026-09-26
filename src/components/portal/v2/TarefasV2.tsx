"use client";

// Tarefas (portal v2, 179). "Da família": o que a cerimonialista pediu e
// o que a família incluiu, agrupado por prazo e falando em tempo. Marcar
// risca e desliza a linha, com "Desfazer". "Da cerimonialista": o que ela
// está conduzindo, só leitura.

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TarefaDaCerimonialista, TarefaDoPortal } from "@/lib/supabase/portal-tarefas";
import { apagarTarefa, criarTarefa, marcarTarefa } from "@/app/(portal)/portal/[eventoId]/tarefas/actions";
import { NoTopo } from "./NoTopo";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";

function diasAte(iso: string, hoje: string): number {
  const a = Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10));
  const b = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
function somarDias(hoje: string, d: number): string {
  const x = new Date(Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10) + d));
  return x.toISOString().slice(0, 10);
}

function prazoEmTexto(d: number | null): string {
  if (d === null) return "sem data";
  if (d < 0) return d === -1 ? "era para ontem" : `passou ${-d} dias`;
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  return `faltam ${d} dias`;
}

/** O atalho para a tela onde a tarefa se resolve, pelo que ela diz. */
function atalho(titulo: string, base: string): { href: string; rotulo: string } | null {
  const t = titulo.toLowerCase();
  if (/convidad|rsvp/.test(t)) return { href: `${base}/convidados`, rotulo: "Abrir Convidados" };
  if (/vela|corte|pr[ií]ncipe|dama|pares da valsa|padrinho/.test(t)) return { href: `${base}/cortejo`, rotulo: "Abrir a corte" };
  if (/m[uú]sica|trilha|playlist|tema|cores|paleta/.test(t)) return { href: `${base}/escolhas`, rotulo: "Abrir Escolhas" };
  if (/roteiro|hor[aá]rio|ensaio geral/.test(t)) return { href: `${base}/cronograma`, rotulo: "Abrir a noite" };
  if (/pagar|pagamento|parcela|sinal/.test(t)) return { href: `${base}/investimento`, rotulo: "Abrir Dinheiro" };
  return null;
}

/** Um .ics para o calendário do celular (dia inteiro, ou 1 h a partir da hora). */
function baixarAgenda(t: TarefaDoPortal) {
  if (!t.prazo) return;
  const d = t.prazo.replace(/-/g, "");
  const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//eorganizei//portal//PT", "BEGIN:VEVENT", `UID:${t.id}@eorganizei`];
  if (t.hora) {
    const [h, m] = t.hora.split(":").map(Number);
    const fim = `${String(Math.min(23, h + 1)).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    linhas.push(`DTSTART;TZID=America/Sao_Paulo:${d}T${t.hora.replace(":", "")}00`, `DTEND;TZID=America/Sao_Paulo:${d}T${fim}`);
  } else {
    const prox = new Date(Date.UTC(+t.prazo.slice(0, 4), +t.prazo.slice(5, 7) - 1, +t.prazo.slice(8, 10) + 1)).toISOString().slice(0, 10).replace(/-/g, "");
    linhas.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${prox}`);
  }
  linhas.push(`SUMMARY:${t.titulo.replace(/[,;\n]/g, " ")}`);
  if (t.detalhe) linhas.push(`LOCATION:${t.detalhe.replace(/[,;\n]/g, " ")}`);
  linhas.push("END:VEVENT", "END:VCALENDAR");
  const url = URL.createObjectURL(new Blob([linhas.join("\r\n")], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "tarefa.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function TarefasV2({
  eventoId,
  tarefas,
  daCerimonialista,
  cerimonialista,
  quemPode,
  hoje,
}: {
  eventoId: string;
  tarefas: TarefaDoPortal[];
  daCerimonialista: TarefaDaCerimonialista[];
  cerimonialista: string;
  /** as opções de "quem": a debutante, quem abriu, a família */
  quemPode: string[];
  hoje: string;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [lado, setLado] = useState<"fam" | "cer">("fam");
  const [lista, setLista] = useState(tarefas);
  const [saindo, setSaindo] = useState<string | null>(null);
  const [novo, setNovo] = useState("");
  const [quando, setQuando] = useState<"semana" | "mes" | null>("semana");
  const [quem, setQuem] = useState<string>(quemPode[0] ?? "família");
  const [verFeitas, setVerFeitas] = useState(false);
  const [toast, setToast] = useState<{ texto: string; desfazer?: () => void } | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = `/portal/${eventoId}`;

  useEffect(() => setLista(tarefas), [tarefas]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const abertas = lista
    .filter((t) => !t.feita)
    .map((t) => ({ ...t, dias: t.prazo ? diasAte(t.prazo, hoje) : null }))
    .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));
  const feitas = lista.filter((t) => t.feita).sort((a, b) => (b.feitaEm ?? "").localeCompare(a.feitaEm ?? ""));
  const nestaSemana = abertas.filter((t) => t.dias !== null && t.dias <= 7).length;

  const GRUPOS: [string, (d: number | null) => boolean][] = [
    ["Esta semana", (d) => d !== null && d <= 7],
    ["Este mês", (d) => d !== null && d > 7 && d <= 30],
    ["Até a festa", (d) => d !== null && d > 30],
    ["Sem data", (d) => d === null],
  ];

  function gravar(acao: () => Promise<{ ok: true } | { error: string }>) {
    iniciar(async () => {
      const r = await acao();
      if ("error" in r) setToast({ texto: r.error });
      router.refresh();
    });
  }

  function marcar(t: TarefaDoPortal) {
    if (saindo) return;
    setSaindo(t.id);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => {
      setLista((l) => l.map((x) => (x.id === t.id ? { ...x, feita: true, feitaEm: new Date().toISOString(), feitaPor: null, podeDesfazer: true } : x)));
      setSaindo(null);
      setToast({ texto: `Feita: ${t.titulo}`, desfazer: () => desfazer(t) });
      gravar(() => marcarTarefa(eventoId, { id: t.id, origem: t.origem }, true));
    }, 650);
  }

  function desfazer(t: TarefaDoPortal) {
    setToast(null);
    setLista((l) => l.map((x) => (x.id === t.id ? { ...x, feita: false, feitaEm: null, feitaPor: null } : x)));
    gravar(() => marcarTarefa(eventoId, { id: t.id, origem: t.origem }, false));
  }

  function incluir() {
    const titulo = novo.trim();
    if (!titulo) return;
    const prazo = quando === "semana" ? somarDias(hoje, 6) : quando === "mes" ? somarDias(hoje, 30) : null;
    setLista((l) => [...l, { id: `novo-${Date.now()}`, origem: "propria", titulo, prazo, hora: null, detalhe: null, quem, feita: false, feitaPor: null, feitaEm: null, podeDesfazer: true }]);
    setNovo("");
    gravar(() => criarTarefa(eventoId, { titulo, quando: prazo, quem }));
  }

  const resumo = abertas.length
    ? `${nestaSemana ? `${nestaSemana} ${nestaSemana > 1 ? "tarefas" : "tarefa"} esta semana · ` : ""}${abertas.length} no total · ${cerimonialista} vê tudo`
    : "nada pendente";

  return (
    <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ paddingTop: 8 }}>
        <h1 className="pv2-h1" style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>Tarefas</h1>
        <div style={{ fontSize: 14, color: "#4c443c" }}>{resumo}</div>
      </div>

      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", height: 50, padding: 4, borderRadius: 25, background: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.9)", maxWidth: 520 }}>
        <span aria-hidden style={{ position: "absolute", top: 4, bottom: 4, left: 4, width: "calc(50% - 4px)", borderRadius: 21, background: "var(--destaque-texto)", transform: `translateX(${lado === "fam" ? "0%" : "100%"})`, transition: `transform .45s ${ES}` }} />
        <button type="button" aria-pressed={lado === "fam"} onClick={() => setLado("fam")} style={{ ...alternar, color: lado === "fam" ? "#fff" : "#3a312a" }}>
          Da família
        </button>
        <button type="button" aria-pressed={lado === "cer"} onClick={() => setLado("cer")} style={{ ...alternar, color: lado === "cer" ? "#fff" : "#3a312a" }}>
          De {cerimonialista}
        </button>
      </div>

      {lado === "fam" ? (
        <>
          <div className="pv2-vidro" style={{ padding: 14, borderRadius: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={novo}
                onChange={(e) => setNovo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && incluir()}
                maxLength={120}
                placeholder="Nova tarefa…"
                aria-label="Nova tarefa"
                style={{ flex: 1, minWidth: 0, height: 48, padding: "0 16px", border: "1px solid #e7dfd2", borderRadius: 16, background: "#fff", fontSize: 15, color: "#332b24" }}
              />
              <button type="button" onClick={incluir} aria-label="Incluir tarefa" style={{ flex: "none", width: 48, height: 48, border: 0, borderRadius: 16, background: novo.trim() ? "var(--destaque-texto)" : "#ede8e2", color: novo.trim() ? "#fff" : "#928a81", fontSize: 22, cursor: "pointer", transition: "background .3s" }}>
                +
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              {([["semana", "esta semana"], ["mes", "este mês"], [null, "sem data"]] as const).map(([v, t]) => (
                <button key={t} type="button" aria-pressed={quando === v} onClick={() => setQuando(v)} style={chip(quando === v)}>
                  {t}
                </button>
              ))}
              <span aria-hidden style={{ width: 1, height: 20, background: "#e7dfd2", margin: "0 2px" }} />
              {quemPode.map((q) => (
                <button key={q} type="button" aria-pressed={quem === q} onClick={() => setQuem(q)} style={chip(quem === q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {GRUPOS.map(([nome, cabe]) => {
            const itens = abertas.filter((t) => cabe(t.dias));
            if (!itens.length) return null;
            return (
              <div key={nome} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <h2 style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, fontSize: 22, color: "#332b24" }}>{nome}</h2>
                  <span style={{ fontSize: 13, color: "#776d60" }}>{itens.length}</span>
                </div>
                {itens.map((t) => {
                  const sai = saindo === t.id;
                  const urgente = t.dias !== null && t.dias <= 7;
                  const at = atalho(t.titulo, base);
                  const detalhe = [t.detalhe, t.prazo && t.hora ? `${ddmm(t.prazo)}, ${t.hora}` : null].filter(Boolean).join(" · ");
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 14px 8px 6px", borderRadius: 20, background: "rgba(255,255,255,.85)", border: "1px solid rgba(255,255,255,.9)", boxShadow: "0 14px 30px -26px rgba(50,35,45,.5)", animation: sai ? "pv2-sair .4s ease .25s forwards" : `pv2-entrar .45s ${ES} backwards` }}>
                      <button type="button" onClick={() => marcar(t)} aria-label={`Marcar como feita: ${t.titulo}`} style={{ width: 44, height: 44, flex: "none", border: 0, background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", border: `1.8px solid ${sai ? "var(--destaque-texto)" : "#b4ada4"}`, background: sai ? "var(--destaque-texto)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .3s, border-color .3s" }}>
                          {sai && (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" aria-hidden style={{ strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: 24, animation: "pv2-risco .35s ease-out both" }}>
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                          )}
                        </span>
                      </button>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3, paddingTop: 9 }}>
                        <div style={{ fontSize: 15.5, fontWeight: 500, color: sai ? "#928a81" : "#2b241f", textDecoration: sai ? "line-through" : "none", transition: "color .3s" }}>{t.titulo}</div>
                        {detalhe && <div style={{ fontSize: 13, color: "#4c443c" }}>{detalhe}</div>}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 12.5, color: "#776d60" }}>
                          <span style={{ fontWeight: urgente ? 600 : 400, color: urgente ? "var(--destaque-texto)" : "#776d60" }}>{prazoEmTexto(t.dias)}</span>
                          {t.quem && (
                            <>
                              ·<span>{t.quem}</span>
                            </>
                          )}
                          ·<span>{t.origem === "pedida" ? `${cerimonialista} pediu` : "vocês incluíram"}</span>
                        </div>
                        {(at || t.prazo || t.origem === "propria") && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
                            {at && (
                              <Link href={at.href} style={{ height: 36, padding: "0 12px", display: "inline-flex", alignItems: "center", borderRadius: 18, background: "var(--destaque-fundo)", color: "var(--destaque-texto)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                                {at.rotulo}
                              </Link>
                            )}
                            {t.prazo && (
                              <button type="button" onClick={() => baixarAgenda(t)} style={{ height: 36, padding: "0 12px", border: "1px solid #e7dfd2", borderRadius: 18, background: "#fff", color: "#3a312a", fontSize: 13, cursor: "pointer" }}>
                                Pôr na agenda
                              </button>
                            )}
                            {t.origem === "propria" && !t.id.startsWith("novo-") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLista((l) => l.filter((x) => x.id !== t.id));
                                  gravar(() => apagarTarefa(eventoId, t.id));
                                }}
                                style={{ height: 36, padding: "0 10px", border: 0, background: "none", color: "#776d60", fontSize: 13, textDecoration: "underline", cursor: "pointer" }}
                              >
                                apagar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {abertas.length === 0 && (
            <div style={{ padding: 22, borderRadius: 22, background: "rgba(255,255,255,.6)", fontSize: 15, color: "#4c443c" }}>Nada pendente agora.</div>
          )}

          {feitas.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button type="button" onClick={() => setVerFeitas(!verFeitas)} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 16px", border: "1px solid rgba(0,0,0,.08)", borderRadius: 22, background: "rgba(255,255,255,.7)", fontSize: 14, color: "#3a312a", cursor: "pointer" }}>
                {verFeitas ? "Esconder as feitas" : `Ver ${feitas.length} ${feitas.length > 1 ? "feitas" : "feita"}`}
              </button>
              {verFeitas &&
                feitas.map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: "4px 14px", animation: "pv2-entrar .35s ease backwards" }}>
                    <span aria-hidden style={{ width: 22, height: 22, flex: "none", borderRadius: "50%", background: "#d8cfc2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12 }}>✓</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, color: "#6b6259", textDecoration: "line-through" }}>{t.titulo}</span>
                    <span style={{ fontSize: 12, color: "#928a81", whiteSpace: "nowrap" }}>
                      {[t.feitaPor?.split(" ")[0] ?? (t.podeDesfazer ? null : cerimonialista), t.feitaEm ? ddmm(t.feitaEm.slice(0, 10)) : null].filter(Boolean).join(" · ")}
                    </span>
                    {t.podeDesfazer && (
                      <button type="button" onClick={() => desfazer(t)} style={{ height: 36, padding: "0 10px", border: 0, background: "none", fontSize: 13, color: "var(--destaque-texto)", textDecoration: "underline", cursor: "pointer" }}>
                        Desfazer
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: "18px 20px", borderRadius: 24, background: "rgba(255,255,255,.8)", border: "1px solid rgba(255,255,255,.9)", display: "flex", flexDirection: "column" }}>
          {daCerimonialista.length === 0 && <div style={{ fontSize: 15, color: "#4c443c" }}>Nada em andamento agora.</div>}
          {daCerimonialista.map((c, i) => (
            <div key={`${c.titulo}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 0", borderBottom: i < daCerimonialista.length - 1 ? "1px solid rgba(0,0,0,.05)" : "none", animation: `pv2-entrar .4s ease ${i * 60}ms backwards` }}>
              <span aria-hidden style={{ width: 10, height: 10, flex: "none", borderRadius: "50%", background: c.feito ? "#d8cfc2" : "var(--destaque)" }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: "#2b241f" }}>{c.titulo}</span>
              <span style={{ fontSize: 12.5, color: "#776d60", whiteSpace: "nowrap" }}>
                {c.feito ? "feito" : c.prazo ? prazoDaCerimonialista(diasAte(c.prazo, hoje), c.prazo) : "em andamento"}
              </span>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <NoTopo>
          <div className="pv2-toast" role="status">
            <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: toast.desfazer ? "0 8px 0 18px" : "0 18px", borderRadius: 24, background: "rgba(30,24,28,.92)", color: "#fdfbf7", fontSize: 14, boxShadow: "0 16px 30px -14px rgba(0,0,0,.5)", animation: `pv2-subir .45s ${ES} both` }}>
              {toast.texto}
              {toast.desfazer && (
                <button type="button" onClick={toast.desfazer} style={{ height: 36, padding: "0 12px", border: 0, borderRadius: 18, background: "rgba(255,255,255,.14)", color: "#fdfbf7", fontSize: 13, cursor: "pointer" }}>
                  Desfazer
                </button>
              )}
            </div>
          </div>
        </NoTopo>
      )}
    </div>
  );
}

function prazoDaCerimonialista(d: number, iso: string): string {
  if (d < 0) return "desde " + ddmm(iso);
  if (d === 0) return "hoje";
  if (d <= 7) return "esta semana";
  return `até ${ddmm(iso)}`;
}

const alternar: CSSProperties = { position: "relative", border: 0, background: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "color .3s" };
function chip(on: boolean): CSSProperties {
  return { height: 36, padding: "0 12px", border: `1px solid ${on ? "var(--destaque-texto)" : "#e7dfd2"}`, borderRadius: 18, background: on ? "var(--destaque-texto)" : "#fff", color: on ? "#fff" : "#3a312a", fontSize: 13, cursor: "pointer" };
}
