"use client";

// O que as seções do Alianças dividem: o casal já resolvido (nomes,
// iniciais, forma, hashtag), o quadro de foto com as revelações do
// desenho ("img" é a cortina, "dev" é a foto que se revela como num
// papel fotográfico), a entrada dos blocos que aparecem depois de um
// toque (formulário do RSVP, finais, painel do presente) e as datas no
// formato do desenho.

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import type { SitePublico } from "@/lib/site-publico-tipos";
import type { BlocoDoSite } from "@/lib/site-blocos";
import type { FormaDoNome } from "@/lib/site-conteudo";
import type { FormaDoEspaco } from "@/lib/site-modelos";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import type { PartesDoNome } from "@/components/site/pecas/Nomes";

export type CasalDoSite = PartesDoNome & { forma: FormaDoNome };

/** O que toda seção recebe. */
export type PropsDaSecao = {
  dados: SitePublico;
  bloco: BlocoDoSite;
  casal: CasalDoSite;
  modo: ModoDoSite;
  /** o id da âncora (#dia, #local, #rsvp...) só no primeiro bloco do tipo */
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

/** "Marina & João"; faltando um, só o outro. */
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
 * Um quadro de foto do desenho, na forma do espaço (arco, círculo,
 * retângulo com raio): a moldura fica e a camada [data-zoom] se revela —
 * "img" sobe como cortina, "dev" sai do sépia desfocado. Sem foto, nada
 * no público e na revisão; na prévia da família, o espaço vazio.
 */
export function Quadro({
  caminho,
  url,
  proporcao,
  forma = "retangulo",
  revelar = "img",
  className,
  atraso,
  hover,
  parallax,
  carregar,
  estilo,
}: {
  caminho?: string | null;
  url?: string | null;
  /** aspect-ratio do CSS ("4/5", "16/8") */
  proporcao?: string;
  forma?: FormaDoEspaco;
  revelar?: "img" | "dev" | null;
  className?: string;
  atraso?: number;
  /** a escala do hover (galeria: 1.06; panorâmica: 1.04) */
  hover?: "normal" | "suave";
  /** a camada do parallax (local): top -8%, altura 116% */
  parallax?: { ref: Ref<HTMLDivElement> };
  carregar?: "eager" | "lazy";
  estilo?: CSSProperties;
}) {
  const { modo } = useModoDoSite();
  const resolver = useUrlDaFoto();
  const src = resolver(caminho, url);
  if (!src && modo !== "previa") return null;

  const foto = <EspacoDeFoto url={src} forma="retangulo" proporcao="tela" className="a-quadro-foto" carregar={carregar} />;
  let miolo: ReactNode = foto;
  if (hover) miolo = <div className={`a-quadro-hover ${hover === "suave" ? "a-quadro-hover--suave" : ""}`}>{foto}</div>;
  if (parallax)
    miolo = (
      <div className="a-quadro-parallax" ref={parallax.ref}>
        {foto}
      </div>
    );

  return (
    <div
      className={`a-quadro a-quadro--${forma} ${className ?? ""}`}
      style={{ ...(proporcao ? { aspectRatio: proporcao.replace("/", " / ") } : null), ...estilo }}
      data-revelar={revelar ?? undefined}
      data-atraso={atraso || undefined}
    >
      <div className="a-quadro-zoom" data-zoom="">
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
    <button type="button" className="a-volta" onClick={onClick}>
      {children}
    </button>
  );
}

/** O link da loja só se for http(s). */
export function linkSeguro(link: string | null | undefined): string | null {
  return link && /^https?:\/\//i.test(link) ? link : null;
}
