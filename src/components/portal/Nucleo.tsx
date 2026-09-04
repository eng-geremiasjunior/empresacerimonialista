// Núcleo do portal (handoff "luxo silencioso"): Rotulo, Botao, Cartao,
// CartaoOuro, Fio, Status, ChipIcone. Tudo pelos tokens de portal.css —
// nenhum hex à mão.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

// ------------------------------------------------------------------
// Rotulo — 11px, caixa alta, ls .09em. É o ÚNICO texto em caixa alta do
// portal (junto da marca), e o único com letter-spacing.
// ------------------------------------------------------------------
export function Rotulo({
  cor = "var(--cor-texto-rotulo)",
  style,
  children,
}: {
  cor?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        fontSize: "var(--ts-rotulo)",
        letterSpacing: "var(--tr-rotulo)",
        textTransform: "uppercase",
        color: cor,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------------
// Fio dourado — a linha de 1px no topo do cartão com o brilho que
// atravessa. Só em quatro lugares do portal; tempos distintos para
// nunca passarem juntos.
// ------------------------------------------------------------------
const TEMPOS = {
  contagem: { dur: "6.5s", atraso: "0s", largura: "38%" },
  decisoes: { dur: "7.5s", atraso: ".8s", largura: "30%" },
  assinatura: { dur: "8s", atraso: "1.6s", largura: "34%" },
  inspiracao: { dur: "6s", atraso: "2.4s", largura: "40%" },
} as const;

export function Fio({ tempo }: { tempo: keyof typeof TEMPOS }) {
  const t = TEMPOS[tempo];
  return (
    <div
      className="portal-fio"
      aria-hidden
      style={
        {
          "--fio-dur": t.dur,
          "--fio-atraso": t.atraso,
          "--fio-largura": t.largura,
        } as CSSProperties
      }
    >
      <span />
    </div>
  );
}

// ------------------------------------------------------------------
// Cartao — branco, borda hairline, SEM sombra.
// ------------------------------------------------------------------
export function Cartao({
  padding = "var(--esp-6)",
  style,
  children,
}: {
  padding?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--cor-borda)",
        borderRadius: "var(--raio-card)",
        background: "var(--cor-card)",
        padding,
        display: "flex",
        flexDirection: "column",
        gap: "var(--esp-4)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

/**
 * CartaoOuro — o bloco com detalhe dourado (contagem, assinatura).
 * Degradê, borda e fio saem dos tokens: como ele é o destaque de TODAS
 * as telas do portal, um tipo de evento com paleta própria troca o tema
 * inteiro só redefinindo --fundo-card-ouro e as cores vizinhas.
 */
export function CartaoOuro({
  fio,
  padding = "20px 24px",
  style,
  children,
}: {
  fio: keyof typeof TEMPOS;
  padding?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--cor-borda-ouro)",
        borderRadius: "var(--raio-card)",
        background: "var(--fundo-card-ouro)",
        boxShadow: "var(--sombra-card-ouro)",
        padding,
        ...style,
      }}
    >
      <Fio tempo={fio} />
      {children}
    </section>
  );
}

// ------------------------------------------------------------------
// ChipIcone — o quadrado (10px de raio) ou círculo que segura o ícone.
// ------------------------------------------------------------------
export function ChipIcone({
  tamanho = 44,
  redondo = false,
  children,
}: {
  tamanho?: number;
  redondo?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        width: tamanho,
        height: tamanho,
        flex: "none",
        borderRadius: redondo ? "var(--raio-pill)" : "var(--raio-chip)",
        background: redondo ? "var(--cor-chip-redondo)" : "var(--cor-chip)",
        color: "var(--cor-ouro)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </span>
  );
}

// ------------------------------------------------------------------
// Botao — secundário (o padrão do portal) e "fantasma sobre foto".
// Fundo claro, borda hairline; hover só escurece o fundo.
// ------------------------------------------------------------------
export function Botao({
  href,
  larguraTotal = true,
  entreExtremos = false,
  ouro = false,
  children,
}: {
  href: string;
  larguraTotal?: boolean;
  /** conteúdo nas pontas (texto à esquerda, chevron à direita) */
  entreExtremos?: boolean;
  /** borda champagne — só o botão de contato da cerimonialista */
  ouro?: boolean;
  children: ReactNode;
}) {
  const estilo: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: entreExtremos ? "space-between" : "center",
    gap: "var(--esp-2)",
    width: larguraTotal ? "100%" : undefined,
    minHeight: "var(--toque-min)",
    border: `1px solid ${ouro ? "var(--cor-borda-botao-ouro)" : "var(--cor-borda-botao)"}`,
    borderRadius: "var(--raio-botao)",
    background: "var(--cor-card-suave)",
    padding: "10px 14px",
    fontSize: "var(--ts-botao)",
    color: ouro ? "var(--cor-ouro-texto-hover)" : "var(--cor-texto-secundario)",
  };

  const externo = /^https?:/.test(href);
  if (externo) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={estilo}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} style={estilo}>
      {children}
    </Link>
  );
}

/** Link de ação em champagne ("Responder as perguntas"). */
export function LinkAcao({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--esp-2)",
        minHeight: "var(--toque-min)",
        fontSize: "var(--ts-acao)",
        color: "var(--cor-ouro-texto)",
      }}
    >
      {children}
    </Link>
  );
}

// ------------------------------------------------------------------
// Titulos
// ------------------------------------------------------------------
export function TituloSecao({
  titulo,
  apoio,
}: {
  titulo: string;
  apoio?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <h2
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontWeight: 400,
          fontSize: "var(--ts-h2)",
          color: "var(--cor-texto-forte)",
        }}
      >
        {titulo}
      </h2>
      {apoio && (
        <div style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
          {apoio}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Divisor — a linha entre itens de lista.
// ------------------------------------------------------------------
export function Divisor({ margem = "0" }: { margem?: string }) {
  return (
    <div
      role="separator"
      style={{
        height: 1,
        background: "var(--cor-borda-linha)",
        margin: margem,
      }}
    />
  );
}
