"use client";

// A montagem do meio dos Cartões, igual no T03 e no T04 (que importa
// daqui e acrescenta os "Nossos momentos" pelo `extra`).
//
// A ordem e o "olho" vêm da estrutura que a noiva arruma no portal; cada
// bloco vira a seção dele:
//
//   historia → Nossa história (onda)   momentos → O grande dia
//   local → O local                    playlist → Músicas (pedido)
//   presentes → Presentes              galeria → Galeria (mosaico)
//   dress_code → Dress code            especiais → Padrinhos
//   rsvp → Confirmação                 mensagem → Recado
//   hospedagem, album, mural, texto → BlocosNoEstilo
//   contagem → as caixas do hero (não é seção própria)
//
// O grande dia e o local vizinhos na ordem ficam lado a lado na mesma
// grade (como no desenho); separados, cada um ocupa a largura toda.
// Seção sem conteúdo some; o dock e os destaques só apontam para o que
// está no site.

import { Fragment, type ReactNode } from "react";
import type { MidiaDoSite, ModoDoSite } from "@/components/site/SiteDoEvento";
import { estruturaEfetiva, type BlocoDoSite } from "@/lib/site-blocos";
import { lerGaleria } from "@/lib/site-conteudo";
import type { ModeloId } from "@/lib/site-modelos";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { estruturaDoModelo } from "@/components/portal/site/estrutura";
import { horaDoDesenho, horaValida, type CasalDoSite, type PropsDaSecao } from "../comum";
import { Album, Hospedagem, Mural, temHospedagem, temTextoLivre, TextoLivre } from "../BlocosNoEstilo";
import { ITENS_DO_DOCK, type ItemDoDock } from "./Dock";
import { Destaques, destaquesDoSite } from "./Destaques";
import { Pedido } from "./Pedido";
import { Historia, temHistoria } from "./Historia";
import { GrandeDia } from "./GrandeDia";
import { Local, temLocal } from "./Local";
import { Musicas } from "./Musicas";
import { Presentes, temPresentes } from "./Presentes";
import { fotosDaGaleria, Galeria } from "./Galeria";
import { Traje, temTraje } from "./Traje";
import { Padrinhos, temPadrinhos } from "./Padrinhos";
import { Recado, temRecado } from "./Recado";
import { Rsvp } from "./Rsvp";

/** As âncoras (e o data-sec do dock): só o primeiro bloco de cada tipo. */
const ANCORAS: Partial<Record<BlocoDoSite["tipo"], string>> = {
  historia: "historia",
  momentos: "dia",
  local: "local",
  playlist: "musicas",
  presentes: "presentes",
  galeria: "galeria",
  dress_code: "traje",
  especiais: "padrinhos",
  rsvp: "rsvp",
};

export type PlanoDosCartoes = {
  capa: BlocoDoSite;
  rodape: BlocoDoSite;
  /** os blocos do meio que aparecem, na ordem dela */
  meio: BlocoDoSite[];
  ancoras: Map<string, string>;
  /** as caixas da contagem no hero */
  comContagem: boolean;
  comRsvp: boolean;
  comDia: boolean;
  comTraje: boolean;
  dock: ItemDoDock[];
};

const dataValida = (d: string) => /^\d{4}-\d{2}-\d{2}/.test(d);

export function planoDosCartoes({
  dados,
  modo,
  modelo,
  resolver,
  temExtra,
}: {
  dados: SitePublico;
  modo: ModoDoSite;
  modelo: ModeloId;
  resolver: (caminho: string) => string | null;
  /** os blocos que só o modelo desenha (as cenas do T04) */
  temExtra?: (b: BlocoDoSite) => boolean;
}): PlanoDosCartoes {
  const estrutura = estruturaDoModelo(estruturaEfetiva(dados.site?.estrutura), modelo);
  const capa = estrutura.find((b) => b.tipo === "capa") ?? { id: "capa", tipo: "capa" as const };
  const rodape = estrutura.find((b) => b.tipo === "rodape") ?? { id: "rodape", tipo: "rodape" as const };
  const visiveis = estrutura.filter((b) => b.tipo !== "capa" && b.tipo !== "rodape" && b.visivel !== false);

  function temConteudo(b: BlocoDoSite): boolean {
    const p = { dados, bloco: b, modo };
    switch (b.tipo) {
      case "historia":
        return temHistoria(p);
      case "momentos":
        return dataValida(dados.evento.data);
      case "local":
        return temLocal(p);
      case "playlist":
        return !!dados.blocos?.playlist;
      case "presentes":
        return temPresentes(p);
      case "galeria":
        return fotosDaGaleria(lerGaleria(b.conteudo).fotos, modo, resolver).length > 0;
      case "dress_code":
        return temTraje({ ...p, resolver });
      case "especiais":
        return temPadrinhos(p);
      case "rsvp":
        return true;
      case "mensagem":
        return temRecado(p);
      case "hospedagem":
        return temHospedagem(dados);
      case "album":
        return !!dados.blocos?.album;
      case "mural":
        return !!dados.blocos?.recados;
      case "texto":
        return temTextoLivre(b);
      default:
        // contagem (vai no hero) e o que o modelo não desenha
        return temExtra?.(b) ?? false;
    }
  }

  const meio = visiveis.filter((b) => b.tipo !== "contagem" && temConteudo(b));
  const ancoras = new Map<string, string>();
  const usadas = new Set<string>();
  for (const b of meio) {
    const a = ANCORAS[b.tipo];
    if (a && !usadas.has(a)) {
      usadas.add(a);
      ancoras.set(b.id, a);
    }
  }
  const comRsvp = usadas.has("rsvp") && dados.rsvp.aberto;
  const dock = ITENS_DO_DOCK.filter((it) => it.id === "inicio" || (it.id === "rsvp" ? comRsvp : usadas.has(it.id)));

  return {
    capa,
    rodape,
    meio,
    ancoras,
    comContagem: visiveis.some((b) => b.tipo === "contagem") && dataValida(dados.evento.data),
    comRsvp,
    comDia: usadas.has("dia"),
    comTraje: usadas.has("traje"),
    dock,
  };
}

/** "Um pedido nosso" e os 3 destaques, logo abaixo do dock. */
export function TopoDosCartoes({ plano, dados }: { plano: PlanoDosCartoes; dados: SitePublico }) {
  const { evento, rsvp, site } = dados;
  const destaques = destaquesDoSite({
    hora: horaValida(evento.hora) ? horaDoDesenho(evento.hora) : null,
    traje: site?.dress_code_titulo ?? null,
    prazo: rsvp.prazo,
    comDia: plano.comDia,
    comTraje: plano.comTraje,
    comRsvp: plano.comRsvp,
  });
  return (
    <>
      {plano.comRsvp && <Pedido prazo={rsvp.prazo} comDia={plano.comDia} />}
      <Destaques itens={destaques} />
    </>
  );
}

const DUPLA = new Set(["momentos", "local"]);

export function MeioDosCartoes({
  plano,
  dados,
  midia,
  casal,
  modo,
  zoomLento,
  extra,
}: {
  plano: PlanoDosCartoes;
  dados: SitePublico;
  midia: MidiaDoSite;
  casal: CasalDoSite;
  modo: ModoDoSite;
  /** o zoom de 14s na foto do local (só o T03) */
  zoomLento?: boolean;
  /** o desenho dos blocos que só o modelo tem (as cenas do T04) */
  extra?: (p: PropsDaSecao) => ReactNode;
}) {
  const { meio, ancoras } = plano;
  const resolver = (c: string) => midia.urls[c] ?? null;

  function secao(b: BlocoDoSite, atraso?: number): ReactNode {
    const p: PropsDaSecao = { dados, bloco: b, casal, modo, ancora: ancoras.get(b.id) };
    switch (b.tipo) {
      case "historia":
        return <Historia {...p} fotoCasalUrl={midia.fotoCasalUrl} />;
      case "momentos":
        return <GrandeDia {...p} atraso={atraso} />;
      case "local":
        return <Local {...p} zoomLento={zoomLento} atraso={atraso} />;
      case "playlist":
        return <Musicas hash={dados.rsvp.hash} ancora={p.ancora} />;
      case "presentes":
        return <Presentes {...p} />;
      case "galeria":
        return <Galeria {...p} fotos={fotosDaGaleria(lerGaleria(b.conteudo).fotos, modo, resolver)} />;
      case "dress_code":
        return <Traje {...p} />;
      case "especiais":
        return <Padrinhos {...p} />;
      case "rsvp":
        return <Rsvp {...p} />;
      case "mensagem":
        return <Recado {...p} />;
      case "hospedagem":
        return <Hospedagem dados={dados} />;
      case "album":
        return <Album hash={dados.rsvp.hash} fotos={midia.fotosAlbum} />;
      case "mural":
        return <Mural hash={dados.rsvp.hash} recados={dados.recados ?? []} />;
      case "texto":
        return <TextoLivre bloco={b} />;
      default:
        return extra?.(p) ?? null;
    }
  }

  const saida: ReactNode[] = [];
  for (let i = 0; i < meio.length; i++) {
    const b = meio[i];
    const prox = meio[i + 1];
    if (DUPLA.has(b.tipo) && prox && DUPLA.has(prox.tipo) && prox.tipo !== b.tipo) {
      // o segundo cartão entra 120ms depois, como o local do desenho
      saida.push(
        <div key={b.id} className="k-dupla">
          {secao(b)}
          {secao(prox, 120)}
        </div>
      );
      i++;
      continue;
    }
    saida.push(<Fragment key={b.id}>{DUPLA.has(b.tipo) ? <div className="k-dupla">{secao(b)}</div> : secao(b)}</Fragment>);
  }
  return <>{saida}</>;
}
