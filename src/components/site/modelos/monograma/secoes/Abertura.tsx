"use client";

// Abertura do T04, automática (sem clique): a tela em ink dividida em 5
// faixas verticais (margin-right −1px, sem costura) e, no centro, as
// iniciais com o "&" em pêssego a .55em dentro de um anel (r=49, traço
// pêssego de .6) que se desenha; embaixo, a data "31 · 10 · 2026". Usa
// sempre as iniciais, qualquer que seja a forma do nome.
//
// Tempos (a contar de quando o useAbertura abre, assim que a fonte do
// nome chega):
//   · monograma: opacity 0, blur 12px, scale .95 → 1 em 1000ms;
//   · anel: stroke-dashoffset 308 → 0 em 1300ms, delay 150ms,
//     cubic-bezier(.6,0,.2,1);
//   · em 1500ms o monograma sobe 70px e some (800ms, cubic-bezier(.5,0,.2,1));
//   · em 1550ms as faixas sobem (translateY −101%, 1150ms,
//     cubic-bezier(.77,0,.18,1)), o centro primeiro: delay |i − 2|×90ms;
//   · o hero começa em 1600ms e a abertura sai em 2930ms (useAbertura).
//
// Sem JS (classe sm-js ausente), reduced-motion, prévia e revisão: não
// aparece (o useAbertura já começa aberto, e o CSS esconde a camada).

import { useEffect, useLayoutEffect, useRef } from "react";
import type { EstadoDaAbertura } from "@/components/site/pecas/useAbertura";
import { CURVA_E } from "@/components/site/pecas/useRevelar";
import type { CasalDoSite } from "@/components/site/modelos/cartoes/comum";

const useLayoutNoCliente = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const FAIXAS = [0, 1, 2, 3, 4];
const MEIO = (FAIXAS.length - 1) / 2;

/** "31 · 10 · 2026". */
function dataComPontosEspacados(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]} · ${m[2]} · ${m[1]}` : "";
}

/** Do começo da abertura até ela sair: 1550 + 2×90 + 1200. */
export const FIM_DA_ABERTURA = 1550 + MEIO * 90 + 1200;
/** Quando o hero começa a entrar. */
export const HERO_DA_ABERTURA = 1600;

export function Abertura({
  casal,
  data,
  estado,
  animar,
}: {
  casal: CasalDoSite;
  data: string;
  estado: EstadoDaAbertura;
  animar: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutNoCliente(() => {
    const el = ref.current;
    if (!el || estado !== "abrindo" || !animar || typeof el.animate !== "function") return;
    const A: Animation[] = [];
    const mono = el.querySelector<HTMLElement>("[data-mono]");
    const anel = el.querySelector<SVGCircleElement>("[data-mono-anel]");
    if (mono) {
      A.push(
        mono.animate(
          [
            { opacity: 0, filter: "blur(12px)", transform: "scale(.95)" },
            { opacity: 1, filter: "blur(0)", transform: "none" },
          ],
          { duration: 1000, easing: CURVA_E, fill: "both" }
        ),
        mono.animate(
          [
            { opacity: 1, transform: "none" },
            { opacity: 0, transform: "translateY(-70px)" },
          ],
          { duration: 800, delay: 1500, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" }
        )
      );
    }
    if (anel)
      A.push(
        anel.animate([{ strokeDashoffset: 308 }, { strokeDashoffset: 0 }], {
          duration: 1300,
          delay: 150,
          easing: "cubic-bezier(.6,0,.2,1)",
          fill: "both",
        })
      );
    el.querySelectorAll<HTMLElement>("[data-faixa]").forEach((f) => {
      const i = Number(f.dataset.faixa);
      A.push(
        f.animate([{ transform: "translateY(0)" }, { transform: "translateY(-101%)" }], {
          duration: 1150,
          delay: 1550 + Math.abs(i - MEIO) * 90,
          easing: "cubic-bezier(.77,0,.18,1)",
          fill: "both",
        })
      );
    });
    el.setAttribute("data-pronto", "");
    return () => A.forEach((a) => a.cancel());
  }, [estado, animar]);

  if (estado === "aberta") return null;
  const quando = dataComPontosEspacados(data);

  return (
    <div ref={ref} className="m-abertura" aria-hidden>
      <div className="m-faixas">
        {FAIXAS.map((i) => (
          <div key={i} data-faixa={i} className="m-faixa" />
        ))}
      </div>
      <div data-mono="" className="m-mono">
        <div className="m-mono-caixa">
          <svg viewBox="0 0 100 100" className="m-mono-anel" focusable="false">
            <circle data-mono-anel="" cx="50" cy="50" r="49" />
          </svg>
          <div className="m-mono-iniciais">
            {casal.i1 && <span>{casal.i1}</span>}
            {casal.dois && <span className="m-mono-amp">&amp;</span>}
            {casal.i2 && <span>{casal.i2}</span>}
          </div>
        </div>
        {quando && <div className="m-mono-data">{quando}</div>}
      </div>
    </div>
  );
}
