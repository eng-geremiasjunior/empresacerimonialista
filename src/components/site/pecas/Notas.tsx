"use client";

// As notas musicais que sobem pelo cartão do RSVP no "sim" (T06). Uma vez
// só, sem laço: 26 notas ♪ ♫ ♩ ♬ de 18/24/30/36px, #b08d57 (2 de cada 3)
// ou #dcc393, com text-shadow 0 0 10px rgba(220,195,147,.6), em
// left (i×37+9)%. Cada uma: scale .6 e opacidade 0 → (15%) opacidade 1 →
// (55%) translate(x/2,−260px) rotate(r/2) a .95 → translate(x,−560px)
// rotate(r) scale 1.1 e opacidade 0, com x ±70px e r ±25°, em 4200–6800ms,
// delay 300–2100ms, cubic-bezier(.3,.1,.4,1).
//
// O sorteio acontece no efeito (nunca no render: o servidor e o navegador
// desenhariam notas diferentes). Só no site público; reduced-motion,
// prévia e revisão: nada. O contêiner (posição e corte) é de quem usa.

import { useEffect, useRef } from "react";
import { useModoDoSite } from "./contexto";
import { movimentoReduzido } from "./useRevelar";

const NOTAS = ["♪", "♫", "♩", "♬"];

export function Notas({ className, quantas = 26 }: { className?: string; quantas?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { modo } = useModoDoSite();
  const ligado = modo === "publico";

  useEffect(() => {
    const el = ref.current;
    // reduced-motion: as notas ficam ocultas, paradas
    if (!el || movimentoReduzido()) return;
    const A: Animation[] = [];
    Array.from(el.children).forEach((k) => {
      const n = k as HTMLElement;
      if (typeof n.animate !== "function") return;
      const x = (Math.random() * 2 - 1) * 70;
      const r = Math.random() * 50 - 25;
      const a = n.animate(
        [
          { transform: "translate(0,0) rotate(0deg) scale(.6)", opacity: 0, visibility: "visible" },
          { opacity: 1, visibility: "visible", offset: 0.15 },
          { transform: `translate(${x * 0.5}px,-260px) rotate(${r * 0.5}deg) scale(1)`, opacity: 0.95, visibility: "visible", offset: 0.55 },
          { transform: `translate(${x}px,-560px) rotate(${r}deg) scale(1.1)`, opacity: 0, visibility: "visible" },
        ],
        { duration: 4200 + Math.random() * 2600, delay: 300 + Math.random() * 1800, easing: "cubic-bezier(.3,.1,.4,1)", fill: "both" }
      );
      // no fim, a nota volta ao estilo (opacidade 0, oculta) e sai da camada
      a.onfinish = () => a.cancel();
      A.push(a);
    });
    return () => A.forEach((a) => a.cancel());
  }, []);

  if (!ligado) return null;

  return (
    <div className={className} aria-hidden>
      <div ref={ref} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: quantas }, (_, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left: `${(i * 37 + 9) % 100}%`,
              fontSize: 18 + (i % 4) * 6,
              lineHeight: 1,
              color: i % 3 ? "#b08d57" : "#dcc393",
              textShadow: "0 0 10px rgba(220,195,147,.6)",
              opacity: 0,
              visibility: "hidden",
            }}
          >
            {NOTAS[i % 4]}
          </span>
        ))}
      </div>
    </div>
  );
}
