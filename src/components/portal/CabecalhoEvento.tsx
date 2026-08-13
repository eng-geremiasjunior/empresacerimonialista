// Abertura da tela Evento (handoff §7.2): rótulo, nome em Cormorant
// itálica 34px, linha de data com a contagem — o ÚNICO lugar onde a
// contagem anima (700ms, uma vez por sessão) — e o retrato de 56px na
// coluna direita.

import { Contagem } from "./Contagem";
import { Retrato } from "./Retrato";
import { Rotulo } from "./Nucleo";

export function CabecalhoEvento({
  nome,
  dataFormatada,
  dias,
  localLinha,
}: {
  nome: string;
  dataFormatada: string;
  dias: number | null;
  localLinha: string | null;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "var(--esp-5)",
      }}
    >
      <div>
        <Rotulo>Seu evento</Rotulo>
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
          {nome}
        </h1>
        <div
          style={{
            marginTop: "var(--esp-3)",
            display: "flex",
            alignItems: "baseline",
            gap: "var(--esp-3)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{ fontSize: "var(--ts-corpo)", color: "var(--cor-texto-principal)" }}
          >
            {dataFormatada}
          </span>
          {dias !== null && dias >= 0 && (
            <span
              style={{
                fontSize: "var(--ts-rotulo)",
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                lineHeight: 1,
                color: "var(--cor-acento)",
              }}
            >
              <Contagem dias={dias} />
            </span>
          )}
        </div>
        {localLinha && (
          <p
            style={{
              marginTop: "var(--esp-2)",
              fontSize: "var(--ts-corpo-p)",
              lineHeight: "var(--el-corpo-p)",
              color: "var(--cor-texto-secundario)",
            }}
          >
            {localLinha}
          </p>
        )}
      </div>

      <Retrato nome={nome} diametro={56} />
    </header>
  );
}
