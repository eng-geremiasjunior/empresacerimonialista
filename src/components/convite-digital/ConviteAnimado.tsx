"use client";

import { useEffect, useRef } from "react";
import { FAMILIAS } from "@/lib/fontes-site";
import type { ParDeFonte } from "@/lib/site-pares";
import { CARREGAR } from "./carregar";
import { CONVITES, ROTULO_DA_FONTE, paletaDoConvite, type IdDoConvite } from "./catalogo";
import { FAMILIAS_DO_DESENHO, criarAjuste } from "./motor/ajuste";
import { mapaDaPaleta } from "./motor/modelo";
import { montarConvite, type FotoDoConvite } from "./motor/montar";

/** O que a noiva preenche (ou o exemplo); vazio = o texto do desenho. */
export type DadosDoConvite = {
  nome1?: string | null;
  nome2?: string | null;
  modoNome?: string | null;
  /** "2027-06-12T17:00:00", hora de Brasília, sem fuso */
  dataISO?: string | null;
  siteUrl?: string | null;
  frase?: string | null;
  referencia?: string | null;
  local?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  /** só os modelos com cerimônia e recepção em blocos separados (09) */
  localRecepcao?: string | null;
  enderecoRecepcao?: string | null;
  pais1?: string | null;
  pais2?: string | null;
  formaAbertura?: string | null;
};

type Props = {
  modelo: IdDoConvite;
  dados: DadosDoConvite;
  fonte?: ParDeFonte | null;
  paleta?: string | null;
  foto?: FotoDoConvite;
  /** prévia: a vaga sem foto aparece como "Foto do casal" */
  previa?: boolean;
  /** o exemplo do modelo: o que não vier preenchido mostra o texto do desenho */
  exemplo?: boolean;
};

const MAPA_DE_FONTES: Record<string, string> = Object.fromEntries(
  Object.entries(FAMILIAS_DO_DESENHO).map(([nome, chave]) => [nome, FAMILIAS[chave]])
);

/** Só http(s) ou caminho do próprio site: o botão do convite nunca vira javascript: */
function enderecoDoSite(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const u = url.trim();
  if (/^https?:\/\//i.test(u) || (u.startsWith("/") && !u.startsWith("//"))) return u;
  return undefined;
}

/**
 * Um convite animado, a página inteira. Monta no navegador (a lógica do
 * desenho usa o document), um por página — nas telas do portal ele abre
 * dentro de um iframe que imita o celular.
 */
export function ConviteAnimado({ modelo, dados, fonte, paleta, foto = null, previa = false, exemplo = false }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const chave = JSON.stringify([modelo, dados, fonte, paleta, foto, previa, exemplo]);

  useEffect(() => {
    let cancelado = false;
    let desmontar: (() => void) | null = null;
    const [m, d, f, p, ft, pv, ex] = JSON.parse(chave) as [
      IdDoConvite,
      DadosDoConvite,
      ParDeFonte | null,
      string | null,
      FotoDoConvite,
      boolean,
      boolean,
    ];
    CARREGAR[m]()
      .then(({ default: def }) => {
        if (cancelado || !raiz.current) return;
        const preenchidos = Object.fromEntries(
          Object.entries(d).filter(([, v]) => typeof v === "string" && v.trim() !== "")
        ) as Record<string, string>;
        const site = enderecoDoSite(preenchidos.siteUrl);
        if (site) preenchidos.siteUrl = site;
        else delete preenchidos.siteUrl;
        // no convite de verdade, o texto de mentira do desenho nunca aparece:
        // nem o do exemplo (local, pais…) nem os nomes do desenho ("Clara")
        const vazios = Object.fromEntries([...Object.keys(def.exemplo), "nome1", "nome2"].map((k) => [k, ""]));
        const props: Record<string, unknown> = {
          ...def.padroes,
          ...(ex ? def.exemplo : vazios),
          ...preenchidos,
          fonte: ROTULO_DA_FONTE[f ?? CONVITES[m].fontePadrao],
        };
        // frase própria sem referência: a referência do desenho (1 Coríntios 13) não vale para ela
        if (!ex && preenchidos.frase && !preenchidos.referencia) props.referencia = "";
        if (def.derivar) Object.assign(props, def.derivar(props));
        const ajuste = criarAjuste(mapaDaPaleta(CONVITES[m].original, paletaDoConvite(m, p)), MAPA_DE_FONTES);
        desmontar = montarConvite(raiz.current, {
          marcacao: def.marcacao,
          estiloGlobal: def.estiloGlobal,
          Logica: def.Logica,
          props,
          ajuste,
          foto: ft,
          mostrarVaga: pv,
        });
      })
      .catch((e) => console.error(e));
    return () => {
      cancelado = true;
      desmontar?.();
    };
  }, [chave]);

  return <div ref={raiz} />;
}
