// Topo das telas internas (handoff §7.4): "Voltar" + rótulo da seção de
// origem + título da tela. As internas são FILHAS de Evento — o voltar
// leva sempre para lá.

import Link from "next/link";
import { Rotulo } from "./Nucleo";

export function TopoInterno({
  eventoId,
  secao,
  titulo,
}: {
  eventoId: string;
  secao: string;
  titulo: string;
}) {
  return (
    <header>
      <Link
        href={`/portal/${eventoId}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "var(--toque-min)",
          fontSize: "var(--ts-acao)",
          fontWeight: 500,
          letterSpacing: "var(--tr-acao)",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        Voltar
      </Link>
      <div style={{ marginTop: "var(--esp-2)" }}>
        <Rotulo>{secao}</Rotulo>
      </div>
      <h1
        style={{
          margin: "var(--esp-4) 0 0",
          fontFamily: "var(--fonte-titulo)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "var(--ts-titulo)",
          lineHeight: "var(--el-titulo)",
          color: "var(--cor-texto-principal)",
        }}
      >
        {titulo}
      </h1>
    </header>
  );
}
