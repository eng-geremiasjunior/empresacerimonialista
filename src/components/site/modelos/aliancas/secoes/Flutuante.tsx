"use client";

// 2 · O botão flutuante, no canto de baixo à direita: aparece depois de
// 80% da altura da tela (opacidade .6s ease, sobe de 24px em .6s E). A
// pílula "Confirmar presença" (#rsvp, só com a confirmação no site e
// aberta) e o círculo de 54px com as iniciais e o anel dourado do
// progresso da rolagem (r=27 num viewBox de 60, traço 2.5, trilha line
// de 1.5px, dashoffset com transição de 1.2s E). O círculo volta ao topo.
//
// Tudo pela rolagem, no laço único (useCena), escrevendo atributo: nada
// de setState a cada rolagem. A altura da página é medida fora do laço
// (ResizeObserver), para o quadro não forçar layout. Com reduced-motion
// ele continua seguindo a rolagem (não é animação; as transições saem
// pelo CSS).
//
// Prévia da família: não aparece (no site de verdade ele também não está
// na primeira tela). Revisão do dono: parado no alto, para ele ver.

import { useEffect, useRef } from "react";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { useCena } from "@/components/site/pecas/useCena";
import { movimentoReduzido } from "@/components/site/pecas/useRevelar";
import type { CasalDoSite } from "../comum";

const R = 27;
const L = 2 * Math.PI * R;

export function Flutuante({ casal, comRsvp, modo }: { casal: CasalDoSite; comRsvp: boolean; modo: ModoDoSite }) {
  const ref = useRef<HTMLDivElement>(null);
  const anel = useRef<SVGCircleElement>(null);
  const curso = useRef(0);
  const visivel = useRef<boolean | null>(null);
  const ultimo = useRef(-1);

  // quanto a página rola, medido quando o tamanho muda
  useEffect(() => {
    if (modo !== "publico") return;
    const medir = () => {
      curso.current = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(document.body);
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [modo]);

  useCena(
    ref,
    ({ vh, final }) => {
      const el = ref.current;
      if (!el || final) return;
      const y = window.scrollY;
      const on = y > vh * 0.8;
      if (on !== visivel.current) {
        visivel.current = on;
        el.toggleAttribute("data-visivel", on);
      }
      const f = curso.current > 0 ? Math.min(1, Math.max(0, y / curso.current)) : 0;
      if (Math.abs(f - ultimo.current) > 0.001) {
        ultimo.current = f;
        anel.current?.setAttribute("stroke-dashoffset", (L * (1 - f)).toFixed(2));
      }
    },
    { reduzido: "segue" }
  );

  if (modo === "previa") return null;
  const estatico = modo === "revisao";

  return (
    <div
      ref={ref}
      className={`a-flutuante ${estatico ? "a-flutuante--estatico" : ""}`}
      // escondido (visibility:hidden, fora do Tab e do leitor de tela)
      // até a rolagem chegar
      data-visivel={estatico ? "" : undefined}
    >
      {comRsvp && (
        <a href="#rsvp" className="a-flutuante-rsvp">
          Confirmar presença
        </a>
      )}
      <button
        type="button"
        className="a-flutuante-topo"
        aria-label="Voltar ao início"
        onClick={() => window.scrollTo({ top: 0, behavior: movimentoReduzido() ? "auto" : "smooth" })}
      >
        <svg className="a-flutuante-anel" viewBox="0 0 60 60" aria-hidden>
          <defs>
            <linearGradient id="a-prog" x1={0} y1={0} x2={1} y2={1}>
              <stop offset={0} stopColor="#8a6526" />
              <stop offset={0.45} stopColor="#f4dc9c" />
              <stop offset={1} stopColor="#9b7430" />
            </linearGradient>
          </defs>
          <circle cx={30} cy={30} r={R} fill="none" stroke="var(--sm-line)" strokeWidth={1.5} />
          <circle
            ref={anel}
            className="a-flutuante-prog"
            cx={30}
            cy={30}
            r={R}
            fill="none"
            stroke="url(#a-prog)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={L.toFixed(2)}
            strokeDashoffset={(estatico ? 0 : L).toFixed(2)}
            transform="rotate(-90 30 30)"
          />
        </svg>
        <span className="a-flutuante-iniciais" aria-hidden>
          {casal.i1}
          {casal.i2}
        </span>
      </button>
    </div>
  );
}
