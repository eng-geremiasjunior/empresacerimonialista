// Núcleo do portal (handoff §7.1): Rotulo, Botao, Cartao, Status,
// Divisor. Tudo pelos tokens de portal.css — nenhum hex à mão.

import Link from "next/link";
import type { CSSProperties } from "react";

// ------------------------------------------------------------------
// Rotulo — a marcação de seção. Etiqueta de uma linha, nunca texto
// corrido. Jost 11px / 500 / 0.22em / uppercase.
// ------------------------------------------------------------------
const TOM_ROTULO: Record<string, string> = {
  secundario: "var(--cor-texto-secundario)",
  principal: "var(--cor-texto-principal)",
  acento: "var(--cor-acento)",
  desativado: "var(--cor-texto-desativado)",
};

export function Rotulo({
  tom = "secundario",
  espacamento,
  style,
  children,
}: {
  tom?: keyof typeof TOM_ROTULO;
  /** 0.22em padrão; contextos periféricos usam 0.14–0.16em (§4.3). */
  espacamento?: string;
  style?: CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        fontSize: "var(--ts-rotulo)",
        fontWeight: 500,
        letterSpacing: espacamento ?? "var(--tr-rotulo)",
        textTransform: "uppercase",
        lineHeight: 1,
        color: TOM_ROTULO[tom],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------------
// Botao — fundo SEMPRE transparente; o acento é contorno e texto,
// nunca preenchimento. Hover pelo letter-spacing (transição padrão).
// ------------------------------------------------------------------
type VarianteBotao = "principal" | "secundario" | "texto";

function estiloBotao(variante: VarianteBotao, bloco: boolean): CSSProperties {
  const base: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    background: "transparent",
    fontFamily: "var(--fonte-corpo)",
    fontSize: "var(--ts-acao)",
    fontWeight: 500,
    letterSpacing: "var(--tr-acao)",
    textTransform: "uppercase",
    lineHeight: 1,
    borderRadius: "var(--raio-0)",
    boxShadow: "none",
    cursor: "pointer",
    transition: "var(--transicao-padrao)",
    width: bloco ? "100%" : undefined,
  };
  if (variante === "texto") {
    return {
      ...base,
      border: "none",
      color: "var(--cor-acento)",
      padding: "12px 0",
      justifyContent: "flex-start",
      width: undefined,
    };
  }
  return {
    ...base,
    padding: "16px 22px",
    minHeight: "var(--toque-min)",
    border:
      variante === "principal" ? "var(--borda-acento)" : "var(--borda-destaque)",
    color:
      variante === "principal"
        ? "var(--cor-acento)"
        : "var(--cor-texto-principal)",
  };
}

export function Botao({
  variante = "principal",
  bloco = true,
  href,
  className,
  children,
}: {
  variante?: VarianteBotao;
  bloco?: boolean;
  /** Com href vira Link (navegação); sem href é <button>. */
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const estilo = estiloBotao(variante, bloco);
  if (href) {
    // Externo (WhatsApp) abre em aba nova; interno navega pelo router.
    if (/^https?:/.test(href)) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={className}
          style={estilo}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={className} style={estilo}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} style={estilo}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------
// Cartao — superfície de bloco. destaque: MÁXIMO um por tela.
// ------------------------------------------------------------------
export function Cartao({
  destaque = false,
  children,
}: {
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--cor-card)",
        border: destaque ? "var(--borda-destaque)" : "var(--borda-fina)",
        borderRadius: "var(--raio-0)",
        padding: "var(--esp-5)",
      }}
    >
      {children}
    </section>
  );
}

// ------------------------------------------------------------------
// Status — estado textual, não pílula. SEM o estado "aguardando" nesta
// fase: nenhuma fonte no modelo diz "proposta enviada ao fornecedor";
// inventá-lo seria mentir para a cliente.
// ------------------------------------------------------------------
export function Status({
  estado,
  texto,
}: {
  estado: "resolvido" | "decidir";
  texto?: string;
}) {
  return (
    <span
      style={{
        fontSize: "var(--ts-rotulo)",
        fontWeight: 500,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        lineHeight: 1,
        whiteSpace: "nowrap",
        color:
          estado === "resolvido"
            ? "var(--cor-estado-resolvido)"
            : "var(--cor-estado-decidir)",
      }}
    >
      {texto ?? (estado === "resolvido" ? "Contratado" : "A decidir")}
    </span>
  );
}

// ------------------------------------------------------------------
// Divisor — a única régua visual do sistema.
// ------------------------------------------------------------------
export function Divisor() {
  return (
    <div
      role="separator"
      style={{
        height: 1,
        background: "var(--cor-borda)",
        margin: "var(--esp-6) 0",
      }}
    />
  );
}
