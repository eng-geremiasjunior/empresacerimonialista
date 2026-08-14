// Topo da tela: barra de conta (sino + iniciais), o nome do evento em
// 54px/34px e a linha de meta (data · local). No computador, o cartão
// de contagem fica ao lado; no celular, embaixo.

import { Calendar, TAMANHO, TRACO, Bell } from "./icones";

function Iniciais({ nome }: { nome: string }) {
  // só letras: "Lya & Jhon" → "L&J". Pontuação e colchetes ficam de fora,
  // senão um nome que começa com símbolo vira uma inicial ilegível.
  const partes = nome
    .split(/\s*(?:&|\be\b)\s*/i)
    .map((p) => p.replace(/[^\p{L}]/gu, "").trim())
    .filter(Boolean);
  const txt =
    partes.length >= 2
      ? `${partes[0][0]}&${partes[1][0]}`.toUpperCase()
      : (partes[0] ?? nome).slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      style={{
        width: 38,
        height: 38,
        flex: "none",
        borderRadius: "var(--raio-pill)",
        background: "var(--cor-chip-redondo)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--fonte-titulo)",
        fontSize: 15,
        color: "var(--cor-ouro-texto)",
      }}
    >
      {txt}
    </span>
  );
}

/** A barra de conta do topo direito (sino + iniciais). */
export function BarraConta({ nome }: { nome: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "var(--esp-5)",
      }}
    >
      <span style={{ display: "flex", color: "#8A7F72" }} aria-hidden>
        <Bell size={TAMANHO} strokeWidth={TRACO} />
      </span>
      <Iniciais nome={nome} />
    </div>
  );
}

export function CabecalhoEvento({
  nome,
  dataFormatada,
  local,
}: {
  nome: string;
  dataFormatada: string;
  local: string | null;
}) {
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: "var(--esp-3)" }}>
      <h1
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontWeight: 400,
          fontSize: "var(--ts-h1)",
          lineHeight: "var(--el-h1)",
          color: "var(--cor-texto-forte)",
        }}
      >
        {nome}
      </h1>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--esp-2)",
          flexWrap: "wrap",
          color: "var(--cor-texto-suave)",
          fontSize: "var(--ts-desc)",
        }}
      >
        <span style={{ color: "var(--cor-ouro)", display: "flex" }} aria-hidden>
          <Calendar size={TAMANHO} strokeWidth={TRACO} />
        </span>
        <span>{dataFormatada}</span>
        {local && (
          <>
            <span
              aria-hidden
              style={{
                width: 3,
                height: 3,
                borderRadius: "var(--raio-pill)",
                background: "var(--cor-ponto)",
              }}
            />
            <span>{local}</span>
          </>
        )}
      </div>
    </header>
  );
}
