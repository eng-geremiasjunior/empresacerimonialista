"use client";

// As 4 cordas do violino na lateral do site: SVG fixo à esquerda
// (left clamp(6px,1.6vw,24px), largura clamp(16px,2vw,28px), 100vh,
// z 45, opacidade .75, sem clique), cordas gold em x 14/38/62/86 do
// viewBox 100×1000 com 1.3/1.05/.85/.7px (non-scaling-stroke).
//
// Vibração: cada corda é M x 0 Q (x + amp·sin(t/(38+9i) + 1.7i)) 500 x 1000,
// com amp = min(14, vol×5 + kick×12). O kick vale 1 no clique da
// experiência, ganha .12 a cada rolagem para baixo e decai ×.965 por
// quadro. No mesmo laço o furo em "f" da pílula pulsa:
// scale(1 + min(.18, vol×.12×(1+sin(t/220)))). O laço (o useCena comum)
// para sozinho com amp < .02 e vol < .01 e volta pela rolagem ou pelo som.
//
// Reduced-motion, prévia e revisão: cordas retas, sem laço. Na prévia e
// na revisão o SVG fica no alto do site (absoluto), não fixo na janela.

import { useEffect, useRef } from "react";
import { useCena } from "@/components/site/pecas/useCena";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import type { MotorDoSom } from "../som";

const X = [14, 38, 62, 86];
const TRACOS = [1.3, 1.05, 0.85, 0.7];
const reta = (x: number) => `M${x} 0 Q${x} 500 ${x} 1000`;

export function Cordas({ motor, modo }: { motor: MotorDoSom; modo: ModoDoSite }) {
  const ref = useRef<HTMLDivElement>(null);
  const cordas = useRef<(SVGPathElement | null)[]>([]);
  // já retas: a rolagem sem som não reescreve nada
  const retas = useRef(true);

  const acordar = useCena(ref, ({ agora, final, reduzido }) => {
    const paths = cordas.current;
    const furo = motor.furo;
    const parar = () => {
      if (!retas.current) {
        paths.forEach((p, i) => p?.setAttribute("d", reta(X[i])));
        if (furo) furo.style.transform = "";
        retas.current = true;
      }
      return false;
    };
    if (final || reduzido) return parar();
    motor.kick *= 0.965;
    const vol = motor.volume();
    const amp = Math.min(14, vol * 5 + motor.kick * 12);
    if (amp < 0.02 && vol < 0.01) return parar();
    retas.current = false;
    paths.forEach((p, i) => {
      const o = amp * Math.sin(agora / (38 + i * 9) + i * 1.7);
      p?.setAttribute("d", `M${X[i]} 0 Q${(X[i] + o).toFixed(2)} 500 ${X[i]} 1000`);
    });
    if (furo) furo.style.transform = `scale(${(1 + Math.min(0.18, vol * 0.12 * (1 + Math.sin(agora / 220)))).toFixed(3)})`;
    return true;
  });

  useEffect(() => {
    motor.acordar.add(acordar);
    return () => {
      motor.acordar.delete(acordar);
    };
  }, [motor, acordar]);

  return (
    <div ref={ref} className={`v-cordas ${modo === "publico" ? "" : "v-cordas--parada"}`} aria-hidden>
      <svg viewBox="0 0 100 1000" preserveAspectRatio="none">
        {X.map((x, i) => (
          <path
            key={x}
            ref={(el) => {
              cordas.current[i] = el;
            }}
            d={reta(x)}
            style={{ strokeWidth: TRACOS[i] }}
          />
        ))}
      </svg>
    </div>
  );
}
