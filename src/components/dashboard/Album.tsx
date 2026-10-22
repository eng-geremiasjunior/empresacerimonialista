"use client";

// O álbum vivo, em uma peça só (29/09/2026): o "Comece aqui" das boas-
// vindas e o cartão dos próximos eventos do painel usam o mesmo.
//
// Cada foto fica DURACAO_MS aproximando devagar (Ken Burns) e esmaece
// para a próxima; para com o mouse em cima e com a aba escondida; com
// "reduzir movimento" fica parada na primeira. A moldura é overflow: clip
// — com "hidden" ela rolava por dentro quando um tracinho ganhava foco.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FotoDeEvento } from "@/lib/fotos-de-evento";

export const DURACAO_MS = 5500;
const F_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace";

export type SlideDoAlbum = {
  chave: string;
  foto: FotoDeEvento;
  /** foto de fora (capa no Storage): <img>, sem o otimizador do Next */
  externa?: boolean;
  /** o texto do selo no canto ("Formatura", "Amanhã"); vazio = sem selo */
  selo: string;
  /** rótulo do tracinho ("Mostrar …") */
  rotulo: string;
};

export function useAlbum(total: number) {
  const [atual, setAtual] = useState(0);
  const atualRef = useRef(0);
  const [anterior, setAnterior] = useState<number | null>(null);
  // quantas vezes cada foto já entrou: muda a chave dela e reinicia o zoom.
  // A que está saindo guarda a chave, e o zoom segue enquanto ela esmaece.
  const [chaves, setChaves] = useState<number[]>(() => Array.from({ length: total }, () => 0));
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
    if (parado || semMovimento || total < 2) return;
    relogio.current = setTimeout(() => ir((atual + 1) % total), DURACAO_MS);
    return () => {
      if (relogio.current) clearTimeout(relogio.current);
    };
  }, [atual, parado, semMovimento, ir, total]);

  /** a foto que aparece (com "reduzir movimento", sempre a primeira) */
  const visivel = semMovimento ? 0 : atual;
  return {
    atual,
    visivel,
    anterior,
    chaves,
    semMovimento,
    ir,
    pausar: () => setParado(true),
    seguir: () => setParado(document.hidden),
  };
}

export function FotosDoAlbum({
  slides,
  album,
  sizes,
  rotuloDoGrupo,
  className,
  style,
}: {
  slides: SlideDoAlbum[];
  album: ReturnType<typeof useAlbum>;
  sizes: string;
  rotuloDoGrupo: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { visivel, anterior, chaves, semMovimento, ir } = album;
  const slide = slides[visivel] ?? slides[0];
  return (
    <div className={className} style={{ position: "relative", background: "#F2EEE9", overflow: "clip", ...style }}>
      {slides.map((s, i) => {
        const ativo = i === visivel;
        const saindo = !semMovimento && i === anterior;
        return (
          <div key={s.chave} className="pa-slide" data-ativo={ativo ? "1" : "0"} aria-hidden={!ativo}>
            <div
              key={`k-${chaves[i] ?? 0}`}
              className={ativo || saindo ? (i % 2 === 0 ? "pa-kb pa-kb-a" : "pa-kb pa-kb-b") : "pa-kb"}
              style={{ position: "absolute", inset: 0, transformOrigin: s.foto.foco, ["--z" as string]: s.foto.zoom } as React.CSSProperties}
            >
              {s.externa ? (
                // capa do Storage: fora do otimizador (sem domínio remoto no next.config)
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.foto.src}
                  alt={ativo ? s.foto.alt : ""}
                  loading={i === 0 ? "eager" : "lazy"}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: s.foto.posicao }}
                />
              ) : (
                <Image
                  src={s.foto.src}
                  alt={ativo ? s.foto.alt : ""}
                  fill
                  sizes={sizes}
                  priority={i === 0}
                  style={{ objectFit: "cover", objectPosition: s.foto.posicao }}
                />
              )}
            </div>
          </div>
        );
      })}
      {/* véu embaixo: o selo e os tracinhos leem em qualquer foto */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,16,14,.42), rgba(20,16,14,0) 42%)", pointerEvents: "none" }} />
      {slide.selo && (
      <span
        key={`selo-${slide.chave}`}
        className="pa-selo"
        style={{ position: "absolute", left: 12, bottom: 12, padding: "4px 9px", borderRadius: 999, background: "rgba(255,255,255,.9)", color: "#221E1B", fontFamily: F_MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}
      >
        {slide.selo}
      </span>
      )}
      {!semMovimento && slides.length > 1 && (
        <div role="group" aria-label={rotuloDoGrupo} style={{ position: "absolute", right: 8, bottom: 8, display: "flex", gap: 2 }}>
          {slides.map((s, i) => (
            <button
              key={s.chave}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Mostrar ${s.rotulo}`}
              aria-pressed={i === visivel}
              style={{ padding: "8px 3px", border: 0, background: "transparent", cursor: "pointer" }}
            >
              <span
                style={{
                  display: "block",
                  width: i === visivel ? 20 : 12,
                  height: 3,
                  borderRadius: 999,
                  background: i === visivel ? "#fff" : "rgba(255,255,255,.55)",
                  transition: "width 300ms ease, background 300ms ease",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
