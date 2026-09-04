// A marca, num lugar só.
//
// Identidade v1 (03/09/2026). O nome carrega uma frase falada — "e,
// organizei" — e a ênfase existe na fala, não no desenho: sem exclamação,
// sem caixa alta. A grafia oficial é uma palavra minúscula, com o "e"
// separado por COR e não por espaço.
//
//   fundo claro:  "e" em tinta   + "organizei" em ameixa
//   fundo escuro: "e" em marfim  + "organizei" em ameixa 300
//
// O símbolo é a primeira letra — a que já significa "e, ...". Nada de
// aliança, coração ou taça: o ícone precisa conviver com Notion e Gmail
// na barra de tarefas dela. Mesmo desenho de public/icon.svg.

const AMEIXA = "#6E3F5F";
const AMEIXA_300 = "#B98FAC";
const TINTA = "#221E1B";
const MARFIM = "#FAF8F5";

/** O "e" branco no quadrado ameixa. O raio acompanha o lado (0,208). */
export function Simbolo({ tamanho = 34 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ display: "block", flex: "none" }}
    >
      <rect width="64" height="64" rx="13" fill={AMEIXA} />
      <g fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round">
        <path d="M18 33H46" />
        <path d="M46 33A14 14 0 1 0 41.9 42.9" />
      </g>
    </svg>
  );
}

/**
 * A palavra. `escuro` é para fundo tinta (sidebar, capa) — sem ele, a
 * marca sai preta e some.
 */
export function Palavra({
  tamanho = 21,
  escuro = false,
}: {
  tamanho?: number;
  escuro?: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-title, Inter, sans-serif)",
        fontWeight: 600,
        fontSize: tamanho,
        letterSpacing: "-0.03em",
        color: escuro ? MARFIM : TINTA,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      e<span style={{ color: escuro ? AMEIXA_300 : AMEIXA }}>organizei</span>
    </span>
  );
}

/** Símbolo + palavra, do jeito que a identidade mostra na tela de acesso. */
export function Marca({
  tamanho = 21,
  escuro = false,
  comSimbolo = true,
}: {
  tamanho?: number;
  escuro?: boolean;
  comSimbolo?: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      {comSimbolo && <Simbolo tamanho={Math.round(tamanho * 1.62)} />}
      <Palavra tamanho={tamanho} escuro={escuro} />
    </span>
  );
}
