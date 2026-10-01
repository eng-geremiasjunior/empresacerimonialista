// Os nomes do casal nas 3 formas que a noiva escolhe: "nomes" (Marina &
// João), "iniciais" (M & J) e "iniciais-nomes" (o monograma em cima, os
// nomes embaixo). O "&" leva --sf-amp-estilo (itálico em alguns pares do
// T01). Faltando um nome, sai só o outro, sem "&" solto.
//
// Quem compõe o próprio desenho (o selo do T05, a abertura do T02) usa
// partesDoNome e monta como quiser; o <Nomes> é a composição de sempre,
// vestida por classe.

import type { ElementType } from "react";
import { hashtag as montarHashtag, iniciais, type FormaDoNome } from "@/lib/site-conteudo";
import "./pecas.css";

export type PartesDoNome = {
  nome1: string;
  nome2: string;
  i1: string;
  i2: string;
  /** os dois nomes existem: há "&" */
  dois: boolean;
  mostraIniciais: boolean;
  mostraNomes: boolean;
  hashtag: string;
};

export function partesDoNome(nome1: string, nome2: string, forma: FormaDoNome): PartesDoNome {
  const n1 = nome1.trim();
  const n2 = nome2.trim();
  return {
    nome1: n1,
    nome2: n2,
    i1: iniciais(n1),
    i2: iniciais(n2),
    dois: !!n1 && !!n2,
    mostraIniciais: forma !== "nomes",
    mostraNomes: forma !== "iniciais",
    hashtag: montarHashtag(n1, n2),
  };
}

export type ClassesDosNomes = {
  raiz?: string;
  nome?: string;
  amp?: string;
  iniciais?: string;
  inicial?: string;
  /** os nomes embaixo do monograma, no "iniciais-nomes" */
  nomesMenores?: string;
  hashtag?: string;
};

function Amp({ className }: { className?: string }) {
  return <span className={`sm-amp ${className ?? ""}`}>&amp;</span>;
}

export function Nomes({
  nome1,
  nome2,
  forma,
  como: Tag = "h1",
  classes = {},
  comHashtag = false,
}: {
  nome1: string;
  nome2: string;
  forma: FormaDoNome;
  /** a tag da raiz: h1 no hero, p ou div no resto */
  como?: ElementType;
  classes?: ClassesDosNomes;
  comHashtag?: boolean;
}) {
  const p = partesDoNome(nome1, nome2, forma);
  if (!p.nome1 && !p.nome2) return null;

  const monograma = (
    // as letras são desenho: o leitor de tela ouve os nomes
    <span className={classes.iniciais} aria-hidden>
      {p.i1 && <span className={classes.inicial}>{p.i1}</span>}
      {p.dois && <Amp className={classes.amp} />}
      {p.i2 && <span className={classes.inicial}>{p.i2}</span>}
    </span>
  );

  const nomes = (
    <>
      {p.nome1 && <span className={classes.nome}>{p.nome1}</span>}
      {p.dois && (
        <>
          {" "}
          <Amp className={classes.amp} />{" "}
        </>
      )}
      {p.nome2 && <span className={classes.nome}>{p.nome2}</span>}
    </>
  );

  return (
    <>
      <Tag className={classes.raiz}>
        {forma === "nomes" && nomes}
        {forma === "iniciais" && (
          <>
            {monograma}
            <span style={ESCONDIDO}>{[p.nome1, p.nome2].filter(Boolean).join(" e ")}</span>
          </>
        )}
        {forma === "iniciais-nomes" && (
          <>
            {monograma}
            <span className={classes.nomesMenores}>{nomes}</span>
          </>
        )}
      </Tag>
      {comHashtag && p.hashtag && <p className={classes.hashtag}>{p.hashtag}</p>}
    </>
  );
}

const ESCONDIDO = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;
