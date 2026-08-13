// A camada mais funda do portal: um clarão morno no alto à direita (luz de
// abajur entrando de viés) e dois fios dourados em curva entrando por
// cantos OPOSTOS, acesos só no trecho do meio.
//
// Soma menos de 3% de luminância — nenhum contraste de texto muda. Os dois
// fios respiram FORA DE FASE (atrasos 0s e -6.5s num ciclo de 14s): nada
// pulsa junto, e é isso que tira o "estático" sem chamar atenção.
//
// UMA por casca do portal. Nunca por tela, nunca por card.

export function Atmosfera({ fixa = false }: { fixa?: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: fixa ? "fixed" : "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        background: "var(--fundo-atmosfera)",
      }}
    >
      <svg
        width={fixa ? 620 : 420}
        height={fixa ? 620 : 420}
        viewBox="0 0 420 420"
        fill="none"
        focusable="false"
        style={{ position: "absolute", top: -120, left: -140 }}
        data-vela-respira
      >
        <defs>
          <linearGradient id="fio-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--cor-atmosfera-fio)" stopOpacity="0" />
            <stop offset="42%" stopColor="var(--cor-atmosfera-fio)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--cor-atmosfera-fio)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M-20 40C120 90 250 180 300 340"
          stroke="url(#fio-a)"
          strokeWidth="1"
          opacity="var(--atmosfera-fio-opacidade)"
          style={{
            animation: "vela-respirar var(--ciclo-respiro) var(--ease-padrao) 0s infinite",
          }}
        />
      </svg>

      <svg
        width={fixa ? 620 : 420}
        height={fixa ? 620 : 420}
        viewBox="0 0 420 420"
        fill="none"
        focusable="false"
        style={{ position: "absolute", bottom: -140, right: -120 }}
        data-vela-respira
      >
        <defs>
          <linearGradient id="fio-b" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--cor-atmosfera-fio)" stopOpacity="0" />
            <stop offset="42%" stopColor="var(--cor-atmosfera-fio)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--cor-atmosfera-fio)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M440 380C300 330 170 240 120 80"
          stroke="url(#fio-b)"
          strokeWidth="1"
          opacity="var(--atmosfera-fio-opacidade)"
          style={{
            animation:
              "vela-respirar var(--ciclo-respiro) var(--ease-padrao) -6.5s infinite",
          }}
        />
      </svg>
    </div>
  );
}
