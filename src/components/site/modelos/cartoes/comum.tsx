"use client";

// O que as seções dos Cartões dividem — e o Monograma (T04) também, que
// importa as seções daqui: o casal já resolvido (nomes, iniciais, forma,
// hashtag), os ícones de linha do desenho, a foto que enche o cartão, a
// entrada dos blocos que aparecem depois de um toque (data-enter) e as
// datas no formato do desenho.
//
// Nada aqui sabe o nome do modelo: o CSS das seções (secoes/secoes.css)
// é escopado em .k-casca, a classe que o modelo põe na raiz dele.

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type { SitePublico } from "@/lib/site-publico-tipos";
import type { BlocoDoSite } from "@/lib/site-blocos";
import type { FormaDoNome, IconeDoMarco } from "@/lib/site-conteudo";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import type { PartesDoNome } from "@/components/site/pecas/Nomes";
import "./secoes/secoes.css";

export type CasalDoSite = PartesDoNome & { forma: FormaDoNome };

/** O que toda seção recebe. */
export type PropsDaSecao = {
  dados: SitePublico;
  bloco: BlocoDoSite;
  casal: CasalDoSite;
  modo: ModoDoSite;
  /** o id da âncora (#historia, #dia...) só no primeiro bloco do tipo;
   *  é também o data-sec que acende o ícone do dock */
  ancora?: string;
};

// ------------------------------------------------------------------ datas

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const DIAS_DA_SEMANA = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado",
];

function partesDaData(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** "31.10.2026" (a pílula do cabeçalho). */
export function dataComPontos(iso: string): string {
  const p = partesDaData(iso);
  return p ? `${String(p[2]).padStart(2, "0")}.${String(p[1]).padStart(2, "0")}.${p[0]}` : "";
}

/** "31 de outubro". */
export function diaEMes(iso: string): string {
  const p = partesDaData(iso);
  return p ? `${p[2]} de ${MESES[p[1] - 1]}` : "";
}

/** "Sábado, 31 de outubro" (o título do grande dia). A data é do
 *  calendário, sem fuso: o dia da semana sai do UTC. */
export function diaDaSemanaEData(iso: string): string {
  const p = partesDaData(iso);
  if (!p) return "";
  const dia = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  return `${DIAS_DA_SEMANA[dia]}, ${p[2]} de ${MESES[p[1] - 1]}`;
}

/** "16:30" → "16h30", como no desenho. */
export function horaDoDesenho(hora: string): string {
  return hora.slice(0, 5).replace(":", "h");
}

export const horaValida = (h: string | null | undefined): h is string => !!h && /^\d{2}:\d{2}/.test(h);

export const linkSeguro = (l: string | null | undefined): string | null =>
  l && /^https?:\/\//i.test(l) ? l : null;

// ---------------------------------------------------------------- ícones

/** Os ícones de linha do desenho (renderVals().I do protótipo). */
export const ICONES = {
  grade: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  coracao: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  agenda: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  pino: "M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  musica: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  presente: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7s-1.5-4-4-4a2 2 0 0 0 0 4M12 7s1.5-4 4-4a2 2 0 0 1 0 4",
  imagem: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4",
  pessoas: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6",
  check: "M5 12.5l4.5 4.5L19 7",
  cafe: "M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M11 3v3",
  aviao: "M3 11l18-8-8 18-2-8z",
  casa: "M4 11l8-7 8 7v9h-5v-6h-6v6H4z",
  anel: "M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM9 6l3-3 3 3-3 3z",
  relogio: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  cabide: "M12 7a2 2 0 1 1 2-2c0 1.2-2 1.5-2 3l9 7H3l9-7",
  envelope: "M4 6h16v13H4zM4 7l8 6 8-6",
  lampada: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z",
  seta: "M5 12h14M13 6l6 6-6 6",
} as const;

export type NomeDoIcone = keyof typeof ICONES;

/** O ícone de cada marco da história (o que a noiva escolhe no editor). */
export const ICONE_DO_MARCO: Record<IconeDoMarco, NomeDoIcone> = {
  cafe: "cafe",
  aviao: "aviao",
  casa: "casa",
  anel: "anel",
  coracao: "coracao",
};

/** Um ícone de linha (viewBox 24). A espessura e o tamanho vêm da classe. */
export function Icone({ nome, className }: { nome: NomeDoIcone; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`k-icone ${className ?? ""}`} aria-hidden focusable="false">
      <path d={ICONES[nome]} />
    </svg>
  );
}

// ---------------------------------------------------------------- nomes

/** "Marina & Téo" com o "&" na cor do desenho; faltando um, só o outro. */
export function NomesDoCasal({ casal, ampClasse = "k-amp" }: { casal: CasalDoSite; ampClasse?: string }) {
  return (
    <>
      {casal.nome1}
      {casal.dois && (
        <>
          {" "}
          <span className={`sm-amp ${ampClasse}`}>&amp;</span>{" "}
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
 * A foto que enche o espaço do cartão (o contêiner manda no tamanho).
 * Sem foto: nada no público e na revisão; na prévia da família, o espaço
 * vazio que convida o envio.
 */
export function FotoDoCartao({
  caminho,
  url,
  className,
  carregar,
}: {
  caminho?: string | null;
  url?: string | null;
  className?: string;
  carregar?: "eager" | "lazy";
}) {
  const resolver = useUrlDaFoto();
  return (
    <EspacoDeFoto
      url={resolver(caminho, url)}
      forma="retangulo"
      proporcao="tela"
      className={`k-foto ${className ?? ""}`}
      carregar={carregar}
    />
  );
}

/** Há foto para mostrar (ou o espaço vazio, na prévia)? */
export function useTemFoto() {
  const { modo } = useModoDoSite();
  const resolver = useUrlDaFoto();
  return (caminho?: string | null, url?: string | null) => !!resolver(caminho, url) || modo === "previa";
}

// ------------------------------------------------------------- entrada

const useLayoutNoCliente = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** A entrada de um bloco que aparece depois de um toque (data-enter do
 *  protótipo): 900ms, sobe 16px e desfoca 5px. Só no público. */
export function useEntrada<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { modo } = useModoDoSite();
  useLayoutNoCliente(() => {
    const el = ref.current;
    if (!el || modo !== "publico" || movimentoReduzido() || typeof el.animate !== "function") return;
    const a = el.animate(
      [
        { opacity: 0, transform: "translateY(16px)", filter: "blur(5px)" },
        { opacity: 1, transform: "none", filter: "blur(0)" },
      ],
      { duration: 900, easing: CURVA_E, fill: "both" }
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

/** O link sublinhado dos finais ("Alterar resposta"). */
export function LinkDeVolta({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="k-volta" onClick={onClick}>
      {children}
    </button>
  );
}

/** O rótulo pequeno em maiúsculas (eyebrow) do desenho. */
export function Rotulo({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`k-rotulo ${className ?? ""}`}>{children}</div>;
}
