"use client";

// A contagem até o casamento, nos 6 modelos. Regra do README: nada de
// redesenhar a árvore a cada segundo. Um setInterval escreve só o
// textContent de cada número e anima só o que mudou (WAAPI).
//
// No servidor os números saem vazios: a hora do servidor e a do celular
// nunca batem, e qualquer número no HTML derrubaria a hidratação. O
// relógio é o de Brasília (a data e a hora do evento são de lá), e o
// "hoje" vem de hojeBR, não do fuso do aparelho.
//
// Depois da hora marcada, no mesmo dia: "Hoje é o dia!". Do dia seguinte
// em diante: "Obrigado por celebrar com a gente." Só essas duas trocas
// redesenham a árvore.
//
// Quem tem um desenho próprio (o T02, dias grandes e o resto pequeno, com
// o anel) usa o useContagem e põe os refs onde quiser; quem tem a fileira
// de sempre usa o <Contagem> e veste por classe.

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { hojeBR, somarDias } from "@/lib/tempo";
import { useModoDoSite } from "./contexto";
import { movimentoReduzido } from "./useRevelar";
import "./pecas.css";

export type UnidadeDaContagem = "d" | "h" | "m" | "s";
export type FaseDaContagem = "contando" | "hoje" | "depois";

export type AnimacaoDaContagem = {
  quadros: Keyframe[];
  duracao: number;
  curva?: string;
};

export type OpcoesDaContagem = {
  /** a troca de número do modelo; null = sem animação */
  animacao?: AnimacaoDaContagem | null;
  /** zero à esquerda nos dias (o T01 tem; o README diz que não) */
  preencherDias?: boolean;
  /** a cada segundo, com o que falta (o anel do T02) */
  aoTique?: (restanteMs: number) => void;
};

const UNIDADES: UnidadeDaContagem[] = ["d", "h", "m", "s"];
const DIA = 864e5;

/** Brasília não tem horário de verão desde 2019: -03:00 fixo. */
function alvoDe(data: string, hora: string | null): number {
  const h = hora && /^\d{2}:\d{2}/.test(hora) ? hora.slice(0, 5) : "00:00";
  return Date.parse(`${data}T${h}:00-03:00`);
}

function faseDe(alvo: number, data: string, agora: number): FaseDaContagem {
  if (alvo - agora > 0) return "contando";
  return hojeBR(new Date(agora)) === data ? "hoje" : "depois";
}

const dois = (n: number) => String(n).padStart(2, "0");

function partes(restante: number, preencherDias: boolean): Record<UnidadeDaContagem, string> {
  const d = Math.floor(restante / DIA);
  return {
    d: preencherDias ? dois(d) : String(d),
    h: dois(Math.floor(restante / 36e5) % 24),
    m: dois(Math.floor(restante / 6e4) % 60),
    s: dois(Math.floor(restante / 1e3) % 60),
  };
}

export function useContagem(data: string, hora: string | null, opcoes: OpcoesDaContagem = {}) {
  const { modo } = useModoDoSite();
  const [fase, setFase] = useState<FaseDaContagem>("contando");
  const els = useRef<Partial<Record<UnidadeDaContagem, HTMLElement | null>>>({});
  const op = useRef(opcoes);
  op.current = opcoes;

  // um ref estável por unidade (um ref novo a cada render faria o React
  // soltar e prender o elemento de novo)
  const numero = useMemo(() => {
    const r = {} as Record<UnidadeDaContagem, (el: HTMLElement | null) => void>;
    UNIDADES.forEach((u) => {
      r[u] = (el) => {
        els.current[u] = el;
      };
    });
    return r;
  }, []);

  useEffect(() => {
    const alvo = alvoDe(data, hora);
    if (!Number.isFinite(alvo)) return;
    const quieto = modo !== "publico" || movimentoReduzido();
    let primeiro = true;

    const tique = () => {
      const agora = Date.now();
      const f = faseDe(alvo, data, agora);
      setFase(f);
      if (f !== "contando") return f;
      const restante = alvo - agora;
      const v = partes(restante, !!op.current.preencherDias);
      const anim = op.current.animacao;
      UNIDADES.forEach((u) => {
        const el = els.current[u];
        if (!el || el.textContent === v[u]) return;
        el.textContent = v[u];
        if (!primeiro && !quieto && anim && typeof el.animate === "function") {
          el.animate(anim.quadros, { duration: anim.duracao, easing: anim.curva ?? "cubic-bezier(.2,.7,.2,1)" });
        }
      });
      primeiro = false;
      op.current.aoTique?.(restante);
      return f;
    };

    const f0 = tique();
    if (f0 === "depois") return;
    if (f0 === "hoje") {
      // site aberto durante a festa: à meia-noite de Brasília vira "depois"
      const virada = Date.parse(`${somarDias(data, 1)}T00:00:00-03:00`) - Date.now();
      const t = window.setTimeout(tique, Math.max(virada, 0) + 1000);
      return () => clearTimeout(t);
    }
    const id = window.setInterval(() => {
      if (tique() !== "contando") clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [data, hora, modo, fase]);

  return { fase, numero };
}

export type ClassesDaContagem = {
  raiz?: string;
  unidade?: string;
  numero?: string;
  rotulo?: string;
  separador?: string;
  final?: string;
};

export const ROTULOS_DA_CONTAGEM: Record<UnidadeDaContagem, string> = {
  d: "dias",
  h: "horas",
  m: "minutos",
  s: "segundos",
};

export function Contagem({
  data,
  hora,
  classes = {},
  rotulos,
  separador,
  textoHoje = "Hoje é o dia!",
  textoDepois = "Obrigado por celebrar com a gente.",
  final,
  ...opcoes
}: {
  /** YYYY-MM-DD */
  data: string;
  /** HH:MM; sem hora, conta até a meia-noite do dia */
  hora: string | null;
  classes?: ClassesDaContagem;
  rotulos?: Partial<Record<UnidadeDaContagem, string>>;
  /** entre as unidades (o ":" de alguns modelos) */
  separador?: ReactNode;
  /** o plano tirou o "❤️" que o T01/T02 do protótipo têm; o dono decide */
  textoHoje?: string;
  textoDepois?: string;
  /** desenho próprio do estado final */
  final?: (fase: "hoje" | "depois", texto: string) => ReactNode;
} & OpcoesDaContagem) {
  const { fase, numero } = useContagem(data, hora, opcoes);

  if (fase !== "contando") {
    const texto = fase === "hoje" ? textoHoje : textoDepois;
    return final ? <>{final(fase, texto)}</> : <div className={classes.final}>{texto}</div>;
  }

  return (
    <div className={classes.raiz}>
      {UNIDADES.map((u, i) => (
        <Fragment key={u}>
          {i > 0 && separador != null && (
            <span className={classes.separador} aria-hidden>
              {separador}
            </span>
          )}
          <div className={classes.unidade}>
            <span ref={numero[u]} className={`sm-cd-n ${classes.numero ?? ""}`} />
            <span className={classes.rotulo}>{rotulos?.[u] ?? ROTULOS_DA_CONTAGEM[u]}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
