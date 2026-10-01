// As peças miúdas do portal dos noivos (desenho v4). Sem estado: servem
// ao servidor e ao navegador. As medidas moram no noivos.css.

import type { CSSProperties, ReactNode } from "react";

/** Ícone Material Symbols Rounded (subconjunto local). `cheio` = FILL 1. */
export function Icone({
  nome,
  tamanho,
  cheio = false,
  cor,
  style,
}: {
  nome: string;
  tamanho?: number;
  cheio?: boolean;
  cor?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`pn-ic${cheio ? " cheio" : ""}`}
      aria-hidden="true"
      style={{ fontSize: tamanho, color: cor, ...style }}
    >
      {nome}
    </span>
  );
}

/** Rótulo em caixa-alta (13px, .2em, marrom). */
export function Eyebrow({ children, cor, style }: { children: ReactNode; cor?: string; style?: CSSProperties }) {
  return (
    <div className="pn-eyebrow" style={{ color: cor, ...style }}>
      {children}
    </div>
  );
}

/** Barra de progresso de 6px que cresce ao entrar (animação `bar`). */
export function Trilho({
  pct,
  altura = 6,
  fundo,
  cor,
  duracao = 1.2,
}: {
  /** 0–100 */
  pct: number;
  altura?: number;
  fundo?: string;
  cor?: string;
  duracao?: number;
}) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="pn-trilho" style={{ height: altura, background: fundo }}>
      <span style={{ width: `${w}%`, background: cor, animationDuration: `${duracao}s` }} />
    </div>
  );
}

/** O selo "feito" (círculo pêssego de 120px com check, 1.4s). */
export function SeloPop() {
  return (
    <div className="pn-selo-pop">
      <div>
        <span className="pn-ic">check</span>
      </div>
    </div>
  );
}

/** Interruptor de 46×28 (ligado em verde-ok). */
export function Interruptor({
  ligado,
  aoTrocar,
  rotulo,
  desabilitado,
}: {
  ligado: boolean;
  aoTrocar: () => void;
  rotulo: string;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      className="pn-toggle"
      disabled={desabilitado}
      onClick={aoTrocar}
    >
      <span />
    </button>
  );
}

/** Entrada escalonada (`rise`), com atraso em segundos. */
export function Sobe({
  atraso = 0,
  duracao = 0.5,
  children,
  style,
  className,
}: {
  atraso?: number;
  duracao?: number;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`pn-sobe${className ? ` ${className}` : ""}`}
      style={{ animationDelay: `${atraso}s`, animationDuration: `${duracao}s`, ...style }}
    >
      {children}
    </div>
  );
}

/** Iniciais de um nome ("Beatriz Nunes" → "BN"), sem "e" nem partículas. */
export function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^(e|de|da|do|dos|das)$/i.test(w))
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}
