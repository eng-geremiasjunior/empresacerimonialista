"use client";

// 5 · Nossa história (#historia), fundo alt: "Notre histoire", o título e,
// numa grade auto-fit minmax(min(100%,250px),1fr), um cartão-postal por
// marco (3/4.3, girados −2.5/1.8/−1.2/2.4deg; no hover endireitam e sobem
// 8px em .7s). Frente: a foto, o selo postal com as iniciais, o carimbo
// redondo (cidade e ano, −14deg) e a legenda. Verso: "Capítulo N", o selo
// tracejado vazio, o título, o texto em itálico, as linhas de endereço e
// "Cidade · Ano".
//
// O giro é o do T06 (o README recomenda): o cartão faz
// perspective(1400px) rotateY(0↔180deg) em 1.1s e frente e verso trocam
// de opacidade de uma vez aos .5s — sem preserve-3d nem backface. O
// Postal é exportado para a trilha do T06.
//
// Sem foto (público e revisão), o postal é só o verso, parado, e o
// "Toque para virar" só aparece se algum postal vira. Revisão do
// dono: o verso ao lado da frente, sem gesto. Sem marcos: o texto único
// de hoje (título e história) com a foto do casal num postal.

import { useState, type CSSProperties } from "react";
import { lerHistoria, type Marco } from "@/lib/site-conteudo";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { mostraFoto, useUrlDaFoto, type CasalDoSite, type PropsDaSecao } from "../comum";

/** As inclinações do desenho, em ciclo. */
export const GIROS_DOS_POSTAIS = [-2.5, 1.8, -1.2, 2.4];

export function temHistoria(p: Pick<PropsDaSecao, "dados" | "bloco">): boolean {
  const s = p.dados.site;
  return !!(s?.historia || s?.historia_titulo || lerHistoria(p.bloco.conteudo).marcos.length);
}

function Frente({ marco, casal, url }: { marco: Marco; casal: CasalDoSite; url: string | null }) {
  const temCarimbo = !!(marco.cidade || marco.ano);
  return (
    <div className="f-postal-face f-postal-frente">
      <div className="f-postal-foto">
        <EspacoDeFoto url={url} forma="retangulo" proporcao="tela" />
        {(casal.i1 || casal.i2) && (
          <span className="f-postal-selo" aria-hidden>
            <span className="f-postal-selo-miolo">
              {casal.i1}
              {casal.i2}
            </span>
          </span>
        )}
        {temCarimbo && (
          <span className="f-postal-carimbo" aria-hidden>
            {marco.cidade && <span>{marco.cidade}</span>}
            {marco.ano && <span>{marco.ano}</span>}
          </span>
        )}
      </div>
      <div className="f-postal-legenda">
        <span className="f-postal-cidade">{marco.cidade || marco.titulo}</span>
        {marco.ano && <span className="f-postal-ano">{marco.ano}</span>}
      </div>
    </div>
  );
}

function Verso({ marco, n, className }: { marco: Marco; n: number; className?: string }) {
  const pe = [marco.cidade, marco.ano].filter(Boolean).join(" · ");
  return (
    <div className={`f-postal-face f-postal-verso ${className ?? ""}`}>
      <div className="f-postal-verso-topo">
        <span className="f-postal-capitulo">Capítulo {n}</span>
        <span className="f-postal-selo-vazio" aria-hidden />
      </div>
      {marco.titulo && <div className="f-postal-titulo">{marco.titulo}</div>}
      {marco.texto && <p className="f-postal-texto">{marco.texto}</p>}
      <div className="f-postal-pe">
        <span className="f-postal-linha" aria-hidden />
        <span className="f-postal-linha" aria-hidden />
        {pe && <span className="f-postal-onde">{pe}</span>}
      </div>
    </div>
  );
}

/**
 * Um cartão-postal que vira ao toque. `giro` é a inclinação em graus.
 * Na revisão, devolve a frente e o verso lado a lado (dois cartões).
 */
export function Postal({
  marco,
  n,
  casal,
  giro,
  className,
  estilo,
}: {
  marco: Marco;
  /** o número do capítulo */
  n: number;
  casal: CasalDoSite;
  giro: number;
  className?: string;
  estilo?: CSSProperties;
}) {
  const { modo } = useModoDoSite();
  const resolver = useUrlDaFoto();
  const url = resolver(marco.foto);
  const [virado, setVirado] = useState(false);
  const comFrente = mostraFoto(url, modo);
  const inclinacao = { "--f-giro": `${giro}deg` } as CSSProperties;

  // sem foto: só o verso, parado
  if (!comFrente) {
    return (
      <div className={`f-postal ${className ?? ""}`} style={{ ...inclinacao, ...estilo }}>
        <div className="f-postal-cartao">
          <Verso marco={marco} n={n} className="f-postal-verso--so" />
        </div>
      </div>
    );
  }

  // revisão: a frente e o verso lado a lado, sem gesto
  if (modo === "revisao") {
    return (
      <>
        <div className={`f-postal ${className ?? ""}`} style={{ ...inclinacao, ...estilo }}>
          <div className="f-postal-cartao">
            <Frente marco={marco} casal={casal} url={url} />
          </div>
        </div>
        <div className={`f-postal ${className ?? ""}`} style={{ ...inclinacao, ...estilo }}>
          <div className="f-postal-cartao">
            <Verso marco={marco} n={n} className="f-postal-verso--so" />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`f-postal ${className ?? ""}`} style={{ ...inclinacao, ...estilo }}>
      <button
        type="button"
        className="f-postal-cartao f-postal-botao"
        aria-pressed={virado}
        onClick={() => setVirado((v) => !v)}
      >
        <span className="f-postal-giro" data-virado={virado ? "" : undefined}>
          <span className="f-postal-lado f-postal-lado--frente" aria-hidden={virado}>
            <Frente marco={marco} casal={casal} url={url} />
          </span>
          <span className="f-postal-lado f-postal-lado--verso" aria-hidden={!virado}>
            <Verso marco={marco} n={n} />
          </span>
        </span>
      </button>
    </div>
  );
}

export function Historia({ dados, bloco, casal, ancora, modo, fotoCasalUrl }: PropsDaSecao & { fotoCasalUrl: string | null }) {
  const site = dados.site;
  const marcos = lerHistoria(bloco.conteudo).marcos;
  const resolver = useUrlDaFoto();
  const comFrente = marcos.map((m) => mostraFoto(resolver(m.foto), modo));
  // quantos cartões saem (na revisão, o marco com foto vira dois), até 4 por linha
  const cartoes = comFrente.reduce((n, f) => n + (f && modo === "revisao" ? 2 : 1), 0);
  const nPorLinha = Math.max(1, Math.min(4, cartoes));
  const primeiroAno = marcos.find((m) => m.ano)?.ano;
  const titulo = site?.historia_titulo || (primeiroAno ? `Tudo começou em ${primeiroAno}...` : "");

  return (
    <section id={ancora} className="f-secao f-alt f-historia">
      <div className="f-historia-miolo">
        <div className="f-cabeca">
          <div data-revelar="up" className="f-eyebrow">
            Notre histoire
          </div>
          {titulo && (
            <h2 data-revelar="up" data-atraso="120" className="f-h2 f-h2--balance">
              {titulo}
            </h2>
          )}
          {comFrente.some(Boolean) && modo !== "revisao" && (
            <p data-revelar="up" data-atraso="200" className="f-cabeca-p">
              Cada cartão-postal guarda um capítulo. Toque para virar.
            </p>
          )}
          {marcos.length === 0 && site?.historia && (
            <p data-revelar="up" data-atraso="200" className="f-cabeca-p f-historia-texto">
              {site.historia}
            </p>
          )}
        </div>

        {marcos.length > 0 && (
          <div
            className={`f-postais ${modo === "revisao" ? "f-postais--revisao" : ""}`}
            style={{ "--f-n": nPorLinha } as CSSProperties}
          >
            {marcos.map((m, i) => (
              <div key={i} data-revelar="up" data-atraso={i * 110 || undefined} className="f-postais-item">
                <Postal marco={m} n={i + 1} casal={casal} giro={GIROS_DOS_POSTAIS[i % GIROS_DOS_POSTAIS.length]} />
              </div>
            ))}
          </div>
        )}

        {marcos.length === 0 && mostraFoto(fotoCasalUrl, modo) && (
          <div data-revelar="up" data-atraso="260" className="f-historia-unica">
            <div className="f-postal" style={{ "--f-giro": "-2.5deg" } as CSSProperties}>
              <div className="f-postal-cartao">
                <div className="f-postal-face f-postal-frente">
                  <div className="f-postal-foto">
                    <EspacoDeFoto url={fotoCasalUrl} forma="retangulo" proporcao="tela" />
                    {(casal.i1 || casal.i2) && (
                      <span className="f-postal-selo" aria-hidden>
                        <span className="f-postal-selo-miolo">
                          {casal.i1}
                          {casal.i2}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
