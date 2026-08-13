// Fronde botânica em traço de 1px, espírito de gravura antiga (handoff
// §7.3). fill: none, stroke: currentColor, opacidade 0.10. Máximo DOIS
// por tela: um ramo junto ao nome do evento, um detalhe no rodapé.
// Nunca atrás de texto de leitura.
//
// O desenho é o esboço de posicionamento do handoff — define escala,
// densidade e opacidade. Quando existir a gravura definitiva, trocam-se
// só os `d` dos paths.

function Pinulas({
  pontos,
}: {
  /** [x, y, dx, dy] de cada pínula: base e vetor da folha. */
  pontos: [number, number, number, number][];
}) {
  return (
    <>
      {pontos.map(([x, y, dx, dy], i) => (
        <path
          key={i}
          d={`M${x} ${y}q${dx * 0.4} ${dy * 0.4 - 4} ${dx} ${dy}`}
        />
      ))}
    </>
  );
}

export function OrnamentoRamo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 440 190"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
      style={{
        color: "var(--cor-ornamento)",
        opacity: "var(--ornamento-opacidade)",
        pointerEvents: "none",
      }}
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        {/* haste principal em curva */}
        <path d="M8 176C120 150 260 110 428 18" />
        {/* pínulas que encurtam em direção à ponta */}
        <Pinulas
          pontos={[
            [60, 164, 26, -34],
            [100, 155, 24, -31],
            [140, 145, 22, -28],
            [180, 134, 20, -25],
            [220, 122, 18, -22],
            [258, 109, 16, -19],
            [294, 95, 14, -16],
            [328, 80, 12, -13],
            [358, 64, 10, -10],
            [386, 48, 8, -8],
            [408, 34, 6, -6],
          ]}
        />
        <Pinulas
          pontos={[
            [80, 160, 16, 22],
            [122, 150, 15, 20],
            [163, 139, 14, 18],
            [203, 128, 12, 16],
            [241, 115, 11, 14],
            [278, 102, 10, 12],
            [312, 87, 8, 10],
            [344, 72, 7, 8],
            [373, 56, 5, 6],
          ]}
        />
      </g>
    </svg>
  );
}

export function OrnamentoRodape() {
  return (
    <svg
      width="112"
      height="48"
      viewBox="0 0 112 48"
      fill="none"
      aria-hidden
      focusable="false"
      style={{
        color: "var(--cor-ornamento)",
        opacity: "var(--ornamento-opacidade)",
        pointerEvents: "none",
        display: "block",
        margin: "0 auto",
      }}
    >
      <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        <path d="M6 30C34 18 78 18 106 30" />
        <Pinulas
          pontos={[
            [24, 25, 5, -8],
            [40, 22, 4, -7],
            [56, 21, 0, -8],
            [72, 22, -4, -7],
            [88, 25, -5, -8],
          ]}
        />
      </g>
    </svg>
  );
}
