"use client";

// T04 · Monograma. O desenho em .claude/plans/modelos-de-site/handoff
// (Template 04): valores, textos e tempos são os do protótipo. A base
// visual e a paleta são as do T03 (Cartões); o par padrão é o Maison.
//
// Só do T04 (secoes/ daqui):
//   · a abertura automática: faixas em ink, o monograma no anel que se
//     desenha e a data; as faixas sobem do centro para fora;
//   · o hero de borda a borda (100svh, raio só embaixo), com o cabeçalho
//     sobre a foto e o parallax;
//   · "Nossos momentos" (bloco "cenas"): o cartão preso em que as fotos
//     sobem uma sobre a outra e as frases trocam com a rolagem.
// O resto (dock, pedido, destaques, onda, grande dia e local, músicas,
// presentes, galeria, traje, padrinhos, RSVP, rodapé e os blocos sem
// desenho) é o mesmo do T03, importado de cartoes/secoes; a ordem, o olho
// e o que some sem conteúdo estão em cartoes/secoes/Montagem.tsx, que
// recebe as cenas pelo `extra`. A foto do local não tem o zoom lento (o
// T04 tirou).
//
// Modo prévia/revisão: sem abertura, sem trava da rolagem, sem parallax,
// reveals visíveis, o dock e a barra do presente no fluxo; as cenas no
// quadro final (prévia) ou espalhadas uma a uma (revisão).

import { useRef, type MouseEvent } from "react";
import type { PropsDoModelo } from "@/components/site/SiteDoEvento";
import { nomesDoSite } from "@/lib/site-conteudo";
import { valoresDoPar } from "@/lib/site-pares";
import { FAMILIAS } from "@/lib/fontes-site";
import { partesDoNome } from "@/components/site/pecas/Nomes";
import { ScriptRevelar } from "@/components/site/pecas/ScriptRevelar";
import { useAbertura } from "@/components/site/pecas/useAbertura";
import { CURVA_E, movimentoReduzido, useRevelar, type RevelacoesDoModelo } from "@/components/site/pecas/useRevelar";
import type { CasalDoSite } from "@/components/site/modelos/cartoes/comum";
import { Dock } from "@/components/site/modelos/cartoes/secoes/Dock";
import { fotoDaCapa } from "@/components/site/modelos/cartoes/secoes/Hero";
import { MeioDosCartoes, planoDosCartoes, TopoDosCartoes } from "@/components/site/modelos/cartoes/secoes/Montagem";
import { Rodape } from "@/components/site/modelos/cartoes/secoes/Rodape";
import { Abertura, FIM_DA_ABERTURA, HERO_DA_ABERTURA } from "./secoes/Abertura";
import { Hero } from "./secoes/Hero";
import { Cenas, cenasDoSite } from "./secoes/Cenas";
import "./monograma.css";

// O reveal do T04 é o do T03: "up" sobe 34px com scale .985 em 1100ms;
// "img" (a galeria) traz a camada [data-zoom] de opacidade 0, scale 1.18
// e blur 8px em 1800ms. A margem é a do README (0 0 -8% 0).
const REVELACOES: RevelacoesDoModelo = {
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

/** Âncoras com rolagem suave só dentro do site (o html{scroll-behavior}
 *  do protótipo valeria para a página inteira). */
function rolarParaAncora(e: MouseEvent<HTMLElement>, modo: string) {
  const a = (e.target as HTMLElement).closest?.("a[href^='#']");
  if (!a || modo !== "publico") return;
  const alvo = document.getElementById(a.getAttribute("href")!.slice(1));
  if (!alvo) return;
  e.preventDefault();
  alvo.scrollIntoView({ behavior: movimentoReduzido() ? "auto" : "smooth", block: "start" });
}

export function ModeloMonograma({ dados, midia, modo }: PropsDoModelo) {
  const raiz = useRef<HTMLDivElement>(null);
  const tema = dados.site?.tema ?? null;

  const nomes = nomesDoSite(dados);
  const casal: CasalDoSite = { ...partesDoNome(nomes.nome1, nomes.nome2, nomes.forma), forma: nomes.forma };

  const par = valoresDoPar(tema?.fontes, "monograma");
  const abertura = useAbertura({
    ligada: tema?.abertura !== false,
    familiaDoNome: FAMILIAS[par.nf],
    heroEmMs: HERO_DA_ABERTURA,
    fimEmMs: FIM_DA_ABERTURA,
    automatica: true,
  });
  useRevelar(raiz, REVELACOES);

  const resolver = (c: string) => midia.urls[c] ?? null;
  const plano = planoDosCartoes({
    dados,
    modo,
    modelo: "monograma",
    resolver,
    temExtra: (b) => b.tipo === "cenas" && cenasDoSite(b.conteudo, modo, resolver).length > 0,
  });
  const capa = fotoDaCapa({ dados, bloco: plano.capa });

  return (
    <div ref={raiz} className="k-casca m-casca" data-modo={modo} onClick={(e) => rolarParaAncora(e, modo)}>
      <ScriptRevelar />
      <Abertura casal={casal} data={dados.evento.data} estado={abertura.estado} animar={abertura.animar} />
      <Hero
        dados={dados}
        bloco={plano.capa}
        casal={casal}
        modo={modo}
        heroLiberado={abertura.heroLiberado}
        animar={abertura.animar}
        comContagem={plano.comContagem}
        comRsvp={plano.comRsvp}
      />
      <div className="k-pagina">
        <Dock itens={plano.dock} modo={modo} />
        <TopoDosCartoes plano={plano} dados={dados} />
        <MeioDosCartoes
          plano={plano}
          dados={dados}
          midia={midia}
          casal={casal}
          modo={modo}
          extra={(p) => (p.bloco.tipo === "cenas" ? <Cenas {...p} /> : null)}
        />
        <Rodape dados={dados} bloco={plano.rodape} casal={casal} modo={modo} foto={capa} />
      </div>
    </div>
  );
}
