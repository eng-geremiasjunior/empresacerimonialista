// As peças do painel do dono. Componentes de servidor, sem estado: título,
// número, seção, aviso e o menu de abas das telas.
//
// A paleta é a do painel chumbo: hierarquia por cinza, a ameixa da marca
// só no que pede atenção e no que está selecionado. Números em fonte
// monoespaçada: é o contraste texto/número que faz a tela ser lida como
// painel.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export const MONO = "var(--font-mono), ui-monospace, monospace";

export const COR = {
  tinta: "#1c1d21",
  texto: "#3d3e44",
  cinza: "#5c5d63",
  cinzaClaro: "#84858b",
  linha: "#dededa",
  fundo: "#f4f4f2",
  chumbo: "#33343a",
  ameixa: "#6e3f5f",
  ameixaClara: "#f3ebf0",
} as const;

export function Cabecalho({
  titulo,
  linha,
  lado,
}: {
  titulo: string;
  linha?: React.ReactNode;
  lado?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#1c1d21]">{titulo}</h1>
        {linha && <div className="mt-1 text-[13px] leading-relaxed text-[#5c5d63]">{linha}</div>}
      </div>
      {lado && <div className="flex flex-wrap items-center gap-2">{lado}</div>}
    </div>
  );
}

/** Um número grande com o rótulo em cima e a explicação curta embaixo. */
export function Numero({
  rotulo,
  valor,
  legenda,
  destaque,
  href,
}: {
  rotulo: string;
  valor: string;
  legenda?: React.ReactNode;
  /** a ameixa: só para o número que pede ação */
  destaque?: boolean;
  href?: string;
}) {
  const corpo = (
    <>
      <p
        className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#84858b]"
        style={{ fontFamily: MONO }}
      >
        {rotulo}
      </p>
      <p
        className={`mt-2 text-[26px] font-medium leading-none ${destaque ? "text-[#6e3f5f]" : "text-[#1c1d21]"}`}
        style={{ fontFamily: MONO }}
      >
        {valor}
      </p>
      {legenda && <p className="mt-1.5 text-[12px] leading-snug text-[#5c5d63]">{legenda}</p>}
    </>
  );
  const classe = `block rounded-lg border bg-white px-[18px] py-4 ${destaque ? "border-[#d9c2d2]" : "border-[#dededa]"}`;
  return href ? (
    <Link href={href} className={`${classe} transition-colors hover:border-[#b9bac0]`}>
      {corpo}
    </Link>
  ) : (
    <div className={classe}>{corpo}</div>
  );
}

export function Secao({
  titulo,
  nota,
  lado,
  children,
  id,
}: {
  titulo: string;
  nota?: React.ReactNode;
  lado?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-lg border border-[#dededa] bg-white px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-[#1c1d21]">{titulo}</h2>
        {lado && <div className="text-[12px] text-[#84858b]">{lado}</div>}
      </div>
      {nota && <p className="mt-0.5 text-[12px] leading-snug text-[#84858b]">{nota}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Frase no lugar de um zero: quando não há nada, diz o que não há. */
export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-[13px] text-[#84858b]">{children}</p>;
}

/** Aviso do painel (migração faltando, leitura que falhou). */
export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-[#e7d6d6] bg-[#fbf6f6] px-4 py-3 text-[13px] text-[#8a3d3d]">
      {children}
    </p>
  );
}

/** Linha de rótulo e valor, para listas de fatos. */
export function Fatos({ linhas }: { linhas: { rotulo: string; valor: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[minmax(110px,auto)_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      {linhas.map((l) => (
        <div key={l.rotulo} className="contents">
          <dt className="text-[#84858b]">{l.rotulo}</dt>
          <dd className="min-w-0 break-words text-[#3d3e44]">{l.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export type Aba = { chave: string; rotulo: string; href: string; Icone: LucideIcon; contagem?: number };

/**
 * O menu de abas de uma tela. Regra dele: menu tem contêiner, ícone e
 * peso, fica no mesmo lugar e aparece inteiro no celular (quebra em
 * linhas, nada escondido para o lado). Desenho diferente dos filtros.
 */
export function Abas({ abas, atual, rotulo }: { abas: Aba[]; atual: string; rotulo: string }) {
  return (
    <nav
      aria-label={rotulo}
      className="flex flex-wrap gap-1 rounded-lg border border-[#dededa] bg-[#ecece8] p-1"
    >
      {abas.map(({ chave, rotulo: r, href, Icone, contagem }) => {
        const ativa = chave === atual;
        return (
          <Link
            key={chave}
            href={href}
            aria-current={ativa ? "page" : undefined}
            className={`flex items-center gap-2 rounded-md px-3 py-[7px] text-[13.5px] transition-colors ${
              ativa
                ? "bg-white font-semibold text-[#1c1d21] shadow-sm"
                : "font-medium text-[#5c5d63] hover:bg-white/60 hover:text-[#1c1d21]"
            }`}
          >
            <Icone
              size={15}
              aria-hidden
              className={ativa ? "text-[#6e3f5f]" : "text-[#84858b]"}
            />
            {r}
            {typeof contagem === "number" && (
              <span className="text-[12px] font-normal text-[#84858b]" style={{ fontFamily: MONO }}>
                {contagem}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Filtros em pílula: diferentes do menu de propósito. */
export function Filtros({
  opcoes,
  atual,
  rotulo,
}: {
  opcoes: { chave: string; rotulo: string; href: string; contagem?: number }[];
  atual: string;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const ativa = o.chave === atual;
        return (
          <Link
            key={o.chave}
            href={o.href}
            aria-current={ativa ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${
              ativa
                ? "border-[#33343a] bg-[#33343a] text-white"
                : "border-[#d3d3cf] bg-white text-[#3d3e44] hover:border-[#9a9ba1]"
            }`}
          >
            {o.rotulo}
            {typeof o.contagem === "number" && (
              <span className={`ml-1.5 ${ativa ? "text-[#c9cacf]" : "text-[#84858b]"}`} style={{ fontFamily: MONO }}>
                {o.contagem}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/** Barra fina em cinza (a mais recente, ou a escolhida, em chumbo). */
export function Barra({ fracao, forte }: { fracao: number; forte?: boolean }) {
  const f = Math.max(0, Math.min(1, fracao));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ecece8]">
      <div
        className={`h-full rounded-full ${forte ? "bg-[#33343a]" : "bg-[#b0b1b0]"}`}
        style={{ width: `${Math.round(f * 100)}%` }}
      />
    </div>
  );
}
