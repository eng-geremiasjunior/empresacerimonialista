"use client";

// "Cadastre seu primeiro …" — o cartão principal do painel do primeiro
// acesso, com o álbum vivo (efeito A, escolhido pelo dono em 29/09/2026).
//
// A foto passa por cinco eventos, cada um uns 5,5 s, aproximando devagar
// (Ken Burns) e esmaecendo para o próximo; a palavra do título troca junto
// ("seu primeiro casamento", "sua primeira formatura"…). É o que diz "o sistema vai além
// do casamento" sem uma frase explicando (regra do sistema operacional de
// eventos). Para com o mouse em cima e com a aba escondida; com "reduzir
// movimento", fica parado na primeira foto e o título diz "evento".

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const CORPO = "#57534E";
const APOIO = "#78716C";
const LINHA = "#E6E0D8";
const NEVOA = "#F2EEE9";
const SALVIA = "#6E7F63";
const F_TITLE = "var(--font-title), Inter, system-ui, sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace";

const DURACAO_MS = 5500;

// `zoom` e `foco` tiram os letreiros do quadro ("Formatura 2024",
// "Isabella 15 anos 2024", "Annual Summit"): a foto aproxima ancorada em
// quem importa (os formandos, a debutante, as pessoas). O Ken Burns anda
// por cima desse zoom.
const SLIDES = [
  { src: "/site/foto-casamento.webp", posicao: "50% 38%", zoom: 1, foco: "50% 50%", tipo: "Casamento", palavra: "seu primeiro casamento", alt: "Cerimônia de casamento ao ar livre, com o arco de flores" },
  { src: "/primeiro-acesso/15-anos.webp", posicao: "50% 50%", zoom: 1.7, foco: "10% 60%", tipo: "15 anos", palavra: "seu primeiro 15 anos", alt: "Debutante entrando na festa de 15 anos, aplaudida pelos amigos" },
  { src: "/primeiro-acesso/formatura.webp", posicao: "50% 50%", zoom: 1.8, foco: "20% 90%", tipo: "Formatura", palavra: "sua primeira formatura", alt: "Formandos jogando o capelo para o alto no baile de formatura" },
  { src: "/primeiro-acesso/corporativo.webp", posicao: "50% 50%", zoom: 1.3, foco: "85% 55%", tipo: "Corporativo", palavra: "seu primeiro evento corporativo", alt: "Convidados conversando num evento corporativo" },
  { src: "/primeiro-acesso/50-anos.webp", posicao: "40% 55%", zoom: 1, foco: "50% 50%", tipo: "Aniversário", palavra: "seu primeiro aniversário", alt: "Casal dançando na festa de 50 anos" },
];

export function ComeceAqui() {
  const [atual, setAtual] = useState(0);
  const atualRef = useRef(0);
  const [anterior, setAnterior] = useState<number | null>(null);
  // quantas vezes cada foto já entrou: muda a chave dela e reinicia o zoom.
  // A que está saindo guarda a chave, e o zoom segue enquanto ela esmaece.
  const [chaves, setChaves] = useState<number[]>(() => SLIDES.map(() => 0));
  const [parado, setParado] = useState(false);
  const [semMovimento, setSemMovimento] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ir = useCallback((i: number) => {
    const a = atualRef.current;
    if (a === i) return;
    atualRef.current = i;
    setAnterior(a);
    setAtual(i);
    setChaves((c) => c.map((k, j) => (j === i ? k + 1 : k)));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setSemMovimento(!!mq?.matches);
    const aoMudar = () => setSemMovimento(!!mq?.matches);
    mq?.addEventListener?.("change", aoMudar);
    const aoEsconder = () => setParado(document.hidden);
    document.addEventListener("visibilitychange", aoEsconder);
    return () => {
      mq?.removeEventListener?.("change", aoMudar);
      document.removeEventListener("visibilitychange", aoEsconder);
    };
  }, []);

  useEffect(() => {
    if (relogio.current) clearTimeout(relogio.current);
    if (parado || semMovimento) return;
    relogio.current = setTimeout(() => ir((atual + 1) % SLIDES.length), DURACAO_MS);
    return () => {
      if (relogio.current) clearTimeout(relogio.current);
    };
  }, [atual, parado, semMovimento, ir]);

  const slide = SLIDES[semMovimento ? 0 : atual];
  // a expressão inteira troca, e não só a palavra: "sua primeira formatura"
  const palavra = semMovimento ? "seu primeiro evento" : slide.palavra;
  const variantes = ["seu primeiro evento", ...SLIDES.map((s) => s.palavra)];

  return (
    <section
      aria-label="Comece aqui"
      className="pa-comece"
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(document.hidden)}
      style={{ display: "flex", minHeight: 250, background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 14, overflow: "hidden" }}
    >
      <div
        className="pa-comece-foto"
        // clip, não hidden: com o zoom o conteúdo passa da moldura, e uma
        // moldura "hidden" rola por dentro quando um tracinho ganha foco
        // (a foto subia e deixava uma faixa vazia embaixo)
        style={{ flex: "0 1 38%", maxWidth: 440, minWidth: 180, position: "relative", background: NEVOA, overflow: "clip" }}
      >
        {SLIDES.map((s, i) => {
          const ativo = i === (semMovimento ? 0 : atual);
          const saindo = !semMovimento && i === anterior;
          return (
            <div key={s.src} className="pa-slide" data-ativo={ativo ? "1" : "0"} aria-hidden={!ativo}>
              <div
                key={`k-${chaves[i]}`}
                className={ativo || saindo ? (i % 2 === 0 ? "pa-kb pa-kb-a" : "pa-kb pa-kb-b") : "pa-kb"}
                style={{ position: "absolute", inset: 0, transformOrigin: s.foco, ["--z" as string]: s.zoom } as React.CSSProperties}
              >
                <Image
                  src={s.src}
                  alt={ativo ? s.alt : ""}
                  fill
                  sizes="(max-width: 640px) 100vw, 440px"
                  priority={i === 0}
                  style={{ objectFit: "cover", objectPosition: s.posicao }}
                />
              </div>
            </div>
          );
        })}
        {/* véu embaixo: o selo e os tracinhos leem em qualquer foto */}
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,16,14,.42), rgba(20,16,14,0) 42%)", pointerEvents: "none" }} />
        <span
          key={`selo-${slide.tipo}`}
          className="pa-selo"
          style={{ position: "absolute", left: 12, bottom: 12, padding: "4px 9px", borderRadius: 999, background: "rgba(255,255,255,.9)", color: "#221E1B", fontFamily: F_MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          {slide.tipo}
        </span>
        {!semMovimento && (
          <div role="group" aria-label="Tipos de evento" style={{ position: "absolute", right: 8, bottom: 8, display: "flex", gap: 2 }}>
            {SLIDES.map((s, i) => (
              <button
                key={s.tipo}
                type="button"
                onClick={() => ir(i)}
                aria-label={`Mostrar ${s.tipo}`}
                aria-pressed={i === atual}
                style={{ padding: "8px 3px", border: 0, background: "transparent", cursor: "pointer" }}
              >
                <span
                  style={{
                    display: "block",
                    width: i === atual ? 20 : 12,
                    height: 3,
                    borderRadius: 999,
                    background: i === atual ? "#fff" : "rgba(255,255,255,.55)",
                    transition: "width 300ms ease, background 300ms ease",
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center", minWidth: 0, flex: 1 }}>
        <span style={{ fontFamily: F_MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: SALVIA }}>COMECE AQUI</span>
        <h2 style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: 22, lineHeight: 1.25, letterSpacing: "-0.02em", display: "grid" }}>
          <span className="sr-only">Cadastre seu primeiro evento</span>
          {/* todas as variantes empilhadas e invisíveis: a altura do título
              é a da frase mais longa, e a página não pula quando a palavra
              troca */}
          {variantes.map((v) => (
            <span key={v} aria-hidden style={{ gridArea: "1 / 1", visibility: "hidden" }}>
              Cadastre {v}
            </span>
          ))}
          <span aria-hidden style={{ gridArea: "1 / 1" }}>
            Cadastre{" "}
            {/* palavra por palavra, com um atraso pequeno entre elas: a
                linha quebra entre as palavras no celular */}
            <span key={palavra}>
              {palavra.split(" ").map((p, i, todas) => (
                <span key={i}>
                  <span className="pa-palavra" style={{ animationDelay: `${i * 60}ms` }}>
                    {p}
                  </span>
                  {i < todas.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          </span>
        </h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: CORPO, maxWidth: "52ch", textWrap: "pretty" }}>
          Nome do cliente, tipo de evento, data e local. O resto do sistema se organiza a partir dele.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
          <Link
            href="/eventos/novo"
            className="ev-btn-primario ev-foco"
            style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 18px", borderRadius: 10, background: "var(--ev-accent)", color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 140ms ease" }}
          >
            Criar evento
          </Link>
          <span style={{ fontFamily: F_MONO, fontSize: 12, color: APOIO }}>cerca de 2 min</span>
        </div>
      </div>
    </section>
  );
}
