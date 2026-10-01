"use client";

// A experiência sonora do T06: o violino que toca enquanto a pessoa rola
// para baixo (handoff/modelos/06-violino.md, "Áudio").
//
//   · nada é baixado antes do clique em "Clique aqui" — o protótipo baixava
//     7,7 MB ao montar. Na prévia e na revisão, nunca;
//   · o clique cria o AudioContext e o elemento <audio> DENTRO do gesto (é o
//     que destrava o som no Safari) e dá play() com o ganho em 0;
//   · a cada rolagem para baixo (scrollY > último + 1): sobe até 1 em 700ms
//     e reinicia o relógio ocioso de 1300ms; vencido, desce em 1400ms e
//     pausa (a faixa continua de onde parou). Rolar para cima não toca;
//   · mudo = desce em 500ms; sem mudo, só volta na próxima rolagem para
//     baixo. Aba escondida = desce e pausa;
//   · o volume passa por um GainNode (no iOS, audio.volume é só leitura e o
//     som ligaria e desligaria seco). Sem Web Audio, o volume do elemento,
//     de 30 em 30ms, como no protótipo.
//
// As cordas, o arco da trilha e o furo em "f" da pílula leem o volume do
// instante (volume()) e o "kick" (o tranco das cordas a cada rolagem): o
// motor é um objeto estável, sem render a cada quadro.

import { useCallback, useEffect, useRef, useState } from "react";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";

/**
 * A faixa do violino. O arquivo do pacote do dono (Pixabay, 4 min) ainda
 * não está no repositório nem teve a licença conferida; até lá, null: sem
 * faixa, o botão da capa e a pílula de som não aparecem.
 * Quando entrar: recodificar a 96–128 kbps e servir do próprio domínio
 * (ou de um balde com CORS), porque o GainNode exige CORS.
 */
export const FAIXA_DO_VIOLINO: string | null = null;

const SUBIDA_MS = 700;
const OCIOSO_MS = 1300;
const DESCIDA_MS = 1400;
const MUDO_MS = 500;

export type MotorDoSom = {
  /** o volume deste instante, de 0 a 1 */
  volume: () => number;
  /** o tranco das cordas: 1 no clique, +.12 por rolagem, decai ×.965 por quadro */
  kick: number;
  /** quem desenha com o tempo (as cordas) e precisa acordar quando o som começa */
  acordar: Set<() => void>;
  /** o furo em "f" da pílula, que pulsa no laço das cordas */
  furo: SVGSVGElement | null;
};

type Rampa = { de: number; para: number; t0: number; ms: number };

type Estado = {
  el: HTMLAudioElement | null;
  ctx: AudioContext | null;
  ganho: GainNode | null;
  rampa: Rampa;
  subindo: boolean;
  ativo: boolean;
  mudo: boolean;
  ultimoY: number;
  ocioso: number;
  parar: number;
  intervalo: number;
};

const limitar = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function valorDaRampa(r: Rampa, agora: number): number {
  const k = r.ms > 0 ? Math.min(1, Math.max(0, (agora - r.t0) / r.ms)) : 1;
  return limitar(r.de + (r.para - r.de) * k);
}

type JanelaComWebkit = Window & { webkitAudioContext?: typeof AudioContext };

export type SomDoViolino = {
  /** há faixa e o site é o público: o botão da capa pode aparecer */
  disponivel: boolean;
  ativo: boolean;
  mudo: boolean;
  iniciar: () => void;
  alternarMudo: () => void;
  motor: MotorDoSom;
};

export function useSomDoViolino(faixa: string | null, modo: ModoDoSite): SomDoViolino {
  const disponivel = !!faixa && modo === "publico";
  const [ativo, setAtivo] = useState(false);
  const [mudo, setMudo] = useState(false);

  const s = useRef<Estado>({
    el: null,
    ctx: null,
    ganho: null,
    rampa: { de: 0, para: 0, t0: 0, ms: 0 },
    subindo: false,
    ativo: false,
    mudo: false,
    ultimoY: 0,
    ocioso: 0,
    parar: 0,
    intervalo: 0,
  }).current;

  const motor = useRef<MotorDoSom>({
    volume: () => (s.el ? valorDaRampa(s.rampa, performance.now()) : 0),
    kick: 0,
    acordar: new Set(),
    furo: null,
  }).current;

  const acordar = useCallback(() => motor.acordar.forEach((f) => f()), [motor]);

  const levarA = useCallback(
    (alvo: number, ms: number) => {
      const el = s.el;
      if (!el) return;
      const agora = performance.now();
      const atual = valorDaRampa(s.rampa, agora);
      s.rampa = { de: atual, para: alvo, t0: agora, ms };
      clearTimeout(s.parar);
      clearInterval(s.intervalo);
      if (alvo > 0) {
        if (s.ctx?.state === "suspended") void s.ctx.resume().catch(() => {});
        if (el.paused) void el.play().catch(() => {});
      }
      if (s.ganho && s.ctx) {
        const g = s.ganho.gain;
        const t = s.ctx.currentTime;
        g.cancelScheduledValues(t);
        g.setValueAtTime(atual, t);
        g.linearRampToValueAtTime(alvo, t + ms / 1000);
      } else {
        s.intervalo = window.setInterval(() => {
          const v = valorDaRampa(s.rampa, performance.now());
          try {
            el.volume = v;
          } catch {
            // iOS: só leitura
          }
          if (v === alvo) clearInterval(s.intervalo);
        }, 30);
      }
      if (alvo === 0) {
        s.parar = window.setTimeout(() => {
          if (s.rampa.para === 0) el.pause();
        }, ms);
      }
      acordar();
    },
    [s, acordar]
  );

  const iniciar = useCallback(() => {
    if (!faixa || modo !== "publico") return;
    if (!s.el) {
      const el = new Audio();
      el.crossOrigin = "anonymous";
      el.loop = true;
      el.preload = "auto";
      el.src = faixa;
      const AC = window.AudioContext ?? (window as JanelaComWebkit).webkitAudioContext;
      if (AC) {
        try {
          const ctx = new AC();
          const fonte = ctx.createMediaElementSource(el);
          const ganho = ctx.createGain();
          ganho.gain.value = 0;
          fonte.connect(ganho).connect(ctx.destination);
          void ctx.resume().catch(() => {});
          s.ctx = ctx;
          s.ganho = ganho;
        } catch {
          s.ctx = null;
          s.ganho = null;
        }
      }
      if (!s.ganho) el.volume = 0;
      s.el = el;
      // play() no gesto destrava; sem rolagem ainda, pausa de novo
      void el
        .play()
        .then(() => {
          if (!s.subindo) el.pause();
        })
        .catch(() => {});
    }
    s.ativo = true;
    s.mudo = false;
    s.ultimoY = window.scrollY;
    motor.kick = 1;
    setAtivo(true);
    setMudo(false);
    acordar();
  }, [faixa, modo, s, motor, acordar]);

  const alternarMudo = useCallback(() => {
    const m = !s.mudo;
    s.mudo = m;
    setMudo(m);
    if (m) {
      s.subindo = false;
      clearTimeout(s.ocioso);
      levarA(0, MUDO_MS);
    }
  }, [s, levarA]);

  // a rolagem para baixo é o que toca
  useEffect(() => {
    if (!ativo) return;
    s.ultimoY = window.scrollY;
    const aoRolar = () => {
      const y = window.scrollY;
      const desceu = y > s.ultimoY + 1;
      s.ultimoY = y;
      if (!s.ativo || s.mudo || !desceu) return;
      motor.kick = Math.min(1, motor.kick + 0.12);
      acordar();
      if (!s.subindo) {
        s.subindo = true;
        levarA(1, SUBIDA_MS);
      }
      clearTimeout(s.ocioso);
      s.ocioso = window.setTimeout(() => {
        s.subindo = false;
        levarA(0, DESCIDA_MS);
      }, OCIOSO_MS);
    };
    const aoEsconder = () => {
      if (!document.hidden) return;
      s.subindo = false;
      clearTimeout(s.ocioso);
      levarA(0, MUDO_MS);
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    document.addEventListener("visibilitychange", aoEsconder);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      document.removeEventListener("visibilitychange", aoEsconder);
    };
  }, [ativo, s, motor, acordar, levarA]);

  // ao sair da página: para, solta o arquivo e fecha o contexto
  useEffect(
    () => () => {
      clearTimeout(s.ocioso);
      clearTimeout(s.parar);
      clearInterval(s.intervalo);
      const el = s.el;
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
      void s.ctx?.close().catch(() => {});
      s.el = null;
      s.ctx = null;
      s.ganho = null;
      s.ativo = false;
    },
    [s]
  );

  return { disponivel, ativo, mudo, iniciar, alternarMudo, motor };
}
