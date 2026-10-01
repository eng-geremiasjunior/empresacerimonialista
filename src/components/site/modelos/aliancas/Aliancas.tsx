"use client";

// A peça-chave do T02: duas alianças de ouro em SVG que se aproximam e
// se encaixam. Uma só peça para todos os lugares — abertura, cena de
// rolagem, hero (no lugar do "&"), convite, RSVP, selo do presente e
// rodapé.
//
// Desenho (Template 02, Rings):
//   · cada aliança: r=52 com traço 10 no gradiente de ouro, filetes r57 e
//     r47 (.8px rgba(70,45,10,.35)) e o brilho r54.5 (1.1px);
//   · entrelaçamento: a aliança A é redesenhada por cima da B, recortada
//     por clipPath rect(0,-72,72,70);
//   · sep (0 encaixadas, 1 separadas): offset = 29 + sep×95, sempre
//     redondas (sem scaleX — já deu aliança oval);
//   · o gradiente gira (t/28)%360; encaixadas (j = max(0, 1−sep×6)) vêm o
//     glow radial #ffdf9a pulsando e as 4 faíscas.
//
// Desempenho: nada de rAF próprio nem setState por quadro. Cada instância
// assina o laço único do useCena (que pausa quem está fora da tela pelo
// IntersectionObserver) e escreve só atributos do próprio SVG. Prévia,
// revisão e reduced-motion: um desenho só, no estado final, sem giro e
// sem faíscas.

import { useId, useRef, type RefObject } from "react";
import { useCena } from "@/components/site/pecas/useCena";

const PARADAS: [number, string][] = [
  [0, "#7a5620"],
  [0.22, "#d6b062"],
  [0.42, "#fff2c9"],
  [0.58, "#e3c178"],
  [0.8, "#9b7430"],
  [1, "#6d4b1a"],
];

const FAISCAS: [number, number][] = [
  [-8, -74],
  [84, -44],
  [-84, 36],
  [44, 62],
];

const ESTRELA = "M0 -8 L1.8 -1.8 L8 0 L1.8 1.8 L0 8 L-1.8 1.8 L-8 0 L-1.8 -1.8 Z";

const deslocamento = (sep: number) => 29 + sep * 95;

function Alianca({ grad }: { grad: string }) {
  return (
    <>
      <circle r={57} fill="none" stroke="rgba(70,45,10,.35)" strokeWidth={0.8} />
      <circle r={52} fill="none" stroke={`url(#${grad})`} strokeWidth={10} />
      <circle r={47} fill="none" stroke="rgba(70,45,10,.35)" strokeWidth={0.8} />
      <circle r={54.5} fill="none" stroke="rgba(255,248,225,.6)" strokeWidth={1.1} />
    </>
  );
}

export function Aliancas({
  alvo,
  inicio,
  lerp = 0.06,
  compacta = false,
  brilho = true,
  faiscas = true,
  className,
}: {
  /** a separação desejada agora (0 encaixadas, 1 separadas); final = o
   *  desenho único da prévia/reduced-motion */
  alvo: (final: boolean) => number;
  /** de onde parte (o "from" do protótipo); ausente = o alvo */
  inicio?: number;
  /** quanto anda por quadro rumo ao alvo */
  lerp?: number;
  /** viewBox -92 -62 184 124 (no lugar do "&", selo, rodapé) */
  compacta?: boolean;
  brilho?: boolean;
  faiscas?: boolean;
  className?: string;
}) {
  const id = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const grad = `${id}g`;
  const radial = `${id}r`;
  const recorte = `${id}c`;

  const svg = useRef<SVGSVGElement>(null);
  const atual = useRef<number | null>(null);
  const ultimoOff = useRef<number | null>(null);
  // os nós que mudam a cada quadro, achados uma vez só
  const nos = useRef<{
    a: Element[];
    b: Element[];
    grad: Element | null;
    glow: Element | null;
    sp: Element[];
  } | null>(null);

  const partida = inicio ?? alvo(false);
  const off0 = deslocamento(partida);
  const j0 = Math.max(0, 1 - partida * 6);

  function achar(el: SVGSVGElement) {
    if (!nos.current)
      nos.current = {
        a: Array.from(el.querySelectorAll("[data-a]")),
        b: Array.from(el.querySelectorAll("[data-b]")),
        grad: el.querySelector(`[id="${grad}"]`),
        glow: el.querySelector("[data-glow]"),
        sp: Array.from(el.querySelectorAll("[data-sp]")),
      };
    return nos.current;
  }

  function moverAneis(n: NonNullable<typeof nos.current>, sep: number) {
    const off = deslocamento(sep);
    if (ultimoOff.current !== null && Math.abs(ultimoOff.current - off) < 0.01) return;
    ultimoOff.current = off;
    n.a.forEach((g) => g.setAttribute("transform", `translate(${-off} 0)`));
    n.b.forEach((g) => g.setAttribute("transform", `translate(${off} 0)`));
  }

  // o useCena mede com getBoundingClientRect e observa com o
  // IntersectionObserver: as duas coisas valem para o <svg>
  useCena(svg as unknown as RefObject<HTMLElement>, ({ agora, final }) => {
    const el = svg.current;
    if (!el) return;
    const n = achar(el);
    const glow = n.glow;
    const brilhos = n.sp;

    if (final) {
      const sep = alvo(true);
      atual.current = sep;
      moverAneis(n, sep);
      const j = Math.max(0, 1 - sep * 6);
      n.grad?.removeAttribute("gradientTransform");
      glow?.setAttribute("opacity", (j * 0.45).toFixed(3));
      brilhos.forEach((s) => s.setAttribute("opacity", "0"));
      return;
    }

    const tg = alvo(false);
    let cur = atual.current ?? partida;
    cur += (tg - cur) * lerp;
    if (Math.abs(tg - cur) < 0.0005) cur = tg;
    atual.current = cur;
    moverAneis(n, cur);
    n.grad?.setAttribute("gradientTransform", `rotate(${((agora / 28) % 360).toFixed(2)} .5 .5)`);
    const j = Math.max(0, 1 - cur * 6);
    glow?.setAttribute("opacity", (j * (0.45 + 0.2 * Math.sin(agora / 700))).toFixed(3));
    brilhos.forEach((s, i) => {
      const v = j * Math.max(0, Math.sin(agora / 460 + i * 1.9));
      s.setAttribute("opacity", v.toFixed(3));
      s.setAttribute("transform", `translate(${FAISCAS[i][0]} ${FAISCAS[i][1]}) scale(${(0.3 + v * 0.9).toFixed(3)})`);
    });
    // o ouro gira sempre: enquanto estiver na tela, quer o próximo quadro
    return true;
  });

  return (
    <svg
      ref={svg}
      className={`a-aneis ${className ?? ""}`}
      viewBox={compacta ? "-92 -62 184 124" : "-190 -95 380 190"}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={grad} x1={0} y1={0} x2={1} y2={1}>
          {PARADAS.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>
        {brilho && (
          <radialGradient id={radial}>
            <stop offset={0} stopColor="#ffdf9a" stopOpacity={0.85} />
            <stop offset={1} stopColor="#ffdf9a" stopOpacity={0} />
          </radialGradient>
        )}
        <clipPath id={recorte}>
          <rect x={0} y={-72} width={72} height={70} />
        </clipPath>
      </defs>
      {brilho && <circle data-glow="" r={130} fill={`url(#${radial})`} opacity={(j0 * 0.45).toFixed(3)} />}
      <g data-a="" transform={`translate(${-off0} 0)`}>
        <Alianca grad={grad} />
      </g>
      <g data-b="" transform={`translate(${off0} 0)`}>
        <Alianca grad={grad} />
      </g>
      <g data-a="" transform={`translate(${-off0} 0)`}>
        <g clipPath={`url(#${recorte})`}>
          <Alianca grad={grad} />
        </g>
      </g>
      {faiscas &&
        FAISCAS.map(([x, y]) => (
          <path key={`${x},${y}`} data-sp="" opacity={0} fill="#fff4d2" d={ESTRELA} transform={`translate(${x} ${y}) scale(.3)`} />
        ))}
    </svg>
  );
}
