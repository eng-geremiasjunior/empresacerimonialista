"use client";

// O vídeo de fundo dos heros de proposta.
//
// Por que um componente e não um <video> solto: no React, `muted` é
// aplicado como PROPRIEDADE depois que o elemento entra no documento — o
// atributo não vai no HTML. A política de autoplay do navegador decide
// antes disso, vê um vídeo com som e bloqueia. Medido: o vídeo carregava
// inteiro (readyState 4) e ficava paused, exibindo um quadro congelado.
//
// Aqui o mudo é imposto no ref, antes de qualquer tentativa de tocar. E
// quando o autoplay é bloqueado assim mesmo (modo de economia de bateria
// do iPhone, por exemplo), a primeira interação da pessoa destrava.
//
// A última defesa é o `fallback`: se o vídeo não puder tocar nem carregar,
// o hero continua sendo uma imagem/gradiente, nunca um retângulo preto.

import { useEffect, useRef, useState } from "react";

/**
 * Conexão cara ou economia de dados ligada: uma proposta não vale 8 MB
 * do plano da noiva. Nesses casos o vídeo nem é buscado.
 */
function conexaoEconomica(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!c) return false;
  if (c.saveData) return true;
  return c.effectiveType === "slow-2g" || c.effectiveType === "2g";
}

export function VideoDeFundo({
  src,
  fallback,
  style,
  filtro,
}: {
  src: string;
  /** o que fica no lugar quando o vídeo não pode tocar */
  fallback: string;
  style?: React.CSSProperties;
  /** filtro CSS aplicado só ao vídeo (saturação, contraste) */
  filtro?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [semVideo, setSemVideo] = useState(true);

  useEffect(() => {
    if (conexaoEconomica()) return;
    setSemVideo(false);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || semVideo) return;

    // Antes de tudo: mudo de verdade, no elemento. É isto que faz o
    // navegador permitir o autoplay.
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;

    let vivo = true;
    const tentar = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Bloqueado (economia de bateria, política do sistema). Fica no
          // primeiro quadro e espera um toque — sem quebrar a página.
          if (vivo) armarGesto();
        });
      }
    };

    const noGesto = () => {
      v.play().catch(() => {});
      desarmarGesto();
    };
    const armarGesto = () => {
      document.addEventListener("touchstart", noGesto, { once: true, passive: true });
      document.addEventListener("click", noGesto, { once: true });
    };
    const desarmarGesto = () => {
      document.removeEventListener("touchstart", noGesto);
      document.removeEventListener("click", noGesto);
    };

    if (v.readyState >= 2) tentar();
    else v.addEventListener("loadeddata", tentar, { once: true });

    return () => {
      vivo = false;
      desarmarGesto();
      v.removeEventListener("loadeddata", tentar);
    };
  }, [semVideo]);

  return (
    <>
      {/* o fundo existe sempre: é ele que aparece enquanto o vídeo carrega,
          e é ele que fica se o vídeo não vier */}
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: fallback, ...style }}
      />
      {!semVideo && (
        <video
          ref={ref}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          onError={() => setSemVideo(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...(filtro ? { filter: filtro } : null),
            ...style,
          }}
        />
      )}
    </>
  );
}
