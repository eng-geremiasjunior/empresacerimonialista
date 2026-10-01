"use client";

// T05 · França (envelope de cera, cartões-postais, château). O desenho do
// dono em .claude/plans/modelos-de-site/handoff (Template 05): valores,
// textos e tempos são os do protótipo; o markup de cada seção está em
// secoes/ e o CSS, escopado em .sm-franca, em franca.css.
//
// A ordem e o "olho" vêm da estrutura que a noiva arruma no portal: a
// capa (envelope, barra e hero) abre, o rodapé fecha, e no meio cada
// bloco vira a seção dele:
//
//   mensagem → Bienvenue             historia → Notre histoire (postais)
//   local → Le château               momentos → Le programme
//   dress_code → no cartão do programa (fotos à parte) ou cartão próprio
//   contagem → Compte à rebours      galeria → La galerie
//   presentes → La boutique          especiais → Nos témoins
//   rsvp → Répondez s'il vous plaît  hospedagem, album, playlist, mural,
//                                    texto → BlocosNoEstilo
//
// Seção sem conteúdo some, e a barra do topo só aponta para as seções que
// estão no site. Modo prévia/revisão: sem envelope, sem trava da rolagem,
// reveals visíveis, o château no quadro final e a barra do presente no
// fluxo; a revisão vira os postais (verso ao lado da frente).
//
// O T06 (Violino) importa daqui envelope, château, programa, contagem,
// galeria, boutique, RSVP, padrinhos e rodapé; o CSS vale para quem
// estiver dentro de um elemento .sm-franca.

import { Fragment, useRef, type MouseEvent, type ReactNode } from "react";
import type { PropsDoModelo } from "@/components/site/SiteDoEvento";
import { estruturaEfetiva, type BlocoDoSite } from "@/lib/site-blocos";
import { lerGaleria, nomesDoSite } from "@/lib/site-conteudo";
import { valoresDoPar } from "@/lib/site-pares";
import { FAMILIAS } from "@/lib/fontes-site";
import { estruturaDoModelo } from "@/components/portal/site/estrutura";
import { partesDoNome } from "@/components/site/pecas/Nomes";
import { ScriptRevelar } from "@/components/site/pecas/ScriptRevelar";
import { useAbertura } from "@/components/site/pecas/useAbertura";
import { CURVA_E, MARGEM_PADRAO, movimentoReduzido, useRevelar, type RevelacoesDoModelo } from "@/components/site/pecas/useRevelar";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import type { CasalDoSite, PropsDaSecao } from "./comum";
import { Envelope } from "./secoes/Envelope";
import { Nav } from "./secoes/Nav";
import { Hero } from "./secoes/Hero";
import { Bienvenue } from "./secoes/Bienvenue";
import { Historia, temHistoria } from "./secoes/Postais";
import { Chateau, temLocal } from "./secoes/Chateau";
import { Programa } from "./secoes/Programa";
import { textoDoTraje, Traje, temTraje } from "./secoes/Traje";
import { ContagemRegressiva } from "./secoes/ContagemRegressiva";
import { fotosDaGaleria, Galeria } from "./secoes/Galeria";
import { Boutique, temPresentes } from "./secoes/Boutique";
import { Padrinhos, temPadrinhos } from "./secoes/Padrinhos";
import { Rsvp } from "./secoes/Rsvp";
import { Rodape } from "./secoes/Rodape";
import { Album, Hospedagem, Mural, Musica, temHospedagem, temTextoLivre, TextoLivre } from "./BlocosNoEstilo";
import "./franca.css";

// O reveal do T05: sobe 32px em 1200ms com a curva E, sem blur.
export const REVELACOES_FRANCA: RevelacoesDoModelo = {
  up: {
    quadros: [
      { opacity: 0, transform: "translateY(32px)" },
      { opacity: 1, transform: "none" },
    ],
    duracao: 1200,
    curva: CURVA_E,
  },
};

/** As âncoras da barra e dos botões: só o primeiro bloco de cada tipo. */
const ANCORAS: Partial<Record<BlocoDoSite["tipo"], string>> = {
  historia: "historia",
  local: "local",
  momentos: "dia",
  galeria: "galeria",
  presentes: "presentes",
  rsvp: "rsvp",
};

/** O envelope: o hero começa aos 2850ms e a camada sai aos 3800ms. */
export const TEMPOS_DO_ENVELOPE = { heroEmMs: 2850, fimEmMs: 3800 };

export function ModeloFranca({ dados, midia, modo }: PropsDoModelo) {
  const raiz = useRef<HTMLDivElement>(null);
  const { urls } = useModoDoSite();
  const tema = dados.site?.tema ?? null;

  const nomes = nomesDoSite(dados);
  const casal: CasalDoSite = { ...partesDoNome(nomes.nome1, nomes.nome2, nomes.forma), forma: nomes.forma };

  const par = valoresDoPar(tema?.fontes, "franca");
  const abertura = useAbertura({
    ligada: tema?.abertura !== false,
    familiaDoNome: FAMILIAS[par.nf],
    ...TEMPOS_DO_ENVELOPE,
  });
  useRevelar(raiz, REVELACOES_FRANCA, { margem: MARGEM_PADRAO });

  const estrutura = estruturaDoModelo(estruturaEfetiva(dados.site?.estrutura), "franca");
  const capa = estrutura.find((b) => b.tipo === "capa") ?? { id: "capa", tipo: "capa" as const };
  const rodape = estrutura.find((b) => b.tipo === "rodape") ?? { id: "rodape", tipo: "rodape" as const };
  const resolver = (c: string) => urls[c] ?? null;

  const meio = estrutura.filter((b) => b.tipo !== "capa" && b.tipo !== "rodape" && b.visivel !== false);
  const comConteudo = meio.filter((b) => temConteudo(b));
  const tipos = new Set(comConteudo.map((b) => b.tipo));
  const links = {
    historia: tipos.has("historia"),
    local: tipos.has("local"),
    dia: tipos.has("momentos"),
    presentes: tipos.has("presentes"),
    rsvp: tipos.has("rsvp") && dados.rsvp.aberto,
  };

  // o traje vai dentro do cartão do programa quando os dois estão no site
  const trajeVisivel = meio.some((b) => b.tipo === "dress_code");
  const traje = textoDoTraje(dados);
  const trajeNoPrograma = tipos.has("momentos") && trajeVisivel && !!(traje.titulo || traje.texto);

  function temConteudo(b: BlocoDoSite): boolean {
    const p = { dados, bloco: b, modo };
    switch (b.tipo) {
      case "mensagem":
        // só a mensagem que o casal escreveu; na prévia, o texto do desenho
        return !!dados.site?.mensagem?.trim() || (modo === "previa" && /^\d{4}-\d{2}-\d{2}/.test(dados.evento.data));
      case "historia":
        return temHistoria(p);
      case "local":
        return temLocal(p);
      case "momentos":
      case "contagem":
        return /^\d{4}-\d{2}-\d{2}/.test(dados.evento.data);
      case "dress_code":
        return temTraje({ ...p, resolver });
      case "galeria":
        return fotosDaGaleria(lerGaleria(b.conteudo).fotos, modo, resolver).length > 0;
      case "presentes":
        return temPresentes(p);
      case "especiais":
        return temPadrinhos(p);
      case "rsvp":
        return true;
      case "hospedagem":
        return temHospedagem(dados);
      case "album":
        return !!dados.blocos?.album;
      case "playlist":
        return !!dados.blocos?.playlist;
      case "mural":
        return !!dados.blocos?.recados;
      case "texto":
        return temTextoLivre(b);
      default:
        // jeito, cenas, vídeo, enquete, perguntas: o T05 não desenha
        return false;
    }
  }

  const usadas = new Set<string>();
  function ancoraDe(b: BlocoDoSite): string | undefined {
    const a = ANCORAS[b.tipo];
    if (!a || usadas.has(a)) return undefined;
    usadas.add(a);
    return a;
  }

  function secao(b: BlocoDoSite, anterior: BlocoDoSite | undefined): ReactNode {
    const p: PropsDaSecao = { dados, bloco: b, casal, modo, ancora: ancoraDe(b) };
    switch (b.tipo) {
      case "mensagem":
        return <Bienvenue {...p} />;
      case "historia":
        return <Historia {...p} fotoCasalUrl={midia.fotoCasalUrl} />;
      case "local":
        return <Chateau {...p} />;
      case "momentos":
        return <Programa {...p} traje={trajeNoPrograma ? traje : null} />;
      case "dress_code":
        return <Traje {...p} noPrograma={trajeNoPrograma} colada={anterior?.tipo === "momentos"} />;
      case "contagem":
        return <ContagemRegressiva {...p} />;
      case "galeria":
        return <Galeria {...p} fotos={fotosDaGaleria(lerGaleria(b.conteudo).fotos, modo, resolver)} />;
      case "presentes":
        return <Boutique {...p} />;
      case "especiais":
        return <Padrinhos {...p} />;
      case "rsvp":
        return <Rsvp {...p} />;
      case "hospedagem":
        return <Hospedagem dados={dados} />;
      case "album":
        return <Album hash={dados.rsvp.hash} fotos={midia.fotosAlbum} />;
      case "playlist":
        return <Musica hash={dados.rsvp.hash} />;
      case "mural":
        return <Mural hash={dados.rsvp.hash} recados={dados.recados ?? []} />;
      case "texto":
        return <TextoLivre bloco={b} />;
      default:
        return null;
    }
  }

  // âncoras com rolagem suave (o html{scroll-behavior:smooth} do protótipo
  // valeria para a página inteira, inclusive o portal em volta da prévia)
  function aoClicar(e: MouseEvent<HTMLDivElement>) {
    const a = (e.target as HTMLElement).closest?.("a[href^='#']");
    if (!a || modo !== "publico") return;
    const alvo = document.getElementById(a.getAttribute("href")!.slice(1));
    if (!alvo) return;
    e.preventDefault();
    alvo.scrollIntoView({ behavior: movimentoReduzido() ? "auto" : "smooth", block: "start" });
  }

  return (
    <div ref={raiz} className="f-raiz" onClick={aoClicar}>
      <ScriptRevelar />
      <Envelope casal={casal} data={dados.evento.data} estado={abertura.estado} abrir={abertura.abrir} />
      <Nav casal={casal} links={links} modo={modo} />
      <Hero
        dados={dados}
        bloco={capa}
        casal={casal}
        modo={modo}
        heroLiberado={abertura.heroLiberado}
        animar={abertura.animar}
      />
      {comConteudo.map((b, i) => (
        <Fragment key={b.id}>{secao(b, comConteudo[i - 1])}</Fragment>
      ))}
      <Rodape dados={dados} bloco={rodape} casal={casal} modo={modo} />
    </div>
  );
}
