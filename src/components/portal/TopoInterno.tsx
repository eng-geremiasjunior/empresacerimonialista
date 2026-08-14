// Topo das telas internas: voltar para a Visão geral + título da tela.

import Link from "next/link";
import { ChevronRight, TAMANHO_PEQUENO, TRACO } from "./icones";

export function TopoInterno({
  eventoId,
  titulo,
  apoio,
}: {
  eventoId: string;
  titulo: string;
  apoio?: string;
}) {
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: "var(--esp-2)" }}>
      <Link
        href={`/portal/${eventoId}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          minHeight: "var(--toque-min)",
          fontSize: "var(--ts-botao)",
          color: "var(--cor-ouro-texto)",
        }}
      >
        <span style={{ transform: "rotate(180deg)", display: "flex" }} aria-hidden>
          <ChevronRight size={TAMANHO_PEQUENO} strokeWidth={TRACO} />
        </span>
        Visão geral
      </Link>
      <h1
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontWeight: 400,
          fontSize: "var(--ts-h2)",
          color: "var(--cor-texto-forte)",
        }}
      >
        {titulo}
      </h1>
      {apoio && (
        <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
          {apoio}
        </p>
      )}
    </header>
  );
}
