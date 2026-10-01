"use client";

// O cartão escuro "A trilha de vocês" (desenho v4, README §8; protótipo,
// template 226–291 e lógica 993–1010), em alta fidelidade:
//   · o disco de vinil com o selo do casal, que gira só enquanto toca;
//   · o equalizador, a música do momento, o trecho de 30 s e "Viver o
//     momento" (a cena por cima do cartão; no celular, a tela inteira);
//   · a lista dos momentos (hora do roteiro · nome · música) e, para o
//     momento aberto, as sugestões, a busca no catálogo e o link colado.
//
// Tocar e buscar são os da trilha da debutante (TrilhaV2): o trecho da
// Apple pela /api/trilha, o tocador do Spotify/YouTube para link colado.
// Escolher grava na hora (otimista) e confirma pelo servidor.

import "./trilha.css";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { embedDoLink, linkAceito, type MusicaEscolhida } from "@/lib/trilha";
import { Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import { escolherNoCasamento } from "./acoes";

export type MomentoDaTrilha = {
  id: string;
  nome: string;
  /** "16:15", pelo roteiro; null quando o roteiro não tem o momento */
  hora: string | null;
  /** a frase da cena; null = sem fonte (a cena mostra só música e artista) */
  cena: string | null;
  sugestoes: { titulo: string; artista: string }[];
};

type Sugestao = { titulo: string; artista: string };

/** Uma linha do quadro de baixo: sugestão do momento ou resultado da busca. */
type Linha = { titulo: string; artista: string | null; capa: string | null; resultado: MusicaEscolhida | null };

async function buscar(q: string): Promise<MusicaEscolhida[]> {
  try {
    const r = await fetch(`/api/trilha?q=${encodeURIComponent(q)}`);
    if (!r.ok) return [];
    const j = (await r.json()) as { itens?: MusicaEscolhida[] };
    return j.itens ?? [];
  } catch {
    return [];
  }
}

const mesma = (a: { titulo: string; artista: string | null } | null, b: { titulo: string; artista: string | null }) =>
  !!a && a.titulo.trim().toLowerCase() === b.titulo.trim().toLowerCase() && (a.artista ?? "").trim().toLowerCase() === (b.artista ?? "").trim().toLowerCase();

export function CartaoTrilha({
  eventoId,
  selo,
  momentos,
  escolhas,
}: {
  eventoId: string;
  /** "M&T" (ou só "M") — o selo do disco */
  selo: string;
  momentos: MomentoDaTrilha[];
  escolhas: Record<string, MusicaEscolhida>;
}) {
  const router = useRouter();
  const { avisar } = usePortalNoivos();
  const [, iniciar] = useTransition();

  // abre no primeiro momento ainda sem música (o que há para fazer agora)
  const [idx, setIdx] = useState(() => Math.max(0, momentos.findIndex((m) => !escolhas[m.id])));
  const [otimista, setOtimista] = useState<Record<string, MusicaEscolhida>>({});
  const [tocando, setTocando] = useState(false);
  const [prog, setProg] = useState(0);
  const [tocador, setTocador] = useState(false);
  const [cena, setCena] = useState<null | "cartao" | "tela">(null);
  const [alvo, setAlvo] = useState<Element | null>(null);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<MusicaEscolhida[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [link, setLink] = useState("");

  const raiz = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const fonte = useRef<string | null>(null);
  const botaoViver = useRef<HTMLButtonElement>(null);
  const botaoVoltar = useRef<HTMLButtonElement>(null);

  const atual = momentos[Math.min(idx, momentos.length - 1)];
  const musicaDe = (id: string): MusicaEscolhida | null => otimista[id] ?? escolhas[id] ?? null;
  const musica = atual ? musicaDe(atual.id) : null;
  const comMusica = momentos.filter((m) => musicaDe(m.id)).length;
  const embed = musica && !musica.preview ? embedDoLink(musica.link) : null;
  const semHora = momentos.every((m) => !m.hora);

  // o servidor confirmou: a verdade volta a ser a dele
  useEffect(() => setOtimista({}), [escolhas]);

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    []
  );

  // a cena fecha com Esc; na tela inteira (celular) a página não rola por baixo
  useEffect(() => {
    if (!cena) return;
    botaoVoltar.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setCena(null);
      botaoViver.current?.focus();
    };
    document.addEventListener("keydown", tecla);
    const antes = document.documentElement.style.overflow;
    if (cena === "tela") document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.documentElement.style.overflow = antes;
    };
  }, [cena]);

  function parar() {
    audio.current?.pause();
    audio.current = null;
    fonte.current = null;
    setTocando(false);
    setProg(0);
  }

  /** `silencioso`: o toque logo depois de escolher — se o navegador barrar,
   *  basta o botão "Ouvir o trecho", sem aviso de erro. */
  function tocar(url: string, silencioso = false) {
    const falhou = () => {
      setTocando(false);
      if (!silencioso) avisar("Não foi possível tocar o trecho agora.", true);
    };
    if (audio.current && fonte.current === url) {
      setTocando(true);
      audio.current.play().catch(falhou);
      return;
    }
    audio.current?.pause();
    const a = new Audio(url);
    audio.current = a;
    fonte.current = url;
    a.ontimeupdate = () => setProg(a.duration ? a.currentTime / a.duration : 0);
    a.onended = () => {
      audio.current = null;
      fonte.current = null;
      setTocando(false);
      setProg(0);
    };
    setProg(0);
    setTocando(true);
    a.play().catch(falhou);
  }

  function pausar() {
    audio.current?.pause();
    setTocando(false);
  }

  function irPara(i: number) {
    if (i === idx) return;
    parar();
    setTocador(false);
    setResultados(null);
    setQ("");
    setLink("");
    setIdx(i);
  }

  function alternar() {
    if (!musica) return;
    if (musica.preview) return tocando ? pausar() : tocar(musica.preview);
    if (embed) setTocador((v) => !v);
  }

  function viver() {
    if (!musica) return;
    const celular = window.matchMedia("(max-width: 767px)").matches;
    if (celular) setAlvo(raiz.current?.closest(".pn") ?? document.body);
    setCena(celular ? "tela" : "cartao");
    if (musica.preview && !tocando) tocar(musica.preview);
  }

  function fecharCena() {
    setCena(null);
    botaoViver.current?.focus();
  }

  function escolher(m: MusicaEscolhida) {
    if (!atual) return;
    const id = atual.id;
    setOtimista((o) => ({ ...o, [id]: m }));
    setResultados(null);
    setQ("");
    setLink("");
    // escolheu, ouviu (como no desenho); link colado abre o tocador dele
    if (m.preview) tocar(m.preview, true);
    else parar();
    setTocador(!m.preview && !!embedDoLink(m.link));
    iniciar(async () => {
      const r = await escolherNoCasamento(eventoId, id, m);
      if ("error" in r) {
        setOtimista((o) => {
          const n = { ...o };
          delete n[id];
          return n;
        });
        parar();
        setTocador(false);
        avisar(r.error, true);
      }
      router.refresh();
    });
  }

  async function escolherSugestao(s: Sugestao) {
    const chave = `${s.titulo}|${s.artista}`;
    setCarregando(chave);
    const [achada] = await buscar(`${s.titulo} ${s.artista}`);
    setCarregando(null);
    escolher(achada ?? { titulo: s.titulo, artista: s.artista, capa: null, preview: null, duracao: null, link: null });
  }

  async function procurar() {
    const termo = q.trim();
    if (!termo || buscando) return;
    setBuscando(true);
    setResultados(await buscar(termo));
    setBuscando(false);
  }

  async function usarLink(texto: string) {
    const l = texto.trim();
    if (!l) return;
    if (!linkAceito(l)) {
      avisar("Cole um link do Spotify, do YouTube ou da Apple Music.", true);
      return;
    }
    let j: { titulo?: string | null; artista?: string | null } = {};
    try {
      const r = await fetch(`/api/trilha?link=${encodeURIComponent(l)}`);
      if (r.ok) j = await r.json();
    } catch {
      /* sem o título do link: fica "Música do link" */
    }
    escolher({ titulo: j.titulo || "Música do link", artista: j.artista ?? null, capa: null, preview: null, duracao: null, link: l });
  }

  if (!atual) return null;

  const titulo = musica?.titulo ?? "Nenhuma música ainda";
  const girando = tocando ? " tocando" : "";
  const linhas: Linha[] = resultados
    ? resultados.map((r) => ({ titulo: r.titulo, artista: r.artista, capa: r.capa, resultado: r }))
    : atual.sugestoes.map((s) => ({ titulo: s.titulo, artista: s.artista, capa: null, resultado: null }));

  const cenaEl =
    cena && musica ? (
      <div
        className={`pn-trilha-cena${cena === "tela" ? " tela" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Viver o momento: ${atual.nome}`}
      >
        <div className="pn-trilha-cena-rot">{atual.hora ? `${atual.hora} · ${atual.nome}` : atual.nome}</div>
        <div className="pn-trilha-cena-disco" aria-hidden="true">
          <span />
        </div>
        <div className="pn-t pn-trilha-cena-musica">{musica.titulo}</div>
        {musica.artista && <div className="pn-trilha-cena-artista">{musica.artista}</div>}
        {atual.cena && <div className="pn-t pn-trilha-cena-frase">{atual.cena}</div>}
        <button type="button" ref={botaoVoltar} className="pn-trilha-voltar" onClick={fecharCena}>
          Voltar
        </button>
      </div>
    ) : null;

  return (
    <div ref={raiz} className="pn-trilha">
      <div className="pn-trilha-topo">
        <div>
          <div className="pn-trilha-eyebrow">Músicas</div>
          <h2 className="pn-t pn-trilha-titulo">A trilha de vocês</h2>
          <div className="pn-trilha-sub">Uma música para cada momento.</div>
        </div>
        <div className="pn-trilha-conta">
          {comMusica} de {momentos.length} {momentos.length === 1 ? "momento" : "momentos"} com música
        </div>
      </div>

      <div className="pn-trilha-grade">
        {/* o disco e a música do momento */}
        <div className="pn-trilha-tocador">
          <div className="pn-trilha-disco" aria-hidden="true">
            <div className={`pn-trilha-vinil${girando}`}>
              <div className="pn-trilha-selo">
                <div className="pn-t">{selo}</div>
              </div>
            </div>
            <div className="pn-trilha-reflexo" />
          </div>
          <div className="pn-trilha-agora">
            <div className={`pn-trilha-eq${girando}`} aria-hidden="true">
              {[0, 0.15, 0.3, 0.45, 0.6].map((d) => (
                <span key={d} style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
            <div className="pn-t pn-trilha-musica" aria-live="polite">
              {titulo}
            </div>
            <div className="pn-trilha-artista">
              {musica ? (
                musica.artista
              ) : (
                <>
                  <span className="pn-trilha-so-largo">Escolha uma sugestão ao lado</span>
                  <span className="pn-trilha-so-estreito">Escolha uma sugestão abaixo</span>
                </>
              )}
            </div>
            <div className="pn-trilha-prog">
              <span style={{ width: `${prog * 100}%` }} />
            </div>
            <div className="pn-trilha-botoes">
              {musica && !musica.preview && !embed && musica.link ? (
                <a className="pn-trilha-ouvir" href={musica.link} target="_blank" rel="noopener noreferrer">
                  <Icone nome="open_in_new" tamanho={22} />
                  Ouvir a música
                </a>
              ) : (
                <button type="button" className="pn-trilha-ouvir" onClick={alternar} disabled={!musica || (!musica.preview && !embed)}>
                  <Icone nome={tocando ? "pause" : tocador ? "close" : "play_arrow"} tamanho={22} cheio />
                  {musica?.preview ? (tocando ? "Pausar" : "Ouvir o trecho") : embed ? (tocador ? "Fechar o tocador" : "Ouvir a música") : "Ouvir o trecho"}
                </button>
              )}
              <button type="button" ref={botaoViver} className="pn-trilha-viver" onClick={viver} disabled={!musica}>
                <Icone nome="theaters" tamanho={20} />
                Viver o momento
              </button>
            </div>
            {tocador && embed && (
              <iframe
                key={embed}
                className="pn-trilha-embed"
                src={embed}
                title={`Tocador: ${musica?.titulo ?? ""}`}
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                style={embed.includes("spotify") ? { height: 80 } : { aspectRatio: "16 / 9" }}
              />
            )}
          </div>
        </div>

        {/* os momentos e o que escolher */}
        <div className="pn-trilha-lado">
          <div className={`pn-trilha-momentos${semHora ? " sem-hora" : ""}`}>
            {momentos.map((m, i) => {
              const sg = musicaDe(m.id);
              const on = i === idx;
              return (
                <button key={m.id} type="button" className={`pn-trilha-momento${on ? " on" : ""}`} aria-current={on ? "true" : undefined} onClick={() => irPara(i)}>
                  {!semHora && <span className="hora">{m.hora ?? ""}</span>}
                  <span className="txt">
                    <span className="pn-t nome">{m.nome}</span>
                    <span className="linha">{sg ? (sg.artista ? `${sg.titulo} · ${sg.artista}` : sg.titulo) : "escolher música"}</span>
                  </span>
                  <Icone nome={sg ? "music_note" : "add_circle"} tamanho={22} />
                </button>
              );
            })}
          </div>

          <div className="pn-trilha-sug">
            <div className="pn-trilha-sug-rot">
              <span>
                {buscando ? "Buscando…" : resultados ? (resultados.length ? `Resultados para “${q.trim() || "a busca"}”` : "Nada encontrado") : `Sugestões para ${atual.nome}`}
              </span>
              {resultados && (
                <button type="button" className="pn-trilha-limpar" aria-label="Voltar às sugestões" onClick={() => setResultados(null)}>
                  <Icone nome="close" tamanho={18} />
                </button>
              )}
            </div>
            {resultados && resultados.length === 0 && <div className="pn-trilha-nada">Tente o nome do artista.</div>}
            {linhas.map((s, k) => {
              const chave = `${s.titulo}|${s.artista ?? ""}`;
              const ja = mesma(musica, s);
              return (
                <div key={`${chave}|${k}`} className="pn-trilha-sug-linha">
                  <span className="pn-trilha-sug-icone" aria-hidden="true">
                    {s.capa ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.capa} alt="" width={38} height={38} />
                    ) : (
                      <Icone nome="music_note" tamanho={20} cheio />
                    )}
                  </span>
                  <div className="pn-trilha-sug-txt">
                    <div className="t">{s.titulo}</div>
                    {s.artista && <div className="a">{s.artista}</div>}
                  </div>
                  {ja ? (
                    <span className="pn-trilha-escolhida">
                      <Icone nome="check" tamanho={16} />
                      Escolhida
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="pn-trilha-escolher"
                      aria-busy={carregando === chave}
                      disabled={carregando === chave}
                      onClick={() => (s.resultado ? escolher(s.resultado) : escolherSugestao({ titulo: s.titulo, artista: s.artista ?? "" }))}
                    >
                      Escolher
                    </button>
                  )}
                </div>
              );
            })}
            <div className="pn-trilha-campos">
              <div className="pn-trilha-campo">
                <button type="button" className="pn-trilha-lupa" aria-label="Buscar" onClick={procurar}>
                  <Icone nome="search" tamanho={20} />
                </button>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      procurar();
                    }
                  }}
                  maxLength={100}
                  enterKeyHint="search"
                  placeholder="Buscar música ou artista"
                  aria-label="Buscar música ou artista"
                />
              </div>
              <label className="pn-trilha-campo link">
                <Icone nome="link" tamanho={20} />
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onPaste={(e) => {
                    const colado = e.clipboardData.getData("text");
                    if (linkAceito(colado.trim())) {
                      e.preventDefault();
                      usarLink(colado);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      usarLink(link);
                    }
                  }}
                  maxLength={300}
                  inputMode="url"
                  enterKeyHint="done"
                  placeholder="Colar link do Spotify ou YouTube"
                  aria-label="Colar link do Spotify ou YouTube"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {cena === "cartao" && cenaEl}
      {cena === "tela" && alvo && cenaEl && createPortal(cenaEl, alvo)}
    </div>
  );
}
