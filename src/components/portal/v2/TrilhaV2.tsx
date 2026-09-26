"use client";

// A trilha da noite (portal v2, 180). Um disco que gira quando toca, a
// faixa dos momentos (ponto cheio = já tem música) e, em cada momento: a
// escolhida (trecho de 30 s da Apple, ou o tocador do Spotify/YouTube
// quando veio de link), se cabe inteira no tempo do roteiro, "Viver o
// momento", sugestões, a busca no catálogo e o link colado.

import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { MOMENTOS_DA_TRILHA, embedDoLink, linkAceito, mmss, type MusicaEscolhida } from "@/lib/trilha";
import type { EscolhaDaTrilha } from "@/lib/supabase/portal-trilha";
import { escolherMusica, tirarMusica } from "@/app/(portal)/portal/[eventoId]/trilha/actions";
import { NoTopo } from "./NoTopo";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";

type NoRoteiro = Record<string, { hora: string | null; duracao: number | null }>;

function haQuanto(iso: string): string {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
}

async function buscar(q: string): Promise<MusicaEscolhida[]> {
  const r = await fetch(`/api/trilha?q=${encodeURIComponent(q)}`);
  if (!r.ok) return [];
  const j = (await r.json()) as { itens?: MusicaEscolhida[] };
  return j.itens ?? [];
}

export function TrilhaV2({
  eventoId,
  escolhas,
  noRoteiro,
}: {
  eventoId: string;
  escolhas: Record<string, EscolhaDaTrilha>;
  noRoteiro: NoRoteiro;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [idx, setIdx] = useState(() => Math.max(0, MOMENTOS_DA_TRILHA.findIndex((m) => !escolhas[m.id])));
  const [tocando, setTocando] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<MusicaEscolhida[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [link, setLink] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [cena, setCena] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const faixa = useRef<HTMLDivElement | null>(null);

  const m = MOMENTOS_DA_TRILHA[idx];
  const escolhida = escolhas[m.id] ?? null;
  const tempo = noRoteiro[m.id] ?? { hora: null, duracao: null };
  const comMusica = MOMENTOS_DA_TRILHA.filter((x) => escolhas[x.id]).length;

  useEffect(() => {
    const el = faixa.current?.querySelector<HTMLElement>(`[data-momento="${m.id}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setResultados(null);
    setQ("");
    setLink("");
    setAviso(null);
  }, [m.id]);

  useEffect(() => () => audio.current?.pause(), []);

  function parar() {
    audio.current?.pause();
    setTocando(null);
    setProgresso(0);
  }

  async function tocar(chave: string, url: string | null, achar?: () => Promise<string | null>) {
    if (tocando === chave) return parar();
    audio.current?.pause();
    let alvo = url;
    if (!alvo && achar) {
      setCarregando(chave);
      alvo = await achar();
      setCarregando(null);
    }
    if (!alvo) {
      setAviso("Sem trecho para ouvir desta música.");
      return;
    }
    const a = new Audio(alvo);
    audio.current = a;
    a.ontimeupdate = () => setProgresso(a.duration ? a.currentTime / a.duration : 0);
    a.onended = () => {
      setTocando(null);
      setProgresso(0);
    };
    setTocando(chave);
    a.play().catch(() => {
      setTocando(null);
      setAviso("Não foi possível tocar o trecho agora.");
    });
  }

  function escolher(musica: MusicaEscolhida) {
    setAviso(null);
    iniciar(async () => {
      const r = await escolherMusica(eventoId, m.id, musica);
      if ("error" in r) setAviso(r.error);
      else {
        setResultados(null);
        setQ("");
        setLink("");
      }
      router.refresh();
    });
  }

  async function procurar() {
    if (!q.trim()) return;
    setBuscando(true);
    setResultados(await buscar(q));
    setBuscando(false);
  }

  async function escolherSugestao(s: { titulo: string; artista: string }) {
    const [achada] = await buscar(`${s.titulo} ${s.artista}`);
    escolher(achada ?? { titulo: s.titulo, artista: s.artista, capa: null, preview: null, duracao: null, link: null });
  }

  async function escolherLink() {
    const l = link.trim();
    if (!linkAceito(l)) {
      setAviso("Cole um link do Spotify, do YouTube ou da Apple Music.");
      return;
    }
    const r = await fetch(`/api/trilha?link=${encodeURIComponent(l)}`);
    const j = (r.ok ? await r.json() : {}) as { titulo?: string | null; artista?: string | null };
    escolher({ titulo: j.titulo || "Música do link", artista: j.artista ?? null, capa: null, preview: null, duracao: null, link: l });
  }

  const cabe =
    escolhida?.duracao && tempo.duracao
      ? escolhida.duracao <= tempo.duracao * 60
        ? "cabe inteira no momento"
        : `o DJ corta em ${mmss(tempo.duracao * 60)}`
      : null;
  const embed = embedDoLink(escolhida?.link ?? null);
  const girando = tocando !== null;

  return (
    <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, paddingTop: 8 }}>
        <Disco girando={girando} capa={escolhida?.capa ?? null} />
        <div>
          <h1 className="pv2-h1" style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>A trilha da noite</h1>
          <div style={{ fontSize: 14, color: "#4c443c" }}>
            {comMusica} de {MOMENTOS_DA_TRILHA.length} momentos com música
          </div>
        </div>
      </div>

      {/* a faixa dos momentos */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" aria-label="Momento anterior" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} style={seta(idx === 0)}>‹</button>
        <div ref={faixa} style={{ position: "relative", flex: 1, minWidth: 0, overflowX: "auto", scrollbarWidth: "none", padding: "6px 0" }}>
          <div style={{ position: "relative", display: "flex", gap: 8, width: "max-content", padding: "0 30%" }}>
            <span aria-hidden style={{ position: "absolute", left: "30%", right: "30%", top: 24, height: 2, background: "var(--destaque-linha)" }} />
            {MOMENTOS_DA_TRILHA.map((x, i) => {
              const on = i === idx;
              const tem = !!escolhas[x.id];
              return (
                <button key={x.id} type="button" data-momento={x.id} onClick={() => setIdx(i)} aria-current={on} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 96, padding: "8px 6px", border: 0, borderRadius: 16, background: on ? "rgba(255,255,255,.9)" : "transparent", cursor: "pointer", transition: "background .3s" }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", background: tem ? "var(--destaque-texto)" : "#fff", boxShadow: tem ? "none" : "inset 0 0 0 2px var(--destaque-linha)" }} />
                  <span style={{ fontSize: 12.5, fontWeight: on ? 600 : 400, color: on ? "#2b241f" : "#6b6259", whiteSpace: "nowrap" }}>{x.nome}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" aria-label="Próximo momento" onClick={() => setIdx(Math.min(MOMENTOS_DA_TRILHA.length - 1, idx + 1))} disabled={idx === MOMENTOS_DA_TRILHA.length - 1} style={seta(idx === MOMENTOS_DA_TRILHA.length - 1)}>›</button>
      </div>
      <div style={{ marginTop: -12, textAlign: "center", fontSize: 12, color: "#776d60" }}>
        momento {idx + 1} de {MOMENTOS_DA_TRILHA.length}
      </div>

      {/* o momento */}
      <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 14, animation: `pv2-entrar .5s ${ES} backwards` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          {tempo.hora && <span style={{ fontWeight: 500, fontSize: 16, color: "var(--destaque-texto)" }}>{tempo.hora}</span>}
          <h2 style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, fontSize: 27, color: "#2b241f" }}>{m.nome}</h2>
          {tempo.duracao ? <span style={{ fontSize: 13, color: "#776d60" }}>{tempo.duracao} min</span> : null}
        </div>

        {escolhida ? (
          <div className="pv2-vidro" style={{ padding: 16, borderRadius: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Capa url={escolhida.capa} tamanho={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: TITULO, fontSize: 22, lineHeight: 1.15, color: "#2b241f" }}>{escolhida.titulo}</div>
                {escolhida.artista && <div style={{ fontSize: 14, color: "#4c443c" }}>{escolhida.artista}</div>}
                <div style={{ fontSize: 12.5, color: "#776d60" }}>
                  {[escolhida.porNome ? `${escolhida.porNome.split(" ")[0]} escolheu` : "escolhida", haQuanto(escolhida.em), cabe].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
            {embed && (
              <iframe
                src={embed}
                title={`Tocador: ${escolhida.titulo}`}
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                style={{ width: "100%", height: embed.includes("spotify") ? 80 : 200, border: 0, borderRadius: 12 }}
              />
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {escolhida.preview && (
                <button type="button" onClick={() => tocar("escolhida", escolhida.preview)} style={botaoForte}>
                  {tocando === "escolhida" ? "Pausar" : "Ouvir o trecho"}
                </button>
              )}
              <button type="button" onClick={() => { setCena(true); if (escolhida.preview && tocando !== "escolhida") tocar("escolhida", escolhida.preview); }} style={botaoLeve}>
                Viver o momento
              </button>
              <button type="button" onClick={() => iniciar(async () => { await tirarMusica(eventoId, m.id); router.refresh(); })} style={{ ...botaoLeve, border: 0, background: "none", color: "#776d60", textDecoration: "underline" }}>
                tirar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "16px 18px", borderRadius: 22, background: "rgba(255,255,255,.6)", fontSize: 15, color: "#4c443c" }}>Nenhuma música ainda.</div>
        )}

        {/* sugestões */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={rotulo}>Sugestões</div>
          {m.sugestoes.map((s) => {
            const chave = `s:${s.titulo}`;
            return (
              <div key={s.titulo} style={linhaMusica}>
                <button type="button" aria-label={`Ouvir ${s.titulo}`} onClick={() => tocar(chave, null, async () => (await buscar(`${s.titulo} ${s.artista}`))[0]?.preview ?? null)} style={play(tocando === chave)}>
                  {carregando === chave ? "…" : tocando === chave ? "❚❚" : "▶"}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: "#2b241f" }}>{s.titulo}</div>
                  <div style={{ fontSize: 12.5, color: "#776d60" }}>{s.artista}</div>
                </div>
                <button type="button" onClick={() => escolherSugestao(s)} style={botaoChip}>Escolher</button>
              </div>
            );
          })}
        </div>

        {/* a busca e o link */}
        <div className="pv2-vidro" style={{ padding: 14, borderRadius: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && procurar()} maxLength={100} placeholder="Buscar música ou artista" aria-label="Buscar música ou artista" style={{ ...campo, flex: 1 }} />
            <button type="button" onClick={procurar} style={botaoForte}>{buscando ? "Buscando…" : "Buscar"}</button>
          </div>
          {resultados && resultados.length === 0 && <div style={{ fontSize: 13, color: "#776d60" }}>Nada encontrado. Tente o nome do artista.</div>}
          {resultados?.map((r, i) => {
            const chave = `r:${i}:${r.titulo}`;
            return (
              <div key={chave} style={linhaMusica}>
                <Capa url={r.capa} tamanho={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: "#2b241f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.titulo}</div>
                  <div style={{ fontSize: 12.5, color: "#776d60" }}>{[r.artista, r.duracao ? mmss(r.duracao) : null].filter(Boolean).join(" · ")}</div>
                </div>
                {r.preview && (
                  <button type="button" aria-label={`Ouvir ${r.titulo}`} onClick={() => tocar(chave, r.preview)} style={play(tocando === chave)}>
                    {tocando === chave ? "❚❚" : "▶"}
                  </button>
                )}
                <button type="button" onClick={() => escolher(r)} style={botaoChip}>Escolher</button>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && escolherLink()} maxLength={300} placeholder="Ou cole um link do Spotify ou do YouTube" aria-label="Link do Spotify ou do YouTube" style={{ ...campo, flex: 1 }} />
            <button type="button" onClick={escolherLink} style={botaoLeve}>Usar o link</button>
          </div>
          {aviso && <div role="status" style={{ fontSize: 13, color: "#8a2f2f" }}>{aviso}</div>}
        </div>
      </div>

      {/* viver o momento */}
      {cena && escolhida && (
        <NoTopo>
          <div className="pv2-ensaio" role="dialog" aria-modal="true" aria-label={`Viver o momento: ${m.nome}`} style={{ background: "radial-gradient(22% 60% at 50% 18%, rgba(255,248,232,.55), transparent 72%), radial-gradient(40% 30% at 50% 70%, color-mix(in oklch, var(--destaque) 35%, transparent), transparent 70%), #0d0a0c" }}>
            <div style={{ marginTop: 70, fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", opacity: 0.75 }}>
              {tempo.hora ? `${tempo.hora} · ` : ""}{m.nome}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "0 28px", textAlign: "center" }}>
              <Disco girando={girando} capa={escolhida.capa} grande />
              <div style={{ fontFamily: TITULO, fontSize: 30, lineHeight: 1.1, animation: `pv2-entrar 1s ${ES} .3s backwards` }}>{escolhida.titulo}</div>
              {escolhida.artista && <div style={{ fontSize: 15, opacity: 0.8 }}>{escolhida.artista}</div>}
              <div style={{ maxWidth: 420, fontFamily: TITULO, fontStyle: "italic", fontSize: 19, opacity: 0.85, animation: `pv2-entrar 1s ease .8s backwards` }}>{m.cena}</div>
            </div>
            <div style={{ width: "min(420px, 80%)", height: 3, borderRadius: 2, background: "rgba(255,255,255,.18)", marginBottom: 18 }}>
              <div style={{ width: `${progresso * 100}%`, height: "100%", borderRadius: 2, background: "var(--destaque)", transition: "width .25s linear" }} />
            </div>
            <div style={{ display: "flex", gap: 8, padding: "0 24px 34px" }}>
              {escolhida.preview && (
                <button type="button" onClick={() => tocar("escolhida", escolhida.preview)} style={botaoEscuro}>
                  {tocando === "escolhida" ? "Pausar" : "Tocar"}
                </button>
              )}
              <button type="button" onClick={() => { parar(); setCena(false); }} style={{ ...botaoEscuro, background: "rgba(255,255,255,.1)" }}>
                Voltar
              </button>
            </div>
          </div>
        </NoTopo>
      )}
    </div>
  );
}

function Disco({ girando, capa, grande }: { girando: boolean; capa: string | null; grande?: boolean }) {
  const t = grande ? 180 : 72;
  return (
    <span aria-hidden className="pv2-mov" style={{ position: "relative", flex: "none", width: t, height: t, borderRadius: "50%", background: "repeating-radial-gradient(circle, #1c1719 0 2px, #2a2326 2px 4px)", boxShadow: "0 18px 36px -18px rgba(20,12,18,.8)", animation: "pv2-girar 3.6s linear infinite", animationPlayState: girando ? "running" : "paused", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ width: "38%", height: "38%", borderRadius: "50%", background: capa ? `center / cover url(${capa})` : "var(--destaque-texto)", boxShadow: "0 0 0 3px rgba(255,255,255,.08)" }} />
    </span>
  );
}

function Capa({ url, tamanho }: { url: string | null; tamanho: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={tamanho} height={tamanho} style={{ flex: "none", width: tamanho, height: tamanho, borderRadius: 10, objectFit: "cover" }} />
  ) : (
    <span aria-hidden style={{ flex: "none", width: tamanho, height: tamanho, borderRadius: 10, background: "var(--destaque-fundo)" }} />
  );
}

const rotulo: CSSProperties = { fontSize: 11, letterSpacing: ".09em", textTransform: "uppercase", color: "#776d60" };
const campo: CSSProperties = { minWidth: 0, height: 46, padding: "0 14px", border: "1px solid #e7dfd2", borderRadius: 14, background: "#fff", fontSize: 15, color: "#332b24" };
const botaoForte: CSSProperties = { height: 46, padding: "0 16px", border: 0, borderRadius: 14, background: "var(--destaque-texto)", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" };
const botaoLeve: CSSProperties = { height: 46, padding: "0 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 14, background: "#fff", color: "#3a312a", fontSize: 14, cursor: "pointer" };
const botaoChip: CSSProperties = { flex: "none", height: 40, padding: "0 12px", border: 0, borderRadius: 14, background: "var(--destaque-fundo)", color: "var(--destaque-texto)", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const botaoEscuro: CSSProperties = { minHeight: 48, padding: "0 20px", border: "1px solid rgba(255,255,255,.3)", borderRadius: 24, background: "none", color: "#fdfbf7", fontSize: 14, cursor: "pointer" };
const linhaMusica: CSSProperties = { display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "6px 10px", borderRadius: 16, background: "rgba(255,255,255,.75)" };
function play(on: boolean): CSSProperties {
  return { flex: "none", width: 40, height: 40, border: 0, borderRadius: "50%", background: on ? "var(--destaque-texto)" : "var(--destaque-fundo)", color: on ? "#fff" : "var(--destaque-texto)", fontSize: 13, cursor: "pointer" };
}
function seta(off: boolean): CSSProperties {
  return { flex: "none", width: 40, height: 44, border: 0, borderRadius: 12, background: "rgba(255,255,255,.7)", fontSize: 20, color: off ? "#cfc6ba" : "#3a312a", cursor: off ? "default" : "pointer" };
}
