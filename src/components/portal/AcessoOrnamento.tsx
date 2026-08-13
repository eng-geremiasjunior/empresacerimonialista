// Ramo botânico das telas de acesso. Um só por tela, ancorado ao lado da
// frase de abertura, terminando acima do rótulo "E-MAIL" — nunca atrás dos
// campos. Decoração: aria-hidden, sem eventos de ponteiro.
//
// É um desenho vetorial estilizado, não uma gravura de verdade. Quando
// existir a arte definitiva, troque os `d` mantendo stroke="currentColor"
// e fill="none" (o tema controla a cor). Se o caule mudar de comprimento,
// ajuste o stroke-dasharray da animação `acesso-draw` (hoje: 460).

export function AcessoOrnamento() {
  return (
    <div className="acesso-orn" aria-hidden="true">
      <svg
        viewBox="0 0 180 260"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      >
        <path
          className="stem"
          d="M156 6C132 52 108 96 94 146c-9 33-13 62-12 92"
        />
        <g className="leaves" strokeWidth="1">
          <g transform="translate(140,44) rotate(-24)">
            <path d="M0 0c14-11 35-9 45 3-12 12-33 10-45-3Z" />
            <path d="M0 0 45 3" />
          </g>
          <g transform="translate(132,44) rotate(150)">
            <path d="M0 0c13-10 32-8 41 3-11 11-30 9-41-3Z" />
            <path d="M0 0 41 3" />
          </g>
          <g transform="translate(124,80) rotate(-16)">
            <path d="M0 0c15-12 38-10 49 3-13 13-36 11-49-3Z" />
            <path d="M0 0 49 3" />
          </g>
          <g transform="translate(116,82) rotate(160)">
            <path d="M0 0c12-9 30-7 38 3-10 10-28 8-38-3Z" />
            <path d="M0 0 38 3" />
          </g>
          <g transform="translate(106,120) rotate(-8)">
            <path d="M0 0c16-12 40-10 52 3-14 14-38 12-52-3Z" />
            <path d="M0 0 52 3" />
          </g>
          <g transform="translate(98,124) rotate(168)">
            <path d="M0 0c14-11 34-9 44 3-12 12-32 10-44-3Z" />
            <path d="M0 0 44 3" />
          </g>
          <g transform="translate(90,166) rotate(2)">
            <path d="M0 0c15-12 37-10 48 3-13 13-35 11-48-3Z" />
            <path d="M0 0 48 3" />
          </g>
          <g transform="translate(84,172) rotate(178)">
            <path d="M0 0c12-9 29-7 37 3-10 10-27 8-37-3Z" />
            <path d="M0 0 37 3" />
          </g>
          <g transform="translate(82,212) rotate(10)">
            <path d="M0 0c12-10 30-8 39 3-11 11-29 9-39-3Z" />
            <path d="M0 0 39 3" />
          </g>
        </g>
        <circle cx="150" cy="18" r="2.4" />
        <circle cx="141" cy="30" r="1.8" />
        <circle cx="99" cy="196" r="2" />
      </svg>
    </div>
  );
}

export function IconeAlerta() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.4h.01" />
    </svg>
  );
}

export function IconeEnvelope() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6.5h16v11H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function IconeVoltar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function IconeCheck({ cor }: { cor?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor ?? "currentColor"}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  );
}

export function IconeOlho({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {!aberto && <path d="M3 21 21 3" />}
    </svg>
  );
}
