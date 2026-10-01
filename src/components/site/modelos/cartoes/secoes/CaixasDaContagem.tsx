"use client";

// A contagem do hero em 4 caixas (T03 e T04): largura clamp(64px,7vw,84px),
// raio 18; dias, horas e min em vidro escuro (rgba(20,26,22,.55) com borda
// clara), seg em pêssego. O número em headFont, tabular. Só o textContent
// muda a cada segundo; o que trocou entra de cima com blur 6px em 800ms.
//
// No dia, depois da hora: "Hoje é o dia!"; do dia seguinte em diante,
// "Obrigado por celebrar com a gente." — numa caixa de vidro só.

import { useContagem, type UnidadeDaContagem } from "@/components/site/pecas/Contagem";
import { CURVA_E } from "@/components/site/pecas/useRevelar";

const UNIDADES: { u: UnidadeDaContagem; rotulo: string }[] = [
  { u: "d", rotulo: "dias" },
  { u: "h", rotulo: "horas" },
  { u: "m", rotulo: "min" },
  { u: "s", rotulo: "seg" },
];

const TROCA = {
  quadros: [
    { opacity: 0, transform: "translateY(-.3em)", filter: "blur(6px)" },
    { opacity: 1, transform: "none", filter: "blur(0)" },
  ],
  duracao: 800,
  curva: CURVA_E,
};

export function CaixasDaContagem({
  data,
  hora,
  className,
  ...resto
}: {
  data: string;
  hora: string | null;
  className?: string;
  "data-hero"?: string;
}) {
  const { fase, numero } = useContagem(data, hora, { animacao: TROCA });

  if (fase !== "contando") {
    return (
      <div {...resto} className={`k-contagem ${className ?? ""}`}>
        <div className="k-contagem-fim">{fase === "hoje" ? "Hoje é o dia!" : "Obrigado por celebrar com a gente."}</div>
      </div>
    );
  }

  return (
    <div {...resto} className={`k-contagem ${className ?? ""}`}>
      {UNIDADES.map(({ u, rotulo }) => (
        <div key={u} className={`k-contagem-caixa ${u === "s" ? "k-contagem-caixa--seg" : ""}`}>
          <span ref={numero[u]} className="sm-cd-n k-contagem-n" />
          <span className="k-contagem-rotulo">{rotulo}</span>
        </div>
      ))}
    </div>
  );
}
