"use client";

// Um espaço de foto do modelo: a forma (retângulo, arco, círculo, oval) e
// a proporção vêm de MODELOS[id].espacos.
//
// Com foto: <img> simples, como o ConviteCompleto — a URL é assinada pelo
// Supabase e expira; o otimizador do next/image guardaria cópia dela.
// Sem foto:
//   · na prévia da família, o espaço aparece, para ela ver onde falta;
//     com aoTocar (o editor), ele mesmo é o botão de envio;
//   · no público e na revisão do dono (que aprova o que vai ao ar), nada:
//     a seção se recompõe com as fotos que existem.

import type { CSSProperties, ImgHTMLAttributes, Ref } from "react";
import type { FormaDoEspaco } from "@/lib/site-modelos";
import { useModoDoSite } from "./contexto";
import "./pecas.css";

/** "4/5" vira aspect-ratio; "tela" (PROPORCAO_TELA) fica com o contêiner. */
function razao(proporcao: string): string | undefined {
  const m = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(proporcao);
  return m ? `${m[1]} / ${m[2]}` : undefined;
}

type AtributosDaImagem = ImgHTMLAttributes<HTMLImageElement> & Record<`data-${string}`, string | number | boolean>;

export function EspacoDeFoto({
  caminho,
  url,
  forma,
  proporcao,
  className,
  style,
  classeDaImagem,
  imagem,
  refDaImagem,
  alt = "",
  carregar = "lazy",
  aoTocar,
}: {
  /** caminho no balde 'site' (resolvido pelas URLs do contexto) */
  caminho?: string | null;
  /** URL pronta (capa do evento, foto do casal); ganha do caminho */
  url?: string | null;
  forma: FormaDoEspaco;
  proporcao: string;
  className?: string;
  style?: CSSProperties;
  classeDaImagem?: string;
  /** atributos da <img> (data-zoom, data-parallax, data-hero-photo...) */
  imagem?: AtributosDaImagem;
  refDaImagem?: Ref<HTMLImageElement>;
  alt?: string;
  /** "eager" só na foto do hero */
  carregar?: "eager" | "lazy";
  /** o editor: tocar no espaço vazio pede a foto */
  aoTocar?: () => void;
}) {
  const { modo, urls } = useModoDoSite();
  const src = url || (caminho ? urls[caminho] : null) || null;
  const aspecto = razao(proporcao);
  const classes = `sm-foto sm-foto--${forma} ${proporcao === "tela" ? "sm-foto--tela" : ""} ${className ?? ""}`;
  const estilo: CSSProperties = { ...(aspecto ? { aspectRatio: aspecto } : null), ...style };

  if (src) {
    return (
      <div className={classes} style={estilo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...imagem}
          ref={refDaImagem}
          src={src}
          alt={alt}
          loading={carregar}
          decoding="async"
          className={`sm-foto-img ${classeDaImagem ?? ""}`}
        />
      </div>
    );
  }

  if (modo !== "previa") return null;

  if (aoTocar) {
    return (
      <button type="button" onClick={aoTocar} className={`${classes} sm-foto-vazia`} style={estilo}>
        Toque para pôr a foto
      </button>
    );
  }
  return (
    <div className={`${classes} sm-foto-vazia`} style={estilo}>
      Sem foto ainda
    </div>
  );
}
