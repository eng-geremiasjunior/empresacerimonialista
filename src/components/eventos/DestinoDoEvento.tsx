"use client";

// Um destino dentro do evento: Link de verdade no app; botão na
// demonstração da página de vendas, que desenha os componentes REAIS do
// evento e troca a tela no lugar, sem roteador e sem banco.

import Link from "next/link";
import type { NavegacaoDoEvento } from "@/lib/fases-do-evento";

export function DestinoDoEvento({
  href,
  seg,
  navegacao,
  className,
  style,
  title,
  ativo,
  children,
}: {
  href: string;
  /** o segmento da rota (o que a demonstração recebe no clique) */
  seg: string;
  navegacao?: NavegacaoDoEvento;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  ativo?: boolean;
  children: React.ReactNode;
}) {
  if (navegacao) {
    return (
      <button
        type="button"
        onClick={() => navegacao.ir(seg)}
        title={title}
        aria-current={ativo ? "page" : undefined}
        className={className}
        style={{ border: 0, textAlign: "left", font: "inherit", cursor: "pointer", ...style }}
      >
        {children}
      </button>
    );
  }
  return (
    <Link
      href={href}
      title={title}
      aria-current={ativo ? "page" : undefined}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}
