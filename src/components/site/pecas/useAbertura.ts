"use client";

// A abertura dos modelos (portas, alianças, monograma, envelope): o que é
// comum a todas. Cada modelo desenha a dele e passa os tempos do
// protótipo; aqui ficam a trava da rolagem, a espera da fonte do nome e o
// relógio que libera o hero.
//
//   · fechada → abrir() → abrindo → (heroEmMs) hero liberado →
//     (fimEmMs) aberta, rolagem destravada;
//   · automática (o monograma do T04): abre sozinha quando a fonte chega;
//   · sem abertura: o hero é liberado quando a fonte chega.
//
// A fonte do nome vem sem preload; o hero espera document.fonts.load dela
// ou 1,2 s, o que vier primeiro, para o nome não piscar na reserva.
//
// Prévia, revisão e reduced-motion pulam tudo: aberta desde o começo e
// animar=false (o modelo mostra o quadro final). A rolagem nunca fica
// travada: a trava sai quando abre e quando o componente desmonta.

import { useCallback, useEffect, useRef, useState } from "react";
import { useModoDoSite } from "./contexto";
import { movimentoReduzido } from "./useRevelar";

export type EstadoDaAbertura = "fechada" | "abrindo" | "aberta";

export type OpcoesDaAbertura = {
  /** tema.abertura do casal */
  ligada: boolean;
  /** FAMILIAS[...] do par: a fonte que o hero espera */
  familiaDoNome?: string | null;
  /** do clique até as animações do hero começarem */
  heroEmMs: number;
  /** do clique até a abertura sair e a rolagem destravar */
  fimEmMs: number;
  /** abre sozinha quando a fonte chega (T04) */
  automatica?: boolean;
  /** quanto esperar a fonte, no máximo */
  esperaMaxMs?: number;
};

export type Abertura = {
  estado: EstadoDaAbertura;
  abrir: () => void;
  /** as animações de entrada do hero podem tocar */
  heroLiberado: boolean;
  /** false = prévia, revisão ou reduced-motion: tudo no quadro final */
  animar: boolean;
  fontesProntas: boolean;
};

const ESPERA_DA_FONTE = 1200;

function travar(sim: boolean) {
  document.documentElement.style.overflow = sim ? "hidden" : "";
}

export function useAbertura(o: OpcoesDaAbertura): Abertura {
  const { modo } = useModoDoSite();
  const pula = modo !== "publico";
  // o servidor não sabe do reduced-motion: começa igual nos dois lados e
  // o efeito corrige logo depois da hidratação
  const [estado, setEstado] = useState<EstadoDaAbertura>(o.ligada && !pula ? "fechada" : "aberta");
  const [animar, setAnimar] = useState(!pula);
  const [fontesProntas, setFontesProntas] = useState(false);
  const [heroLiberado, setHeroLiberado] = useState(false);
  const tempos = useRef<number[]>([]);
  const abriu = useRef(false);

  const heroEm = useRef(o.heroEmMs);
  const fimEm = useRef(o.fimEmMs);
  heroEm.current = o.heroEmMs;
  fimEm.current = o.fimEmMs;

  // reduced-motion e prévia: abre na hora, sem animação
  useEffect(() => {
    if (pula || movimentoReduzido()) {
      setAnimar(false);
      setEstado("aberta");
      setHeroLiberado(true);
      setFontesProntas(true);
    }
  }, [pula]);

  // a fonte do nome, ou o tempo-limite
  useEffect(() => {
    let vivo = true;
    const pronto = () => vivo && setFontesProntas(true);
    const fam = o.familiaDoNome;
    if (!fam || typeof document === "undefined" || !document.fonts?.load) {
      pronto();
    } else {
      const limite = window.setTimeout(pronto, o.esperaMaxMs ?? ESPERA_DA_FONTE);
      document.fonts
        .load(`1em ${fam}`)
        .then(pronto, pronto)
        .finally(() => clearTimeout(limite));
    }
    return () => {
      vivo = false;
    };
  }, [o.familiaDoNome, o.esperaMaxMs]);

  // a trava acompanha o estado e sai sempre que o componente sai
  useEffect(() => {
    if (estado === "aberta") return;
    travar(true);
    return () => travar(false);
  }, [estado]);

  // sem abertura: o hero começa quando a fonte chega
  useEffect(() => {
    if (fontesProntas && estado === "aberta" && !abriu.current) setHeroLiberado(true);
  }, [fontesProntas, estado]);

  const abrir = useCallback(() => {
    if (abriu.current) return;
    abriu.current = true;
    setEstado((e) => (e === "fechada" ? "abrindo" : e));
    tempos.current.push(
      window.setTimeout(() => setHeroLiberado(true), heroEm.current),
      window.setTimeout(() => setEstado("aberta"), fimEm.current)
    );
  }, []);

  // automática: abre quando a fonte chega
  useEffect(() => {
    if (o.automatica && fontesProntas && estado === "fechada") abrir();
  }, [o.automatica, fontesProntas, estado, abrir]);

  useEffect(() => {
    const t = tempos.current;
    return () => {
      t.forEach((x) => clearTimeout(x));
      travar(false);
    };
  }, []);

  return { estado, abrir, heroLiberado, animar, fontesProntas };
}
