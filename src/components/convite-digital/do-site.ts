// O convite de verdade a partir do que já é público (a site_publico) e do
// que a noiva salvou (evento_convite, 196). Puro: roda no servidor (a
// página pública) e no navegador (a prévia do editor).
//
// De onde vem cada coisa:
//  · nomes e o jeito dos nomes: os da capa do site no ar (nomesDoSite);
//    o jeito salvo no convite manda;
//  · data: a do evento; hora: a salva no convite, senão a do evento;
//  · local, endereço e cidade: os salvos (texto vazio = ela apagou de
//    propósito); sem nada salvo, os do evento;
//  · o botão: o site do casal, pelo endereço atual.

import { estruturaEfetiva } from "@/lib/site-blocos";
import { lerCapa, nomesDoSite, type CaminhoDeFoto } from "@/lib/site-conteudo";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { ehParDeFonte, type ParDeFonte } from "@/lib/site-pares";
import type { DadosDoConvite } from "./ConviteAnimado";
import { CONVITES, MODOS_DO_NOME, ehIdDeConvite, type IdDoConvite } from "./catalogo";

/** O que a convite_publico e a portal_convite devolvem (196). */
export type ConviteSalvo = {
  modelo: string;
  fonte: string | null;
  paleta: string | null;
  modo_nome: string | null;
  forma: string | null;
  hora: string | null;
  frase: string | null;
  referencia: string | null;
  local: string | null;
  endereco: string | null;
  cidade: string | null;
  local_recepcao: string | null;
  endereco_recepcao: string | null;
  pais1: string | null;
  pais2: string | null;
  foto: CaminhoDeFoto | null;
};

const MODO_DA_FORMA = { nomes: "Nomes", iniciais: "Iniciais", "iniciais-nomes": "Iniciais + nomes" } as const;

/** "16:30:00" → "16:30"; formato estranho → null. */
export function horaCurta(h: string | null | undefined): string | null {
  const m = /^(\d{2}):(\d{2})/.exec(h ?? "");
  return m ? `${m[1]}:${m[2]}` : null;
}

/** A hora que vale no convite: a salva nele, senão a do evento. */
export function horaDoConvite(site: SitePublico, salvo: Pick<ConviteSalvo, "hora"> | null): string | null {
  return horaCurta(salvo?.hora) ?? horaCurta(site.evento.hora);
}

export function modeloDoSalvo(salvo: Pick<ConviteSalvo, "modelo"> | null): IdDoConvite {
  return salvo && ehIdDeConvite(salvo.modelo) ? salvo.modelo : "c01";
}

export function fonteDoSalvo(salvo: Pick<ConviteSalvo, "fonte" | "modelo"> | null): ParDeFonte {
  if (salvo && ehParDeFonte(salvo.fonte)) return salvo.fonte;
  return CONVITES[modeloDoSalvo(salvo)].fontePadrao;
}

/** A foto da capa do site (a padrão do convite, quando ela não escolheu outra). */
export function fotoDaCapa(site: SitePublico): CaminhoDeFoto | null {
  const capa = estruturaEfetiva(site.site?.estrutura).find((b) => b.tipo === "capa");
  return lerCapa(capa?.conteudo).foto;
}

/**
 * Os campos do convite de verdade. `siteUrl` é o endereço do site do casal
 * (relativo, /c/<endereço>: o mesmo domínio em que o convite abriu).
 */
export function dadosDoConvite(site: SitePublico, salvo: ConviteSalvo | null, siteUrl: string): DadosDoConvite {
  const nomes = nomesDoSite(site);
  const modoSalvo = MODOS_DO_NOME.find((m) => m === salvo?.modo_nome);
  const hora = horaDoConvite(site, salvo) ?? "00:00";
  const ou = (salvoV: string | null | undefined, doEvento: string | null | undefined) =>
    salvoV !== null && salvoV !== undefined ? salvoV : (doEvento ?? "");
  return {
    nome1: nomes.nome1,
    nome2: nomes.nome2,
    modoNome: modoSalvo ?? MODO_DA_FORMA[nomes.forma],
    dataISO: `${site.evento.data}T${hora}:00`,
    siteUrl,
    frase: salvo?.frase ?? null,
    referencia: salvo?.referencia ?? null,
    local: ou(salvo?.local, site.evento.local),
    endereco: ou(salvo?.endereco, site.evento.endereco),
    cidade: ou(salvo?.cidade, site.evento.cidade),
    localRecepcao: salvo?.local_recepcao ?? "",
    enderecoRecepcao: salvo?.endereco_recepcao ?? "",
    pais1: salvo?.pais1 ?? "",
    pais2: salvo?.pais2 ?? "",
    formaAbertura: salvo?.forma ?? null,
  };
}
