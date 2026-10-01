"use client";

// O pó dourado do hero: 34 partículas de 2–4px (#e7c77f, brilho 0 0 10px
// 2px rgba(231,199,127,.55)) em posições fixas ((i·29+11)%100,
// (i·47+23)%100). Cada uma nasce, chega a .9 aos 40% e sobe 60–150px
// desviando ±20px até sumir, em 6–13s, atraso 0–6s, sem fim, ease-in-out.
//
// Só transform e opacidade (o compositor cuida), e pausado quando o hero
// sai da tela. Prévia, revisão e reduced-motion: nada se mexe (as
// partículas ficam invisíveis — é enfeite, não conteúdo).

import { useEffect, useRef } from "react";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { movimentoReduzido } from "@/components/site/pecas/useRevelar";

const QUANTAS = 34;

export function Po() {
  const ref = useRef<HTMLDivElement>(null);
  const { modo } = useModoDoSite();

  useEffect(() => {
    const el = ref.current;
    if (!el || modo !== "publico" || movimentoReduzido()) return;
    const A: Animation[] = [];
    Array.from(el.children).forEach((k) => {
      const p = k as HTMLElement;
      if (typeof p.animate !== "function") return;
      A.push(
        p.animate(
          [
            { transform: "translateY(0)", opacity: 0 },
            { opacity: 0.9, offset: 0.4 },
            {
              transform: `translate(${(Math.random() * 40 - 20).toFixed(1)}px,-${(60 + Math.random() * 90).toFixed(1)}px)`,
              opacity: 0,
            },
          ],
          { duration: 6000 + Math.random() * 7000, delay: Math.random() * 6000, iterations: Infinity, easing: "ease-in-out" }
        )
      );
    });
    let olho: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      olho = new IntersectionObserver(([e]) => A.forEach((a) => (e.isIntersecting ? a.play() : a.pause())));
      olho.observe(el);
    }
    return () => {
      olho?.disconnect();
      A.forEach((a) => a.cancel());
    };
  }, [modo]);

  return (
    <div ref={ref} className="a-po" aria-hidden>
      {Array.from({ length: QUANTAS }, (_, i) => {
        const t = 2 + (i % 3);
        return (
          <span
            key={i}
            className="a-po-grao"
            style={{ left: `${(i * 29 + 11) % 100}%`, top: `${(i * 47 + 23) % 100}%`, width: t, height: t }}
          />
        );
      })}
    </div>
  );
}
