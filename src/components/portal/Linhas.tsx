// As listas do portal: LinhaDecisao (com chip de ícone por assunto),
// CartaoEntrada (coluna direita), LinhaParcela, Pergunta e
// ItemLinhaDoTempo.
//
// A linha de decisão é o alvo inteiro, com chevron à direita — mas SÓ
// quando há para onde ir: decisão sem pergunta em aberto vira linha
// morta, com o prazo e sem o chevron (veja LinhaDecisao).

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  TAMANHO,
  TAMANHO_PEQUENO,
  TRACO,
  iconeDoAssunto,
} from "./icones";
import { ChipIcone, Rotulo } from "./Nucleo";

// ------------------------------------------------------------------
// LinhaDecisao
// ------------------------------------------------------------------
export function LinhaDecisao({
  href,
  assunto,
  titulo,
  descricao,
  prazo,
  urgente = false,
}: {
  /** Sem href a linha NÃO vira link — e é assim que tem de ser quando a
   *  decisão não tem pergunta esperando: o prazo continua sendo
   *  informação útil ("vence em 4 dias"), mas nada promete uma tela onde
   *  ela possa responder. É a maioria: num casamento, 46 das 71 decisões
   *  da cliente não têm pergunta nenhuma (o porquê está em
   *  getHomePortal, em lib/supabase/portal.ts). */
  href?: string | null;
  /** nome do objetivo — define o ícone */
  assunto: string | null;
  titulo: string;
  descricao?: string | null;
  /** já na voz do portal ("para agora", "faltam 12 dias") */
  prazo?: string | null;
  /** "para agora" ganha o âmbar; o resto fica neutro */
  urgente?: boolean;
}) {
  const Ico = iconeDoAssunto(assunto);
  const corPrazo = urgente ? "var(--cor-atencao)" : "var(--cor-icone-neutro)";

  const estado = prazo ? (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: corPrazo,
        fontSize: "var(--ts-status)",
        whiteSpace: "nowrap",
      }}
    >
      {urgente ? (
        <AlertCircle size={TAMANHO_PEQUENO} strokeWidth={TRACO} />
      ) : (
        <Clock size={TAMANHO_PEQUENO} strokeWidth={TRACO} />
      )}
      {prazo}
    </span>
  ) : null;

  const estilo = {
    display: "flex",
    alignItems: "center",
    gap: "var(--esp-4)",
    padding: "var(--esp-4) 0",
    minHeight: "var(--toque-min)",
    borderTop: "1px solid var(--cor-borda-linha)",
    color: "inherit",
  } as const;

  const miolo = (
    <>
      <ChipIcone tamanho={44}>
        <Ico size={TAMANHO} strokeWidth={TRACO} />
      </ChipIcone>

      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontSize: "var(--ts-titulo-item)",
            color: "var(--cor-texto-forte)",
          }}
        >
          {titulo}
        </span>
        {descricao && (
          <span
            style={{
              fontSize: "var(--ts-item-desc)",
              color: "var(--cor-texto-secundario)",
            }}
          >
            {descricao}
          </span>
        )}
        {/* no celular o prazo mora embaixo do texto */}
        <span className="portal-so-celular">{estado}</span>
      </span>

      {/* no computador o prazo fica na coluna própria, antes do chevron */}
      <span className="portal-so-pc">{estado}</span>
      {/* sem href o chevron some MAS o espaço fica: no computador
          .portal-so-pc é display:contents, então o prazo é irmão flex do
          chevron — tirá-lo do fluxo empurraria a coluna de prazo 30px e a
          lista sairia serrilhada */}
      <span
        style={{
          color: "var(--cor-icone-neutro)",
          display: "flex",
          visibility: href ? "visible" : "hidden",
        }}
        aria-hidden
      >
        <ChevronRight size={16} strokeWidth={TRACO} />
      </span>
    </>
  );

  return href ? (
    <Link href={href} style={estilo}>
      {miolo}
    </Link>
  ) : (
    <div style={estilo}>{miolo}</div>
  );
}

// ------------------------------------------------------------------
// CartaoEntrada — os cartões da coluna direita (e a grade de 2 no
// celular): chip, título serifado, uma linha de resumo e a ação.
// ------------------------------------------------------------------
export function CartaoEntrada({
  href,
  icone,
  titulo,
  resumo,
  acao,
}: {
  href: string;
  icone: ReactNode;
  titulo: string;
  resumo: string;
  /** texto do botão; sem ele, o cartão inteiro é o alvo */
  acao?: string;
}) {
  const miolo = (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--esp-4)" }}>
        <ChipIcone tamanho={40}>{icone}</ChipIcone>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "var(--ts-titulo-lateral)",
              color: "var(--cor-texto-forte)",
            }}
          >
            {titulo}
          </div>
          <div style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
            {resumo}
          </div>
        </div>
      </div>
      {acao && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: "1px solid var(--cor-borda-botao)",
            borderRadius: "var(--raio-botao)",
            padding: "10px 14px",
            minHeight: "var(--toque-min)",
            fontSize: "var(--ts-botao)",
            color: "var(--cor-ouro-texto-hover)",
            background: "var(--cor-card-suave)",
          }}
        >
          {acao}
          <ChevronRight size={TAMANHO_PEQUENO} strokeWidth={TRACO} />
        </span>
      )}
    </>
  );

  return (
    <Link
      href={href}
      style={{
        border: "1px solid var(--cor-borda)",
        borderRadius: "var(--raio-card)",
        background: "var(--cor-card)",
        padding: "var(--esp-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--esp-4)",
        color: "inherit",
      }}
    >
      {miolo}
    </Link>
  );
}

// ------------------------------------------------------------------
// LinhaParcela — somente leitura. O pagamento acontece fora do portal,
// direto com o fornecedor.
// ------------------------------------------------------------------
const ESTADO_PARCELA = {
  paga: { rotulo: "Paga", cor: "var(--cor-texto-rotulo)" },
  aVencer: { rotulo: "A vencer", cor: "var(--cor-texto-suave)" },
  vencida: { rotulo: "Vencida", cor: "var(--cor-atencao)" },
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
  const apagada = estado === "paga";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "var(--esp-5)",
        padding: "var(--esp-4) 0",
        minHeight: "var(--toque-min)",
        borderBottom: ultima ? "none" : "1px solid var(--cor-borda-linha)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span
          style={{
            fontSize: "var(--ts-meta)",
            color: apagada ? "var(--cor-texto-suave)" : "var(--cor-texto-forte)",
          }}
        >
          {fornecedor}
        </span>
        {descricao && (
          <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
            {descricao}
          </span>
        )}
        <Rotulo cor={e.cor} style={{ letterSpacing: "0.09em", marginTop: 2 }}>
          {e.rotulo} · {dataFormatada}
        </Rotulo>
      </div>
      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontSize: "var(--ts-titulo-lateral)",
          whiteSpace: "nowrap",
          color: apagada ? "var(--cor-texto-suave)" : "var(--cor-texto-forte)",
        }}
      >
        {valorFormatado}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------
// Pergunta
// ------------------------------------------------------------------
export function Pergunta({
  prazo,
  urgente = false,
  pergunta,
  apoio,
  ultima = false,
}: {
  prazo: string | null;
  urgente?: boolean;
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
        borderBottom: ultima ? "none" : "1px solid var(--cor-borda-linha)",
      }}
    >
      {prazo && (
        <Rotulo cor={urgente ? "var(--cor-atencao)" : "var(--cor-texto-rotulo)"}>
          {prazo}
        </Rotulo>
      )}
      <span style={{ fontSize: "var(--ts-meta)", color: "var(--cor-texto-forte)" }}>
        {pergunta}
      </span>
      {apoio && (
        <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
          {apoio}
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// ItemLinhaDoTempo — marcador de 6px (cheio = aconteceu) + fio.
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
            background: concluido ? "var(--cor-ouro)" : "transparent",
            border: concluido ? "none" : "1px solid var(--cor-borda-ouro)",
          }}
        />
        {!ultimo && (
          <span
            style={{
              width: 1,
              flex: 1,
              marginTop: 6,
              background: "var(--cor-borda-linha)",
            }}
          />
        )}
      </div>
      <div style={{ paddingBottom: ultimo ? 0 : "var(--esp-7)" }}>
        <Rotulo>{data}</Rotulo>
        <p
          style={{
            marginTop: "var(--esp-2)",
            fontSize: "var(--ts-meta)",
            color: "var(--cor-texto-forte)",
          }}
        >
          {titulo}
        </p>
        {descricao && (
          <p
            style={{
              marginTop: 2,
              fontSize: "var(--ts-desc)",
              color: "var(--cor-texto-suave)",
            }}
          >
            {descricao}
          </p>
        )}
      </div>
    </div>
  );
}
