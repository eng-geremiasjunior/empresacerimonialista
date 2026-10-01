"use client";

// T06 · Violino ("Experiência com violino"). O desenho do dono em
// .claude/plans/modelos-de-site/handoff (Template 06): é o T05 (França)
// com cinco mudanças — capa com foto (sem vídeo), o violino que toca
// enquanto a pessoa rola, a história numa trilha horizontal de postais
// presos num varal com o arco na ponta, as cordas na lateral e as notas
// musicais no RSVP. Valores, textos e tempos são os do protótipo.
//
// Do T05 vêm (importados de ../franca, com o CSS dele escopado em
// .sm-franca — por isso a árvore daqui vive num elemento .sm-franca):
// envelope, barra do topo, capa, Bienvenue, château, programa, traje,
// contagem, galeria, boutique, padrinhos, RSVP, rodapé e os blocos sem
// desenho. Daqui: a trilha, as cordas, o som (botão da capa e pílula) e
// as notas; o CSS em violino.css, escopado em .sm-violino.
//
// A ordem e o "olho" vêm da estrutura que a noiva arruma no portal: a
// capa (envelope, barra e hero) abre, o rodapé fecha, e no meio cada
// bloco vira a seção dele:
//
//   mensagem → Bienvenue             historia → Notre histoire (trilha)
//   local → Le château               momentos → Le programme
//   dress_code → no cartão do programa (fotos à parte) ou cartão próprio
//   contagem → Compte à rebours      galeria → La galerie
//   presentes → La boutique          especiais → Nos témoins
//   rsvp → Répondez (com as notas)   hospedagem, album, playlist, mural,
//                                    texto → BlocosNoEstilo
//
// Seção sem conteúdo some, e a barra do topo só aponta para as seções que
// estão no site. Sem faixa de violino (FAIXA_DO_VIOLINO), nada de som: o
// botão da capa e a pílula não aparecem; as cordas ficam, paradas.
// Prévia e revisão: sem envelope, sem trava da rolagem, sem áudio, reveals
// visíveis, o château no quadro final, a trilha em linhas com o varal
// inteiro, as cordas no alto do site (não fixas) e a barra do presente no
// fluxo; a revisão põe o verso dos postais ao lado da frente.

import { Fragment, useRef, type MouseEvent, type ReactNode } from "react";
import type { PropsDoModelo } from "@/components/site/SiteDoEvento";
import { estruturaEfetiva, type BlocoDoSite } from "@/lib/site-blocos";
import { lerGaleria, nomesDoSite } from "@/lib/site-conteudo";
import { valoresDoPar } from "@/lib/site-pares";
import { FAMILIAS } from "@/lib/fontes-site";
import { estruturaDoModelo } from "@/components/portal/site/estrutura";
import { partesDoNome } from "@/components/site/pecas/Nomes";
import { Notas } from "@/components/site/pecas/Notas";
import { ScriptRevelar } from "@/components/site/pecas/ScriptRevelar";
import { useAbertura } from "@/components/site/pecas/useAbertura";
import { CURVA_E, MARGEM_PADRAO, movimentoReduzido, useRevelar, type RevelacoesDoModelo } from "@/components/site/pecas/useRevelar";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import type { CasalDoSite, PropsDaSecao } from "../franca/comum";
import { Envelope } from "../franca/secoes/Envelope";
import { Nav } from "../franca/secoes/Nav";
import { Hero } from "../franca/secoes/Hero";
import { Bienvenue } from "../franca/secoes/Bienvenue";
import { temHistoria } from "../franca/secoes/Postais";
import { Chateau, temLocal } from "../franca/secoes/Chateau";
import { Programa } from "../franca/secoes/Programa";
import { textoDoTraje, Traje, temTraje } from "../franca/secoes/Traje";
import { ContagemRegressiva } from "../franca/secoes/ContagemRegressiva";
import { fotosDaGaleria, Galeria } from "../franca/secoes/Galeria";
import { Boutique, temPresentes } from "../franca/secoes/Boutique";
import { Padrinhos, temPadrinhos } from "../franca/secoes/Padrinhos";
import { Rsvp } from "../franca/secoes/Rsvp";
import { Rodape } from "../franca/secoes/Rodape";
import { Trilha } from "./secoes/Trilha";
import { Cordas } from "./secoes/Cordas";
import { PilulaDoSom, SomNaCapa } from "./secoes/Som";
import { FAIXA_DO_VIOLINO, useSomDoViolino } from "./som";
import { Album, Hospedagem, Mural, Musica, temHospedagem, temTextoLivre, TextoLivre } from "./BlocosNoEstilo";
import "../franca/franca.css";
import "./violino.css";

// O reveal do T06: o mesmo do T05 — sobe 32px em 1200ms com a curva E,
// sem blur.
const REVELACOES_VIOLINO: RevelacoesDoModelo = {
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

/** O envelope (igual ao T05): o hero começa aos 2850ms e a camada sai aos 3800ms. */
const TEMPOS_DO_ENVELOPE = { heroEmMs: 2850, fimEmMs: 3800 };

export function ModeloViolino({ dados, midia, modo }: PropsDoModelo) {
  const raiz = useRef<HTMLDivElement>(null);
  const { urls } = useModoDoSite();
  const tema = dados.site?.tema ?? null;

  const nomes = nomesDoSite(dados);
  const casal: CasalDoSite = { ...partesDoNome(nomes.nome1, nomes.nome2, nomes.forma), forma: nomes.forma };

  const par = valoresDoPar(tema?.fontes, "violino");
  const abertura = useAbertura({
    ligada: tema?.abertura !== false,
    familiaDoNome: FAMILIAS[par.nf],
    ...TEMPOS_DO_ENVELOPE,
  });
  useRevelar(raiz, REVELACOES_VIOLINO, { margem: MARGEM_PADRAO });
  const som = useSomDoViolino(FAIXA_DO_VIOLINO, modo);

  const estrutura = estruturaDoModelo(estruturaEfetiva(dados.site?.estrutura), "violino");
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
        // jeito, cenas, vídeo, enquete, perguntas: o T06 não desenha
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
        return <Trilha {...p} fotoCasalUrl={null /* só fotos do balde site: a foto do casal de antes aceita troca depois da revisão (191) */} motor={som.motor} />;
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
        return <Rsvp {...p} festa={<Notas className="v-notas" />} />;
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

  // o botão do som só existe com a faixa; fora do público ele aparece
  // parado (a noiva e o dono veem a capa como ela vai ao ar)
  const comSom = !!FAIXA_DO_VIOLINO;

  return (
    <div ref={raiz} className="f-raiz sm-franca v-raiz" onClick={aoClicar}>
      <ScriptRevelar />
      <Envelope casal={casal} data={dados.evento.data} estado={abertura.estado} abrir={abertura.abrir} />
      <Nav casal={casal} links={links} modo={modo} />
      <Cordas motor={som.motor} modo={modo} />
      <Hero
        dados={dados}
        bloco={capa}
        casal={casal}
        modo={modo}
        heroLiberado={abertura.heroLiberado}
        animar={abertura.animar}
      >
        {comSom ? <SomNaCapa som={som} modo={modo} /> : null}
      </Hero>
      {comConteudo.map((b, i) => (
        <Fragment key={b.id}>{secao(b, comConteudo[i - 1])}</Fragment>
      ))}
      <Rodape dados={dados} bloco={rodape} casal={casal} modo={modo} />
      <PilulaDoSom som={som} />
    </div>
  );
}
