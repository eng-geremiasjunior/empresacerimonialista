"use client";

// T02 · Alianças de ouro (afetuoso). O desenho do dono em
// .claude/plans/modelos-de-site/handoff (Template 02): valores, textos e
// tempos são os do protótipo; o markup de cada seção está em secoes/, o
// SVG das alianças em Aliancas.tsx e o CSS, escopado em .sm-aliancas, em
// aliancas.css.
//
// A ordem e o "olho" vêm da estrutura que a noiva arruma no portal: a
// capa (abertura, botão flutuante, hero e a cena das alianças) abre, o
// rodapé fecha, e no meio cada bloco vira a seção dele:
//
//   historia → Nossa história (horizontal)   momentos → O grande dia
//   contagem → Contagem (anel)               local → Localização
//   dress_code → Dress code                  rsvp → Confirmação
//   presentes → Presentes                    jeito → Nosso jeito
//   galeria → Galeria                        especiais → Padrinhos
//   mensagem → Recado (+ hashtag)            hospedagem, album, playlist,
//                                            mural, texto → BlocosNoEstilo
//
// Seção sem conteúdo some, e o botão flutuante só aponta para a
// confirmação se ela está no site e aberta. Modo prévia/revisão: sem
// abertura, sem trava da rolagem, reveals visíveis, a cena e a história
// no quadro final (a revisão vê as 3 frases em lista) e o botão
// flutuante parado.
//
// Desempenho: todas as alianças, a cena, a história, o parallax e o
// botão flutuante andam no MESMO laço de rAF (useCena), que pausa quem
// está fora da tela; nada faz setState por quadro.

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
import { Abertura } from "./secoes/Abertura";
import { Flutuante } from "./secoes/Flutuante";
import { Hero } from "./secoes/Hero";
import { Cena } from "./secoes/Cena";
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
import { Hashtag, Recado, temRecado } from "./secoes/Recado";
import { Rodape } from "./secoes/Rodape";
import { Album, Hospedagem, Mural, Musica, temHospedagem, temTextoLivre, TextoLivre } from "./BlocosNoEstilo";
import "./aliancas.css";

// O reveal do T02: "up" sobe 28px e desfoca 6px em 1300ms; "img" é a
// cortina (clip-path de baixo para cima até 60%) com o zoom de 1.25 que
// assenta em 2600ms; "dev" é a foto saindo do sépia desfocado (2400ms).
// "img" e "dev" animam a camada [data-zoom]; o quadro fica.
const REVELACOES: RevelacoesDoModelo = {
  up: {
    quadros: [
      { opacity: 0, transform: "translateY(28px)", filter: "blur(6px)" },
      { opacity: 1, transform: "none", filter: "blur(0)" },
    ],
    duracao: 1300,
    curva: CURVA_E,
  },
  img: {
    quadros: [
      { clipPath: "inset(100% 0 0 0)", transform: "scale(1.25)" },
      { clipPath: "inset(0% 0 0 0)", offset: 0.6 },
      { clipPath: "inset(0% 0 0 0)", transform: "scale(1)" },
    ],
    duracao: 2600,
    curva: CURVA_E,
    alvo: "[data-zoom]",
  },
  dev: {
    quadros: [
      { filter: "sepia(.9) blur(10px) brightness(1.25)", opacity: 0.2, transform: "scale(1.08)" },
      { filter: "sepia(0) blur(0) brightness(1)", opacity: 1, transform: "scale(1)" },
    ],
    duracao: 2400,
    curva: CURVA_E,
    alvo: "[data-zoom]",
  },
};

/** As âncoras dos botões: só o primeiro bloco de cada tipo. */
const ANCORAS: Partial<Record<BlocoDoSite["tipo"], string>> = {
  historia: "historia",
  momentos: "dia",
  local: "local",
  rsvp: "rsvp",
  presentes: "presentes",
};

export function ModeloAliancas({ dados, midia, modo }: PropsDoModelo) {
  const raiz = useRef<HTMLDivElement>(null);
  const { urls } = useModoDoSite();
  const tema = dados.site?.tema ?? null;

  const nomes = nomesDoSite(dados);
  const casal: CasalDoSite = { ...partesDoNome(nomes.nome1, nomes.nome2, nomes.forma), forma: nomes.forma };

  const par = valoresDoPar(tema?.fontes, "aliancas");
  const abertura = useAbertura({
    ligada: tema?.abertura !== false,
    familiaDoNome: FAMILIAS[par.nf],
    heroEmMs: 2300,
    fimEmMs: 3100,
  });
  useRevelar(raiz, REVELACOES, { margem: MARGEM_PADRAO });

  // a estrutura salva, com os blocos que o T02 desenha e ainda faltam
  // (vazios: só aparecem se tiverem conteúdo); o olho esconde
  const estrutura = estruturaDoModelo(estruturaEfetiva(dados.site?.estrutura), "aliancas");
  const capa = estrutura.find((b) => b.tipo === "capa") ?? { id: "capa", tipo: "capa" as const };
  const resolver = (c: string) => urls[c] ?? null;
  const dataValida = /^\d{4}-\d{2}-\d{2}/.test(dados.evento.data);

  const meio = estrutura.filter((b) => b.tipo !== "capa" && b.tipo !== "rodape" && b.visivel !== false);
  const comConteudo = meio.filter((b) => temConteudo(b));
  const tipos = new Set(comConteudo.map((b) => b.tipo));
  const comRsvp = tipos.has("rsvp") && dados.rsvp.aberto;
  // a hashtag mora no recado quando ele fecha o site, como no desenho
  const recadoNoFim = comConteudo[comConteudo.length - 1]?.tipo === "mensagem";

  function temConteudo(b: BlocoDoSite): boolean {
    const p = { dados, bloco: b, modo };
    switch (b.tipo) {
      case "historia":
        return temHistoria(p);
      case "momentos":
      case "contagem":
        // a data do evento sempre existe; sem ela não há dia nem contagem
        return dataValida;
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
        // cenas, vídeo, enquete, perguntas: o T02 não desenha
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

  function secao(b: BlocoDoSite, ultimo: boolean): ReactNode {
    const p: PropsDaSecao = { dados, bloco: b, casal, modo, ancora: ancoraDe(b) };
    switch (b.tipo) {
      case "historia":
        return <Historia {...p} />;
      case "momentos":
        return <GrandeDia {...p} comLocal={tipos.has("local")} />;
      case "contagem":
        return <ContagemRegressiva data={dados.evento.data} hora={dados.evento.hora} />;
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
        return <Galeria {...p} fotos={fotosDaGaleria(lerGaleria(b.conteudo).fotos, modo, resolver)} />;
      case "especiais":
        return <Padrinhos {...p} />;
      case "mensagem":
        return <Recado {...p} comHashtag={ultimo} />;
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
    <div ref={raiz} className="a-raiz" data-modo={modo} onClick={aoClicar}>
      <ScriptRevelar />
      <Abertura casal={casal} estado={abertura.estado} abrir={abertura.abrir} />
      <Flutuante casal={casal} comRsvp={comRsvp} modo={modo} />
      <Hero
        dados={dados}
        bloco={capa}
        casal={casal}
        modo={modo}
        heroLiberado={abertura.heroLiberado}
        animar={abertura.animar}
        comCena={dataValida}
      />
      {dataValida && <Cena data={dados.evento.data} modo={modo} />}
      {comConteudo.map((b, i) => (
        <Fragment key={b.id}>{secao(b, i === comConteudo.length - 1)}</Fragment>
      ))}
      {!recadoNoFim && <Hashtag casal={casal} />}
      <Rodape dados={dados} casal={casal} />
    </div>
  );
}
