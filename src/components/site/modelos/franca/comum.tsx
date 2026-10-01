"use client";

// O que as seções do França (T05) dividem — e o Violino (T06), que
// importa envelope, château, programa, galeria, boutique, RSVP e rodapé
// daqui: o casal já resolvido (nomes, iniciais, forma, hashtag), o selo
// de cera, o ornamento (linha · losango · linha), a moldura dupla de ouro
// dos cartões de papel, a entrada dos blocos que aparecem depois de um
// toque e as datas no formato do desenho.
//
// O CSS de tudo isso está em franca.css, escopado em .sm-franca: quem
// importa (o T06) envolve a árvore num elemento com essa classe.

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type { SitePublico } from "@/lib/site-publico-tipos";
import type { BlocoDoSite } from "@/lib/site-blocos";
import type { FormaDoNome } from "@/lib/site-conteudo";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import type { PartesDoNome } from "@/components/site/pecas/Nomes";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";

export type CasalDoSite = PartesDoNome & { forma: FormaDoNome };

/** O que toda seção recebe. */
export type PropsDaSecao = {
  dados: SitePublico;
  bloco: BlocoDoSite;
  casal: CasalDoSite;
  modo: ModoDoSite;
  /** o id da âncora (#historia, #local, #dia...) só no primeiro bloco do tipo */
  ancora?: string;
};

// ------------------------------------------------------------------ datas

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function partesDaData(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** "31 · 10 · 2026" (a carta do envelope) ou "31.10.2026" (rodapé). */
export function dataCurta(iso: string, separador: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [m[3], m[2], m[1]].join(separador) : "";
}

/** "31 de outubro" (o fim do RSVP). */
export function diaEMes(iso: string): string {
  const p = partesDaData(iso);
  return p ? `${p[2]} de ${MESES[p[1] - 1]}` : "";
}

/** "Sábado, 31 de outubro" (o título do programa). A data é só o dia, sem
 *  fuso: o dia da semana sai do calendário, em UTC. */
export function diaDaSemanaEMes(iso: string): string {
  const p = partesDaData(iso);
  if (!p) return "";
  const semana = DIAS[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()];
  return `${semana}, ${p[2]} de ${MESES[p[1] - 1]}`;
}

/** "16:30" → "16h30", como no desenho. */
export function horaDoDesenho(hora: string): string {
  return hora.slice(0, 5).replace(":", "h");
}

// ----------------------------------------------------------------- nomes

/** "Helena & Rafael" com o "&" na cor do lugar (.f-amp); faltando um, só
 *  o outro, sem "&" solto. */
export function NomesDoCasal({ casal }: { casal: CasalDoSite }) {
  return (
    <>
      {casal.nome1}
      {casal.dois && (
        <>
          {" "}
          <span className="f-amp">&amp;</span>{" "}
        </>
      )}
      {casal.nome2}
    </>
  );
}

/** "H & R": o "&" menor (.55em no hero e no brasão, .6em na barra). */
export function IniciaisDoCasal({ casal, espacado = true }: { casal: CasalDoSite; espacado?: boolean }) {
  return (
    <>
      {casal.i1}
      {casal.dois && <span className="f-amp f-amp--inic">{espacado ? " & " : "&"}</span>}
      {casal.i2}
    </>
  );
}

// --------------------------------------------------------------- enfeites

/** Linha · losango · linha (hero: 60px e 7px; bienvenue: 48px e 6px). */
export function Ornamento({ className, ...resto }: { className?: string } & Record<`data-${string}`, string>) {
  return (
    <div className={`f-orn ${className ?? ""}`} aria-hidden {...resto}>
      <span className="f-orn-linha" />
      <span className="f-orn-losango" />
      <span className="f-orn-linha" />
    </div>
  );
}

/** As duas molduras de ouro dos cartões de papel (12px a .6, 17px a .3). */
export function MolduraDupla() {
  return (
    <>
      <span className="f-moldura f-moldura--1" aria-hidden />
      <span className="f-moldura f-moldura--2" aria-hidden />
    </>
  );
}

/** O selo de cera com as iniciais (envelope, RSVP). */
export function SeloDeCera({ casal, className, ...resto }: { casal: CasalDoSite; className?: string } & Record<`data-${string}`, string>) {
  return (
    <div className={`f-cera ${className ?? ""}`} aria-hidden {...resto}>
      {casal.i1}
      {casal.i2}
    </div>
  );
}

// ---------------------------------------------------------------- fotos

/** A URL de um caminho do balde 'site' (ou uma URL pronta). */
export function useUrlDaFoto() {
  const { urls } = useModoDoSite();
  return (caminho?: string | null, url?: string | null): string | null =>
    url || (caminho ? urls[caminho] ?? null : null);
}

/** Com foto, ou na prévia da família (o espaço vazio convida a foto). */
export function mostraFoto(url: string | null, modo: ModoDoSite): boolean {
  return !!url || modo === "previa";
}

// ------------------------------------------------------------- entrada

const useLayoutNoCliente = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** A entrada de um bloco que aparece depois de um toque (data-enter do
 *  protótipo): 900ms com delay de 350ms, sobe 16px. Só no público. */
export function useEntrada<T extends HTMLElement>(atraso = 350) {
  const ref = useRef<T>(null);
  const { modo } = useModoDoSite();
  useLayoutNoCliente(() => {
    const el = ref.current;
    if (!el || modo !== "publico" || movimentoReduzido() || typeof el.animate !== "function") return;
    const a = el.animate(
      [
        { opacity: 0, transform: "translateY(16px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 900, delay: atraso, easing: CURVA_E, fill: "both" }
    );
    a.onfinish = () => a.cancel();
    return () => a.cancel();
  }, [modo, atraso]);
  return ref;
}

export function Entrada({ className, atraso, children }: { className?: string; atraso?: number; children: ReactNode }) {
  const ref = useEntrada<HTMLDivElement>(atraso);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** "Alterar resposta", "Escolher outro presente". */
export function LinkDeVolta({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="f-volta" onClick={onClick}>
      {children}
    </button>
  );
}

/** "Rua X, 123 — São Paulo/SP": o endereço e a cidade, sem repetir. */
export function enderecoDoLocal(endereco?: string | null, cidade?: string | null): string {
  const e = endereco?.trim() ?? "";
  const c = cidade?.trim() ?? "";
  if (e && c && e.toLowerCase().includes(c.toLowerCase())) return e;
  return [e, c].filter(Boolean).join(" — ");
}
