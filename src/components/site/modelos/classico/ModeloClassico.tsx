"use client";

// T01 · Clássico editorial (abertura em portas). O desenho do dono em
// .claude/plans/modelos-de-site/handoff (Template 01): valores, textos e
// tempos são os do protótipo; o markup de cada seção está em secoes/ e o
// CSS, escopado em .sm-classico, em classico.css.
//
// A ordem e o "olho" vêm da estrutura que a noiva arruma no portal: a
// capa (abertura, barra e hero) abre, o rodapé (hashtag e rodapé) fecha,
// e no meio cada bloco vira a seção dele:
//
//   historia → Nossa história        momentos → O grande dia
//   contagem → Contagem              local → Localização
//   dress_code → Dress code          rsvp → Confirmação
//   presentes → Presentes            jeito → Nosso jeito
//   galeria → Galeria                especiais → Padrinhos
//   mensagem → Recado                hospedagem, album, playlist, mural,
//                                    texto → BlocosNoEstilo
//
// Seção sem conteúdo some, e a barra do topo só aponta para as seções que
// estão no site. Modo prévia/revisão: sem abertura, sem trava da rolagem,
// reveals visíveis, cenas no quadro final e a barra parada no alto.

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
import { CURVA_E, movimentoReduzido, useRevelar, type RevelacoesDoModelo } from "@/components/site/pecas/useRevelar";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import type { CasalDoSite, PropsDaSecao } from "./comum";
import { Abertura } from "./secoes/Abertura";
import { Nav } from "./secoes/Nav";
import { Hero } from "./secoes/Hero";
import { Historia, temHistoria } from "./secoes/Historia";
import { GrandeDia } from "./secoes/GrandeDia";
import { ContagemRegressiva } from "./secoes/ContagemRegressiva";
import { Local, temLocal } from "./secoes/Local";
import { Traje, temTraje } from "./secoes/Traje";
import { Rsvp } from "./secoes/Rsvp";
import { Presentes, temPresentes } from "./secoes/Presentes";
import { Jeito, temJeito } from "./secoes/Jeito";
import { fotosDaGaleria, Galeria } from "./secoes/Galeria";
import { Padrinhos, temPadrinhos } from "./secoes/Padrinhos";
import { Recado, temRecado } from "./secoes/Recado";
import { Hashtag } from "./secoes/Hashtag";
import { Rodape } from "./secoes/Rodape";
import { Album, Hospedagem, Mural, Musica, temHospedagem, temTextoLivre, TextoLivre } from "./BlocosNoEstilo";
import "./classico.css";

// O reveal do T01: "up" sobe 30px e desfoca 6px em 1300ms; "img" é a
// cortina (clip-path de baixo para cima até 62%) com o zoom de 1.28 que
// assenta, em 2600ms, na camada [data-zoom].
const REVELACOES: RevelacoesDoModelo = {
  up: {
    quadros: [
      { opacity: 0, transform: "translateY(30px)", filter: "blur(6px)" },
      { opacity: 1, transform: "none", filter: "blur(0)" },
    ],
    duracao: 1300,
    curva: CURVA_E,
  },
  img: {
    quadros: [
      { clipPath: "inset(100% 0 0 0)", transform: "scale(1.28)" },
      { clipPath: "inset(0% 0 0 0)", offset: 0.62 },
      { clipPath: "inset(0% 0 0 0)", transform: "scale(1)" },
    ],
    duracao: 2600,
    curva: CURVA_E,
    alvo: "[data-zoom]",
  },
};

/** O protótipo usa -10% (o README diz -8%). */
const MARGEM_T01 = "0px 0px -10% 0px";

/** As âncoras da barra e dos botões: só o primeiro bloco de cada tipo. */
const ANCORAS: Partial<Record<BlocoDoSite["tipo"], string>> = {
  historia: "historia",
  momentos: "dia",
  local: "local",
  rsvp: "rsvp",
  presentes: "presentes",
};

/** Seções de fundo bg: a galeria que vem logo depois cola nelas (o
 *  desenho tira o respiro de cima da galeria depois do "Nosso jeito"). */
const FUNDO_BG = new Set(["historia", "local", "rsvp", "jeito", "mensagem"]);

export function ModeloClassico({ dados, midia, modo }: PropsDoModelo) {
  const raiz = useRef<HTMLDivElement>(null);
  const { urls } = useModoDoSite();
  const tema = dados.site?.tema ?? null;

  const nomes = nomesDoSite(dados);
  const casal: CasalDoSite = { ...partesDoNome(nomes.nome1, nomes.nome2, nomes.forma), forma: nomes.forma };

  const par = valoresDoPar(tema?.fontes, "classico");
  const abertura = useAbertura({
    ligada: tema?.abertura !== false,
    familiaDoNome: FAMILIAS[par.nf],
    heroEmMs: 450,
    fimEmMs: 1800,
  });
  useRevelar(raiz, REVELACOES, { margem: MARGEM_T01 });

  // a estrutura salva, com os blocos que o T01 desenha e ainda faltam
  // (vazios: só aparecem se tiverem conteúdo); o olho esconde
  const estrutura = estruturaDoModelo(estruturaEfetiva(dados.site?.estrutura), "classico");
  const capa = estrutura.find((b) => b.tipo === "capa") ?? { id: "capa", tipo: "capa" as const };
  const rodape = estrutura.find((b) => b.tipo === "rodape") ?? { id: "rodape", tipo: "rodape" as const };
  const resolver = (c: string) => urls[c] ?? null;

  const meio = estrutura.filter((b) => b.tipo !== "capa" && b.tipo !== "rodape" && b.visivel !== false);
  const comConteudo = meio.filter((b) => temConteudo(b));
  const tipos = new Set(comConteudo.map((b) => b.tipo));
  const links = {
    historia: tipos.has("historia"),
    dia: tipos.has("momentos"),
    presentes: tipos.has("presentes"),
    rsvp: tipos.has("rsvp") && dados.rsvp.aberto,
  };

  function temConteudo(b: BlocoDoSite): boolean {
    const p = { dados, bloco: b, modo };
    switch (b.tipo) {
      case "historia":
        return temHistoria(p);
      case "momentos":
      case "contagem":
        // a data do evento sempre existe; sem ela não há dia nem contagem
        return /^\d{4}-\d{2}-\d{2}/.test(dados.evento.data);
      case "rsvp":
        return true;
      case "local":
        return temLocal(p);
      case "dress_code":
        return temTraje({ ...p, resolver });
      case "presentes":
        return temPresentes(p);
      case "jeito":
        return temJeito(p);
      case "galeria":
        return fotosDaGaleria(lerGaleria(b.conteudo).fotos, modo, resolver).length > 0;
      case "especiais":
        return temPadrinhos(p);
      case "mensagem":
        return temRecado(p);
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
        // cenas, vídeo, enquete, perguntas: o T01 não desenha
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
      case "historia":
        return <Historia {...p} fotoCasalUrl={null /* só fotos do balde site: a foto do casal de antes aceita troca depois da revisão (191) */} />;
      case "momentos":
        return <GrandeDia {...p} comLocal={tipos.has("local")} />;
      case "contagem":
        return <ContagemRegressiva {...p} />;
      case "local":
        return <Local {...p} />;
      case "dress_code":
        return <Traje {...p} />;
      case "rsvp":
        return <Rsvp {...p} />;
      case "presentes":
        return <Presentes {...p} />;
      case "jeito":
        return <Jeito {...p} />;
      case "galeria":
        return (
          <Galeria
            {...p}
            fotos={fotosDaGaleria(lerGaleria(b.conteudo).fotos, modo, resolver)}
            colada={!!anterior && FUNDO_BG.has(anterior.tipo)}
          />
        );
      case "especiais":
        return <Padrinhos {...p} />;
      case "mensagem":
        return <Recado {...p} />;
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
    <div ref={raiz} className="c-raiz" onClick={aoClicar}>
      <ScriptRevelar />
      <Abertura casal={casal} estado={abertura.estado} abrir={abertura.abrir} />
      <Nav casal={casal} links={links} modo={modo} />
      <Hero
        dados={dados}
        bloco={capa}
        casal={casal}
        modo={modo}
        heroLiberado={abertura.heroLiberado}
        animar={abertura.animar}
        comHistoria={links.historia}
      />
      {comConteudo.map((b, i) => (
        <Fragment key={b.id}>{secao(b, comConteudo[i - 1])}</Fragment>
      ))}
      <Hashtag casal={casal} />
      <Rodape dados={dados} bloco={rodape} casal={casal} modo={modo} />
    </div>
  );
}
