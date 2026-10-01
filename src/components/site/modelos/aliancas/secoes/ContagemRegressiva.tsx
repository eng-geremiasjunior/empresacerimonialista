"use client";

// 7 · Contagem: o anel dourado (min(500px,86vw)) que se completa conforme
// o dia chega — fração = 1 − min(1, falta/365 dias), r=94 num viewBox de
// 200, traço 3 com ponta redonda, dashoffset com transição de 1.2s E — e
// o ponto brilhante (r5, #e9cd87) na ponta. Dentro: "Faltam", os dias
// grandes, "dias" e horas/min/seg. Embaixo, "Para o nosso grande dia.".
//
// Só o textContent dos números muda (useContagem), e o anel é escrito
// pelo aoTique direto no SVG: nada redesenha a árvore a cada segundo. A
// troca de número: some, desce .35em e desfoca 6px → normal, 800ms E. No
// servidor os números saem vazios e o anel vazio (sem divergência de
// hidratação). No dia: "Hoje é o dia!"; depois: "Obrigado por celebrar
// com a gente." — com o anel cheio.

import { useRef } from "react";
import { useContagem } from "@/components/site/pecas/Contagem";

const TROCA = {
  quadros: [
    { opacity: 0, transform: "translateY(.35em)", filter: "blur(6px)" },
    { opacity: 1, transform: "none", filter: "blur(0)" },
  ],
  duracao: 800,
};

const R = 94;
const C = 100;
const L = 2 * Math.PI * R;
const ANO = 365 * 864e5;

function ponta(f: number): [number, number] {
  const ang = f * 2 * Math.PI - Math.PI / 2;
  return [C + R * Math.cos(ang), C + R * Math.sin(ang)];
}

export function ContagemRegressiva({ data, hora }: { data: string; hora: string | null }) {
  const arco = useRef<SVGCircleElement>(null);
  const ponto = useRef<SVGCircleElement>(null);
  const ultimaFracao = useRef(-1);

  function desenhar(f: number) {
    if (Math.abs(f - ultimaFracao.current) < 0.0005) return;
    ultimaFracao.current = f;
    arco.current?.setAttribute("stroke-dashoffset", (L * (1 - f)).toFixed(2));
    const p = ponto.current;
    if (p) {
      const [x, y] = ponta(f);
      p.setAttribute("cx", x.toFixed(2));
      p.setAttribute("cy", y.toFixed(2));
      p.removeAttribute("visibility");
    }
  }

  const { fase, numero } = useContagem(data, hora, {
    animacao: TROCA,
    aoTique: (restante) => desenhar(1 - Math.min(1, restante / ANO)),
  });

  const cheio = fase !== "contando";
  const [px, py] = ponta(1);

  return (
    <section className="a-secao a-contagem">
      <div data-revelar="up" className="a-contagem-anel">
        <svg className="a-contagem-svg" viewBox="0 0 200 200" aria-hidden>
          <defs>
            <linearGradient id="a-contagem-ouro" x1={0} y1={0} x2={1} y2={1}>
              <stop offset={0} stopColor="#8a6526" />
              <stop offset={0.45} stopColor="#f4dc9c" />
              <stop offset={1} stopColor="#9b7430" />
            </linearGradient>
          </defs>
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--sm-line-strong)" strokeWidth={1} />
          <circle
            ref={arco}
            className="a-contagem-arco"
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="url(#a-contagem-ouro)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={L.toFixed(2)}
            strokeDashoffset={cheio ? 0 : L.toFixed(2)}
            transform={`rotate(-90 ${C} ${C})`}
          />
          <circle
            ref={ponto}
            className="a-contagem-ponto"
            cx={px.toFixed(2)}
            cy={py.toFixed(2)}
            r={5}
            fill="#e9cd87"
            visibility={cheio ? undefined : "hidden"}
          />
        </svg>
        <div className="a-contagem-miolo">
          {fase === "contando" ? (
            <>
              <div className="a-contagem-faltam">Faltam</div>
              <span ref={numero.d} className="sm-cd-n a-contagem-dias" />
              <div className="a-contagem-rotulo">dias</div>
              <div className="a-contagem-menores">
                {(
                  [
                    ["h", "horas"],
                    ["m", "min"],
                    ["s", "seg"],
                  ] as const
                ).map(([u, r]) => (
                  <div key={u} className="a-contagem-un">
                    <span ref={numero[u]} className="sm-cd-n a-contagem-n" />
                    <span className="a-contagem-r">{r}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="a-contagem-final">
              {fase === "hoje" ? "Hoje é o dia!" : "Obrigado por celebrar com a gente."}
            </div>
          )}
        </div>
      </div>
      <div data-revelar="up" className="a-contagem-para">
        Para o nosso grande dia.
      </div>
    </section>
  );
}
