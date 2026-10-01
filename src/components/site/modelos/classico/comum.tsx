"use client";

// O que as seções do Clássico dividem: o casal já resolvido (nomes,
// iniciais, forma, hashtag), o quadro de foto com a cortina do desenho,
// a entrada dos blocos que aparecem depois de um toque (formulário do
// RSVP, finais, painel do presente) e as datas no formato do desenho.

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import type { SitePublico } from "@/lib/site-publico-tipos";
import type { BlocoDoSite } from "@/lib/site-blocos";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import type { PartesDoNome } from "@/components/site/pecas/Nomes";
import type { FormaDoNome } from "@/lib/site-conteudo";

export type CasalDoSite = PartesDoNome & { forma: FormaDoNome };

/** O que toda seção recebe. */
export type PropsDaSecao = {
  dados: SitePublico;
  bloco: BlocoDoSite;
  casal: CasalDoSite;
  modo: ModoDoSite;
  /** o id da âncora (#historia, #dia...) só no primeiro bloco do tipo */
  ancora?: string;
};

// ------------------------------------------------------------------ datas

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function partesDaData(iso: string): [string, string, string] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [m[3], m[2], m[1]] : null;
}

/** "31 · 10 · 2026" (hero) ou "31.10.2026" (rodapé). */
export function dataCurta(iso: string, separador: string): string {
  const p = partesDaData(iso);
  return p ? p.join(separador) : "";
}

/** "31 de outubro" (o fim do RSVP). */
export function diaEMes(iso: string): string {
  const p = partesDaData(iso);
  return p ? `${Number(p[0])} de ${MESES[Number(p[1]) - 1]}` : "";
}

/** "16:30" → "16h30", como no desenho. */
export function horaDoDesenho(hora: string): string {
  return hora.slice(0, 5).replace(":", "h");
}

// ----------------------------------------------------------- monograma

/** As iniciais com o fio vertical entre elas (selo, nav, hero). */
export function Monograma({
  casal,
  className,
  fio,
}: {
  casal: CasalDoSite;
  className?: string;
  /** o fio: altura e opacidade do desenho em cada lugar */
  fio: { altura: string; opacidade: number };
}) {
  return (
    <span className={className} aria-hidden>
      {casal.i1 && <span>{casal.i1}</span>}
      {casal.dois && (
        <span className="c-fio" style={{ height: fio.altura, opacity: fio.opacidade }} />
      )}
      {casal.i2 && <span>{casal.i2}</span>}
    </span>
  );
}

/** "Marina & João" (o "&" no estilo do par); faltando um, só o outro. */
export function NomesDoCasal({ casal }: { casal: CasalDoSite }) {
  return (
    <>
      {casal.nome1}
      {casal.dois && (
        <>
          {" "}
          <span className="sm-amp">&amp;</span>{" "}
        </>
      )}
      {casal.nome2}
    </>
  );
}

// ---------------------------------------------------------------- fotos

/** A URL de um caminho do balde 'site' (ou uma URL pronta). */
export function useUrlDaFoto() {
  const { urls } = useModoDoSite();
  return (caminho?: string | null, url?: string | null): string | null =>
    url || (caminho ? urls[caminho] ?? null : null);
}

/**
 * Um quadro de foto do desenho: a moldura fica e a camada [data-zoom]
 * sobe como cortina (o reveal "img"). Sem foto, nada no público e na
 * revisão; na prévia da família, o espaço vazio do tamanho certo.
 */
export function Quadro({
  caminho,
  url,
  proporcao,
  className,
  atraso,
  hover = false,
  parallax,
  carregar,
  estilo,
}: {
  caminho?: string | null;
  url?: string | null;
  /** aspect-ratio do CSS ("4/5", "16/9") */
  proporcao?: string;
  className?: string;
  atraso?: number;
  /** a camada que cresce no hover (galeria) */
  hover?: boolean;
  /** a camada do parallax (história): top -8%, altura 116% */
  parallax?: { ref: Ref<HTMLDivElement> };
  carregar?: "eager" | "lazy";
  estilo?: CSSProperties;
}) {
  const { modo } = useModoDoSite();
  const resolver = useUrlDaFoto();
  const src = resolver(caminho, url);
  if (!src && modo !== "previa") return null;

  const foto = (
    <EspacoDeFoto url={src} forma="retangulo" proporcao="tela" className="c-quadro-foto" carregar={carregar} />
  );
  let miolo: ReactNode = foto;
  if (hover) miolo = <div className="c-quadro-hover">{foto}</div>;
  if (parallax)
    miolo = (
      <div className="c-quadro-parallax" ref={parallax.ref}>
        {foto}
      </div>
    );

  return (
    <div
      className={`c-quadro ${className ?? ""}`}
      style={{ ...(proporcao ? { aspectRatio: proporcao.replace("/", " / ") } : null), ...estilo }}
      data-revelar="img"
      data-atraso={atraso || undefined}
    >
      <div className="c-quadro-zoom" data-zoom="">
        {miolo}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- entrada

const useLayoutNoCliente = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** A entrada de um bloco que aparece depois de um toque (data-enter do
 *  protótipo): 1000ms, sobe 18px e desfoca 5px. Só no público. */
export function useEntrada<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { modo } = useModoDoSite();
  useLayoutNoCliente(() => {
    const el = ref.current;
    if (!el || modo !== "publico" || movimentoReduzido() || typeof el.animate !== "function") return;
    const a = el.animate(
      [
        { opacity: 0, transform: "translateY(18px)", filter: "blur(5px)" },
        { opacity: 1, transform: "none", filter: "blur(0)" },
      ],
      { duration: 1000, easing: CURVA_E, fill: "both" }
    );
    a.onfinish = () => a.cancel();
    return () => a.cancel();
  }, [modo]);
  return ref;
}

/** Um bloco que entra com o data-enter do desenho. */
export function Entrada({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useEntrada<HTMLDivElement>();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** O link do pé dos finais ("Alterar resposta", "Escolher outro presente"). */
export function LinkDeVolta({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="c-volta" onClick={onClick}>
      {children}
    </button>
  );
}
