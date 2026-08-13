"use client";

/* eslint-disable @next/next/no-img-element */

// A barra lateral do computador (README-computador §4): a moldura de
// 300px com seis blocos — marca, retrato, identificação do evento, as
// quatro abas, "Dentro de Evento" e a cerimonialista no rodapé
// (margin-top: auto).
//
// REGRA DE ACENDER (§5, diferente do celular DE PROPÓSITO): uma tela
// interna (Perguntas, Investimento) acende o item dela em "Dentro de
// Evento" e NENHUMA aba principal. No celular, as internas acendem a aba
// Evento. Não unificar.
//
// A contagem aqui é ESTÁTICA — duas contagens animando na mesma tela
// chamam atenção demais; quem anima é o hero do conteúdo.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Retrato } from "./Retrato";

const ABAS = [
  { rotulo: "Evento", seg: "" },
  { rotulo: "Escolhas", seg: "escolhas" },
  { rotulo: "Convidados", seg: "convidados" },
  { rotulo: "Linha do tempo", seg: "linha-do-tempo" },
];

// Cortejo e Inspirações entram na fase do Cortejo — link morto não
// aparece (regra "não prometer").
const INTERNAS = [
  { rotulo: "Perguntas do momento", seg: "perguntas" },
  { rotulo: "Investimento", seg: "investimento" },
];

function Rotulinho({
  cor = "var(--cor-texto-secundario)",
  children,
}: {
  cor?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: "var(--ts-rotulo)",
        fontWeight: 500,
        letterSpacing: "var(--tr-rotulo)",
        textTransform: "uppercase",
        lineHeight: 1,
        color: cor,
      }}
    >
      {children}
    </p>
  );
}

export function NavLateral({
  eventoId,
  nome,
  dataFormatada,
  dias,
  marcaNome,
  marcaLogoUrl,
  cerimonialistaNome,
  cerimonialistaZap,
}: {
  eventoId: string;
  nome: string;
  dataFormatada: string;
  dias: number | null;
  marcaNome: string | null;
  marcaLogoUrl: string | null;
  cerimonialistaNome: string | null;
  cerimonialistaZap: string | null;
}) {
  const pathname = usePathname();
  const base = `/portal/${eventoId}`;

  const internaAtiva = INTERNAS.find((i) =>
    pathname.startsWith(`${base}/${i.seg}`)
  );
  const indiceAba = (() => {
    if (internaAtiva) return -1; // interna acesa: nenhuma aba principal
    for (let i = ABAS.length - 1; i >= 1; i--) {
      if (pathname.startsWith(`${base}/${ABAS[i].seg}`)) return i;
    }
    return 0;
  })();

  return (
    <nav className="portal-sidebar" aria-label="Navegação do portal">
      {/* 1. marca da cerimonialista */}
      {marcaLogoUrl ? (
        <img
          src={marcaLogoUrl}
          alt={marcaNome ?? "Cerimonialista"}
          style={{ height: 30, width: "auto", alignSelf: "flex-start" }}
        />
      ) : (
        <span
          style={{
            width: 132,
            height: 30,
            border: "var(--borda-fina)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--cor-texto-desativado)",
          }}
        >
          logo da cerimonialista
        </span>
      )}

      {/* 2. retrato — 72px na lateral (56px no hero do celular) */}
      <div style={{ marginTop: "var(--esp-8)" }}>
        <Retrato nome={nome} diametro={72} />
      </div>

      {/* 3. identificação do evento (contagem estática) */}
      <div style={{ marginTop: "var(--esp-5)" }}>
        <Rotulinho>Seu evento</Rotulinho>
        <p
          style={{
            margin: "var(--esp-3) 0 0",
            fontFamily: "var(--fonte-titulo)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 28,
            lineHeight: 1.1,
            color: "var(--cor-texto-principal)",
            textWrap: "balance",
          }}
        >
          {nome}
        </p>
        <p
          style={{
            margin: "var(--esp-2) 0 0",
            fontSize: "var(--ts-corpo-p)",
            color: "var(--cor-texto-secundario)",
          }}
        >
          {dataFormatada}
        </p>
        {dias !== null && dias >= 0 && (
          <p
            style={{
              margin: "var(--esp-2) 0 0",
              fontSize: "var(--ts-rotulo)",
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              lineHeight: 1,
              color: "var(--cor-acento)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            faltam {dias} dias
          </p>
        )}
      </div>

      {/* 4. as mesmas quatro abas do celular — nunca cinco */}
      <div style={{ marginTop: "var(--esp-8)" }}>
        {ABAS.map((aba, i) => {
          const href = aba.seg ? `${base}/${aba.seg}` : base;
          return (
            <Link
              key={aba.rotulo}
              href={href}
              className="portal-aba-lateral"
              data-ativa={i === indiceAba}
            >
              {aba.rotulo}
            </Link>
          );
        })}
      </div>

      {/* 5. dentro de evento — hierarquia do celular tornada visível */}
      <div style={{ marginTop: "var(--esp-8)" }}>
        <div style={{ padding: "0 var(--esp-4) var(--esp-3)" }}>
          <Rotulinho>Dentro de evento</Rotulinho>
        </div>
        {INTERNAS.map((i) => (
          <Link
            key={i.seg}
            href={`${base}/${i.seg}`}
            className="portal-interna-lateral"
            data-ativa={internaAtiva?.seg === i.seg}
          >
            {i.rotulo}
          </Link>
        ))}
      </div>

      {/* 6. cerimonialista, ancorada no rodapé */}
      {cerimonialistaNome && (
        <div style={{ marginTop: "auto", paddingTop: "var(--esp-8)" }}>
          <Rotulinho>Sua cerimonialista</Rotulinho>
          <p
            style={{
              margin: "var(--esp-2) 0 0",
              fontSize: "var(--ts-corpo)",
              color: "var(--cor-texto-principal)",
            }}
          >
            {cerimonialistaNome}
          </p>
          {cerimonialistaZap && (
            <a
              href={cerimonialistaZap}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "var(--esp-4)",
                minHeight: "var(--toque-min)",
                padding: "16px 22px",
                border: "var(--borda-destaque)",
                borderRadius: "var(--raio-0)",
                color: "var(--cor-texto-principal)",
                fontSize: "var(--ts-acao)",
                fontWeight: 500,
                letterSpacing: "var(--tr-acao)",
                textTransform: "uppercase",
                lineHeight: 1,
                transition: "var(--transicao-padrao)",
              }}
            >
              Falar com {cerimonialistaNome.split(" ")[0]}
            </a>
          )}
        </div>
      )}
    </nav>
  );
}
