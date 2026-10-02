"use client";

// T03 · Cartões ("Portal" no desenho do dono; o slug é cartoes porque
// "portal" colide com o nome do produto). O desenho em
// .claude/plans/modelos-de-site/handoff (Template 03): valores, textos e
// tempos são os do protótipo. Cartões arredondados sobre o fundo bege, o
// dock de ícones preso no alto e a paleta pêssego/verde fixa.
//
// Só do T03: a abertura com a foto ("Toque na foto para entrar"), o
// cabeçalho sem caixa e o hero em cartão. O resto (dock, pedido,
// destaques, onda, grande dia e local, músicas, presentes, galeria,
// traje, padrinhos, RSVP, rodapé e os blocos sem desenho) mora em
// secoes/ e é o mesmo do T04 (Monograma), que importa daqui. A ordem,
// o olho e o que some sem conteúdo estão em secoes/Montagem.tsx.
//
// Modo prévia/revisão: sem abertura, sem trava da rolagem, reveals
// visíveis, o dock e a barra do presente no fluxo (nada preso nem fixo);
// a revisão abre todos os capítulos da história.

import { useRef, type MouseEvent } from "react";
import type { PropsDoModelo } from "@/components/site/SiteDoEvento";
import { lerCapa, nomesDoSite } from "@/lib/site-conteudo";
import { valoresDoPar } from "@/lib/site-pares";
import { FAMILIAS } from "@/lib/fontes-site";
import { partesDoNome } from "@/components/site/pecas/Nomes";
import { ScriptRevelar } from "@/components/site/pecas/ScriptRevelar";
import { useAbertura } from "@/components/site/pecas/useAbertura";
import { CURVA_E, movimentoReduzido, useRevelar, type RevelacoesDoModelo } from "@/components/site/pecas/useRevelar";
import type { CasalDoSite } from "./comum";
import { Abertura } from "./secoes/Abertura";
import { Cabecalho } from "./secoes/Cabecalho";
import { fotoDaCapa, Hero } from "./secoes/Hero";
import { Dock } from "./secoes/Dock";
import { MeioDosCartoes, planoDosCartoes, TopoDosCartoes } from "./secoes/Montagem";
import { Rodape } from "./secoes/Rodape";
import "./cartoes.css";

// O reveal dos Cartões: "up" sobe 34px com scale .985 em 1100ms; "img"
// (a galeria) traz a camada [data-zoom] de opacidade 0, scale 1.18 e
// blur 8px em 1800ms.
export const REVELACOES_DOS_CARTOES: RevelacoesDoModelo = {
  up: {
    quadros: [
      { opacity: 0, transform: "translateY(34px) scale(.985)" },
      { opacity: 1, transform: "none" },
    ],
    duracao: 1100,
    curva: CURVA_E,
  },
  img: {
    quadros: [
      { opacity: 0, transform: "scale(1.18)", filter: "blur(8px)" },
      { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
    ],
    duracao: 1800,
    curva: CURVA_E,
    alvo: "[data-zoom]",
  },
};

/** Âncoras com rolagem suave (o html{scroll-behavior:smooth} do
 *  protótipo valeria para a página inteira, inclusive o portal em volta
 *  da prévia). */
export function rolarParaAncora(e: MouseEvent<HTMLElement>, modo: string) {
  const a = (e.target as HTMLElement).closest?.("a[href^='#']");
  if (!a || modo !== "publico") return;
  const alvo = document.getElementById(a.getAttribute("href")!.slice(1));
  if (!alvo) return;
  e.preventDefault();
  alvo.scrollIntoView({ behavior: movimentoReduzido() ? "auto" : "smooth", block: "start" });
}

export function ModeloCartoes({ dados, midia, modo }: PropsDoModelo) {
  const raiz = useRef<HTMLDivElement>(null);
  const tema = dados.site?.tema ?? null;

  const nomes = nomesDoSite(dados);
  const casal: CasalDoSite = { ...partesDoNome(nomes.nome1, nomes.nome2, nomes.forma), forma: nomes.forma };

  const par = valoresDoPar(tema?.fontes, "cartoes");
  const abertura = useAbertura({
    ligada: tema?.abertura !== false,
    familiaDoNome: FAMILIAS[par.nf],
    heroEmMs: 500,
    fimEmMs: 1300,
  });
  // a margem do README e do protótipo do T03: 0 0 -8% 0
  useRevelar(raiz, REVELACOES_DOS_CARTOES);

  const plano = planoDosCartoes({
    dados,
    modo,
    modelo: "cartoes",
    resolver: (c) => midia.urls[c] ?? null,
  });
  const capa = fotoDaCapa({ dados, bloco: plano.capa });

  return (
    <div ref={raiz} className="k-casca" data-modo={modo} onClick={(e) => rolarParaAncora(e, modo)}>
      <ScriptRevelar />
      <Abertura
        casal={casal}
        data={dados.evento.data}
        foto={capa}
        mascara={lerCapa(plano.capa.conteudo).mascara}
        estado={abertura.estado}
        abrir={abertura.abrir}
        animar={abertura.animar}
      />
      <div className="k-pagina">
        <Cabecalho casal={casal} data={dados.evento.data} comRsvp={plano.comRsvp} />
        <Hero
          dados={dados}
          bloco={plano.capa}
          casal={casal}
          modo={modo}
          heroLiberado={abertura.heroLiberado}
          animar={abertura.animar}
          comContagem={plano.comContagem}
        />
        <Dock itens={plano.dock} modo={modo} />
        <TopoDosCartoes plano={plano} dados={dados} />
        <MeioDosCartoes plano={plano} dados={dados} midia={midia} casal={casal} modo={modo} zoomLento />
        <Rodape dados={dados} bloco={plano.rodape} casal={casal} modo={modo} foto={capa} />
      </div>
    </div>
  );
}
