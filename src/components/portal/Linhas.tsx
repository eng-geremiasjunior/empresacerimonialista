// As linhas de lista do portal (handoff §7.2): LinhaDecisao,
// BlocoEntrada, LinhaParcela, Pergunta, ItemLinhaDoTempo. Toda lista
// termina em espaço, não em linha (`ultima` remove a hairline).

import Link from "next/link";
import { Rotulo, Status } from "./Nucleo";

// ------------------------------------------------------------------
// LinhaDecisao — item de decisão ou contratação.
// ------------------------------------------------------------------
export function LinhaDecisao({
  titulo,
  apoio,
  estado,
  statusTexto,
  ultima = false,
}: {
  titulo: string;
  apoio?: string | null;
  estado: "resolvido" | "decidir";
  statusTexto?: string;
  ultima?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "var(--esp-5)",
        padding: "13px 0",
        minHeight: "var(--toque-min)",
        boxSizing: "border-box",
        borderBottom: ultima ? "none" : "var(--borda-fina)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: "var(--ts-corpo)",
            lineHeight: 1.5,
            color: "var(--cor-texto-principal)",
          }}
        >
          {titulo}
        </span>
        {apoio && (
          <span
            style={{
              fontSize: "var(--ts-corpo-p)",
              lineHeight: "var(--el-corpo-p)",
              color: "var(--cor-texto-secundario)",
            }}
          >
            {apoio}
          </span>
        )}
      </div>
      <Status estado={estado} texto={statusTexto} />
    </div>
  );
}

// ------------------------------------------------------------------
// BlocoEntrada — porta de entrada para área sem aba própria. Largura
// total, título em Cormorant 19px + indicador em acento, resumo abaixo.
// ------------------------------------------------------------------
export function BlocoEntrada({
  href,
  titulo,
  resumo,
  indicador,
}: {
  href: string;
  titulo: string;
  resumo: string;
  indicador?: string | null;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--esp-2)",
        background: "var(--cor-card)",
        border: "var(--borda-fina)",
        borderRadius: "var(--raio-0)",
        padding: "var(--esp-5)",
        minHeight: "var(--toque-min)",
        textAlign: "left",
        color: "inherit",
        transition: "var(--transicao-padrao)",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "var(--esp-3)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontWeight: 500,
            fontSize: "var(--ts-subtitulo)",
            lineHeight: "var(--el-subtitulo)",
            color: "var(--cor-texto-principal)",
          }}
        >
          {titulo}
        </span>
        {indicador && (
          <Rotulo tom="acento" espacamento="0.14em">
            {indicador}
          </Rotulo>
        )}
      </span>
      <span
        style={{
          fontSize: "var(--ts-corpo-p)",
          lineHeight: "var(--el-corpo-p)",
          color: "var(--cor-texto-secundario)",
        }}
      >
        {resumo}
      </span>
    </Link>
  );
}

// ------------------------------------------------------------------
// LinhaParcela — SOMENTE leitura. O pagamento acontece fora do portal,
// direto com o fornecedor. vencida é o único estado em acento (pede
// atenção); paga apaga.
// ------------------------------------------------------------------
const ESTADO_PARCELA = {
  paga: { rotulo: "Paga", cor: "var(--cor-texto-desativado)" },
  aVencer: { rotulo: "A vencer", cor: "var(--cor-texto-secundario)" },
  vencida: { rotulo: "Vencida", cor: "var(--cor-acento)" },
} as const;

export function LinhaParcela({
  fornecedor,
  descricao,
  valorFormatado,
  dataFormatada,
  estado,
  ultima = false,
}: {
  fornecedor: string;
  descricao: string | null;
  valorFormatado: string;
  dataFormatada: string;
  estado: keyof typeof ESTADO_PARCELA;
  ultima?: boolean;
}) {
  const e = ESTADO_PARCELA[estado];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "var(--esp-5)",
        padding: "var(--esp-4) 0",
        minHeight: "var(--toque-min)",
        borderBottom: ultima ? "none" : "var(--borda-fina)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: "var(--ts-corpo)",
            lineHeight: 1.5,
            color:
              estado === "paga"
                ? "var(--cor-texto-secundario)"
                : "var(--cor-texto-principal)",
          }}
        >
          {fornecedor}
        </span>
        {descricao && (
          <span
            style={{
              fontSize: "var(--ts-corpo-p)",
              lineHeight: "var(--el-corpo-p)",
              color: "var(--cor-texto-secundario)",
            }}
          >
            {descricao}
          </span>
        )}
        <span
          style={{
            marginTop: 4,
            fontSize: "var(--ts-rotulo)",
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            lineHeight: 1,
            color: e.cor,
          }}
        >
          {e.rotulo} · {dataFormatada}
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontWeight: 500,
          fontSize: "var(--ts-subtitulo)",
          whiteSpace: "nowrap",
          color:
            estado === "paga"
              ? "var(--cor-texto-secundario)"
              : "var(--cor-texto-principal)",
        }}
      >
        {valorFormatado}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------
// Pergunta — prazo em acento, a pergunta, e (quando existir destino) a
// ação. Nesta fase o item é informativo: "Responder" chega com a
// escrita, na fase seguinte.
// ------------------------------------------------------------------
export function Pergunta({
  prazo,
  pergunta,
  apoio,
  ultima = false,
}: {
  prazo: string | null;
  pergunta: string;
  apoio?: string | null;
  ultima?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--esp-2)",
        padding: "var(--esp-5) 0",
        borderBottom: ultima ? "none" : "var(--borda-fina)",
      }}
    >
      {prazo && (
        <Rotulo tom="acento" espacamento="0.16em">
          {prazo}
        </Rotulo>
      )}
      <span
        style={{
          fontSize: "var(--ts-corpo)",
          lineHeight: 1.5,
          color: "var(--cor-texto-principal)",
        }}
      >
        {pergunta}
      </span>
      {apoio && (
        <span
          style={{
            fontSize: "var(--ts-corpo-p)",
            lineHeight: "var(--el-corpo-p)",
            color: "var(--cor-texto-secundario)",
          }}
        >
          {apoio}
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// ItemLinhaDoTempo — marcador de 6px (cheio = aconteceu, vazado =
// previsto) + fio de 1px até o item seguinte.
// ------------------------------------------------------------------
export function ItemLinhaDoTempo({
  data,
  titulo,
  descricao,
  concluido,
  ultimo = false,
}: {
  data: string;
  titulo: string;
  descricao?: string | null;
  concluido: boolean;
  ultimo?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "var(--esp-4)" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 6,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            flex: "0 0 auto",
            borderRadius: "var(--raio-pill)",
            background: concluido ? "var(--cor-acento)" : "transparent",
            border: concluido ? "none" : "1px solid var(--cor-borda-destaque)",
          }}
        />
        {!ultimo && (
          <span
            style={{
              width: 1,
              flex: 1,
              marginTop: 6,
              background: "var(--cor-borda)",
            }}
          />
        )}
      </div>
      <div style={{ paddingBottom: ultimo ? 0 : "var(--esp-6)" }}>
        <Rotulo tom="desativado">{data}</Rotulo>
        <p
          style={{
            margin: "var(--esp-2) 0 0",
            fontSize: "var(--ts-corpo)",
            lineHeight: 1.5,
            color: "var(--cor-texto-principal)",
          }}
        >
          {titulo}
        </p>
        {descricao && (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "var(--ts-corpo-p)",
              lineHeight: "var(--el-corpo-p)",
              color: "var(--cor-texto-secundario)",
            }}
          >
            {descricao}
          </p>
        )}
      </div>
    </div>
  );
}
