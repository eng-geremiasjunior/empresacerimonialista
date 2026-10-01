"use client";

// O estouro de partículas (o Burst do T02: as alianças que se encaixam na
// abertura e no "sim" do RSVP). Cada partícula sai do centro num ângulo
// sorteado, a 60 + rand×alcance px, cai 50px (a "gravidade") e some:
// translate(-50%,-50%) scale(0) com opacidade 1 → scale(1) com opacidade
// 0, em 1400–2800ms, atraso base + 0–250ms, cubic-bezier(.1,.8,.3,1).
//
// Tamanho 4px (7px a cada 3ª), redonda (quadrada com raio 1px a cada
// 4ª), as duas cores alternadas e o brilho em volta. O sorteio é no
// navegador, depois da montagem (o HTML do servidor é sempre o mesmo).
//
// Fora do público e com reduced-motion: nada (é só festa, não informa).
// Uma vez só: quem quiser de novo remonta com outra key.

import { useEffect, useRef } from "react";
import { useModoDoSite } from "./contexto";
import { movimentoReduzido } from "./useRevelar";

export function Estouro({
  quantidade = 44,
  atraso = 0,
  alcance = 240,
  cores = ["#f3d990", "#c9a052"],
  brilho = "0 0 8px rgba(255,220,140,.9)",
  className,
}: {
  quantidade?: number;
  /** ms até a primeira partícula sair */
  atraso?: number;
  /** quanto além dos 60px elas podem ir */
  alcance?: number;
  cores?: [string, string];
  brilho?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { modo } = useModoDoSite();

  useEffect(() => {
    const el = ref.current;
    if (!el || modo !== "publico" || movimentoReduzido()) return;
    const A: Animation[] = [];
    Array.from(el.children).forEach((k) => {
      const p = k as HTMLElement;
      if (typeof p.animate !== "function") return;
      const ang = Math.random() * Math.PI * 2;
      const d = 60 + Math.random() * alcance;
      const a = p.animate(
        [
          { transform: "translate(-50%,-50%) scale(0)", opacity: 1 },
          {
            transform: `translate(calc(-50% + ${(Math.cos(ang) * d).toFixed(1)}px), calc(-50% + ${(Math.sin(ang) * d + 50).toFixed(1)}px)) scale(1)`,
            opacity: 0,
          },
        ],
        {
          duration: 1400 + Math.random() * 1400,
          delay: atraso + Math.random() * 250,
          easing: "cubic-bezier(.1,.8,.3,1)",
          fill: "both",
        }
      );
      A.push(a);
    });
    return () => A.forEach((a) => a.cancel());
  }, [modo, atraso, alcance]);

  if (modo !== "publico") return null;

  return (
    <div ref={ref} className={className} style={CAIXA} aria-hidden>
      {Array.from({ length: quantidade }, (_, i) => {
        const t = i % 3 ? 4 : 7;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: t,
              height: t,
              borderRadius: i % 4 ? "50%" : "1px",
              background: i % 2 ? cores[0] : cores[1],
              boxShadow: brilho,
              opacity: 0,
            }}
          />
        );
      })}
    </div>
  );
}

const CAIXA = { position: "absolute", inset: 0, pointerEvents: "none" } as const;
