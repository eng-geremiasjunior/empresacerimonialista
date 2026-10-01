"use client";

// O renderizador único do site do evento: o convidado (/c e /confirmar),
// a prévia da família (portal) e a revisão do dono (/admin) passam todos
// por aqui, para o dono aprovar exatamente o que vai ao ar.
//
// O modelo vem de tema.modelo. Sem tema, modelo desconhecido ou modelo
// ainda sem desenho, cai no "convite" — o ConviteCompleto de hoje,
// intocado, com as mesmas props de sempre. Os modelos novos entram num
// mapa estático de next/dynamic, um chunk por modelo: o convidado baixa
// só o JS e o CSS do modelo do casal.

import type { ComponentType, CSSProperties } from "react";
import dynamic from "next/dynamic";
import { ConviteCompleto } from "@/components/convite/ConviteCompleto";
import { ContextoDoSite } from "@/components/site/pecas/contexto";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { modeloDoTema, type ModeloNovo } from "@/lib/site-modelos";
import { varsDoModelo } from "@/lib/site-paletas";
import { varsDoPar } from "@/lib/site-pares";
import "./site-base.css";

export type ModoDoSite = "publico" | "previa" | "revisao";

export type MidiaDoSite = {
  /** URLs já assinadas no servidor (bucket privado) */
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
  /** caminho no balde 'site' → URL assinada; vazio até a migração 191 */
  urls: Record<string, string>;
};

/** O que cada src/components/site/modelos/<id>/Modelo<Id>.tsx recebe. */
export type PropsDoModelo = {
  dados: SitePublico;
  midia: MidiaDoSite;
  modo: ModoDoSite;
};

// Um chunk por modelo. Cada linha entra quando a pasta do modelo existir
// (import de arquivo que não existe quebra o build), no formato:
//   classico: dynamic(() => import("./modelos/classico/ModeloClassico").then((m) => m.ModeloClassico)),
// Sem a linha, o modelo cai no convite.
const DESENHADOS: Partial<Record<ModeloNovo, ComponentType<PropsDoModelo>>> = {
  classico: dynamic(() => import("./modelos/classico/ModeloClassico").then((m) => m.ModeloClassico)),
  aliancas: dynamic(() => import("./modelos/aliancas/ModeloAliancas").then((m) => m.ModeloAliancas)),
  cartoes: dynamic(() => import("./modelos/cartoes/ModeloCartoes").then((m) => m.ModeloCartoes)),
  monograma: dynamic(() => import("./modelos/monograma/ModeloMonograma").then((m) => m.ModeloMonograma)),
  franca: dynamic(() => import("./modelos/franca/ModeloFranca").then((m) => m.ModeloFranca)),
  violino: dynamic(() => import("./modelos/violino/ModeloViolino").then((m) => m.ModeloViolino)),
};

export function SiteDoEvento({
  dados,
  midia,
  modo,
  semEnvelope,
}: {
  dados: SitePublico;
  midia: MidiaDoSite;
  modo: ModoDoSite;
  /** só o convite tem envelope; ausente = abre direto fora do público */
  semEnvelope?: boolean;
}) {
  const tema = dados.site?.tema ?? null;
  const pedido = modeloDoTema(tema);
  const Modelo = pedido === "convite" ? undefined : DESENHADOS[pedido];

  if (pedido === "convite" || !Modelo) {
    // o Provider não acrescenta nada ao HTML: a árvore é a mesma de antes
    return (
      <ContextoDoSite.Provider value={{ modo, modelo: "convite", urls: midia.urls }}>
        <ConviteCompleto
          dados={dados}
          fotosAlbum={midia.fotosAlbum}
          fotoCasalUrl={midia.fotoCasalUrl}
          semEnvelope={semEnvelope ?? modo !== "publico"}
        />
      </ContextoDoSite.Provider>
    );
  }

  const estilo = {
    ...varsDoModelo(pedido, tema),
    ...varsDoPar(tema?.fontes, pedido),
  } as CSSProperties;

  const raiz = (
    <div className={`sm-raiz sm-${pedido}`} style={estilo}>
      <Modelo dados={dados} midia={midia} modo={modo} />
    </div>
  );

  return (
    <ContextoDoSite.Provider value={{ modo, modelo: pedido, urls: midia.urls }}>
      {modo === "publico" ? raiz : <div className="sm-previa">{raiz}</div>}
    </ContextoDoSite.Provider>
  );
}
