"use client";

// O croqui na página de vendas — o COMPONENTE REAL, não uma cópia.
//
// `Croqui` é o mesmo desenho 2D que a cerimonialista monta na aba Mesas:
// o piso em escala, a grade de meio metro e de metro, a régua, os
// elementos do espaço (palco, pista, bar, saídas) e as mesas com as
// cadeiras em volta, do jeito que o sistema as calcula. Aqui ele recebe
// um salão fictício e vê as mesas chegarem uma a uma, e a última ser
// arrastada até o lugar — que é o que ela faz de verdade, com o mouse.
//
// Nada de banco, nada de IA. Se a tela do sistema mudar, esta muda junto.

import { useEffect, useRef, useState } from "react";
import { Croqui } from "@/components/mesas/Croqui";
import {
  MEDIDA_ELEMENTO,
  MEDIDA_PADRAO,
  type Elemento,
  type Mesa,
  type TipoMesa,
} from "@/lib/croqui-core";

const F_TITLE = "var(--font-title), Inter, system-ui, sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace";

// o salão fictício: 20 × 15 m, o padrão que a tela sugere
const LARGURA = 2000;
const ALTURA = 1500;

function elemento(id: string, tipo: Elemento["tipo"], x: number, y: number, rotulo?: string): Elemento {
  const med = MEDIDA_ELEMENTO[tipo];
  return { id, tipo, rotulo: rotulo ?? null, xCm: x, yCm: y, rotacao: 0, larguraCm: med.largura, alturaCm: med.altura };
}
function mesa(id: string, tipo: TipoMesa, rotulo: string, x: number, y: number): Mesa {
  return {
    id,
    rotulo,
    tipo,
    lugares: MEDIDA_PADRAO[tipo].lugares,
    xCm: x,
    yCm: y,
    rotacao: 0,
    larguraCm: null,
    alturaCm: null,
    assentoMarcado: false,
    ordem: 0,
  };
}

const ELEMENTOS: Elemento[] = [
  elemento("palco", "palco", 700, 50),
  elemento("pista", "pista", 750, 400),
  elemento("bar", "bar", 1650, 1000),
  elemento("porta", "porta", 100, 1440, "Entrada"),
  elemento("saida", "saida_emergencia", 1800, 1440),
  elemento("coluna1", "coluna", 400, 700),
  elemento("coluna2", "coluna", 1540, 700),
];

// as mesas, na ordem em que entram — a última chega fora do lugar e é
// arrastada até a posição final, como no uso real
const MESAS: Mesa[] = [
  mesa("noivos", "noivos", "Noivos", 850, 240),
  mesa("m1", "redonda_8", "Mesa 1", 150, 350),
  mesa("m2", "redonda_8", "Mesa 2", 150, 650),
  mesa("m3", "redonda_10", "Mesa 3", 150, 980),
  mesa("m4", "redonda_8", "Mesa 4", 470, 1050),
  mesa("m5", "redonda_8", "Mesa 5", 1400, 350),
  mesa("m6", "redonda_10", "Mesa 6", 1650, 650),
  mesa("m7", "retangular", "Família", 780, 1100),
  mesa("bolo", "bolo", "Bolo", 1300, 1250),
  mesa("m8", "redonda_8", "Mesa 8", 1130, 750),
];
const ULTIMA = MESAS.length - 1;
// de onde a última mesa parte antes de ser arrastada
const PARTIDA = { xCm: 1650, yCm: 1200 };
const OCUPACAO: Record<string, string> = {
  noivos: "6/6", m1: "8/8", m2: "8/8", m3: "10/10", m4: "7/8", m5: "8/8", m6: "9/10", m7: "8/8", m8: "3/8",
};

export function DemoCroqui() {
  const [quantas, setQuantas] = useState(0);
  const [arrasto, setArrasto] = useState<{ xCm: number; yCm: number } | null>(null);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);
  const timers = useRef<number[]>([]);
  const alvo = useRef<HTMLDivElement>(null);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function tocar() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setQuantas(0);
    setArrasto(null);
    setSelecionada(null);
    setRodando(true);
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz) {
      setQuantas(MESAS.length);
      setRodando(false);
      return;
    }
    // as mesas entram uma a uma
    for (let i = 1; i <= ULTIMA; i++) {
      timers.current.push(window.setTimeout(() => setQuantas(i), 380 * i));
    }
    // a última aparece fora do lugar e é arrastada em passos de 25 cm
    const inicio = 380 * (ULTIMA + 1);
    const destino = MESAS[ULTIMA];
    timers.current.push(
      window.setTimeout(() => {
        setQuantas(MESAS.length);
        setArrasto({ ...PARTIDA });
        setSelecionada(destino.id);
      }, inicio)
    );
    const passos = 22;
    for (let p = 1; p <= passos; p++) {
      timers.current.push(
        window.setTimeout(() => {
          const t = p / passos;
          const suave = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          setArrasto({
            xCm: Math.round(PARTIDA.xCm + (destino.xCm - PARTIDA.xCm) * suave),
            yCm: Math.round(PARTIDA.yCm + (destino.yCm - PARTIDA.yCm) * suave),
          });
        }, inicio + 500 + p * 45)
      );
    }
    timers.current.push(
      window.setTimeout(() => {
        setArrasto(null);
        setSelecionada(null);
        setRodando(false);
      }, inicio + 500 + passos * 45 + 400)
    );
  }

  // toca sozinho quando entra na tela, uma vez — como a cascata do mapa.
  // O observador não dispara com a aba escondida (janela minimizada,
  // pré-visualização): por isso o relógio de segurança — se em 6 s nada
  // aconteceu, toca mesmo assim, e o botão "Ver de novo" cobre o resto.
  useEffect(() => {
    const el = alvo.current;
    let tocou = false;
    const uma = () => {
      if (tocou) return;
      tocou = true;
      tocar();
    };
    if (!el || typeof IntersectionObserver === "undefined") {
      uma();
      return;
    }
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          uma();
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    const seguranca = window.setTimeout(uma, 6000);
    return () => {
      io.disconnect();
      window.clearTimeout(seguranca);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mesas = MESAS.slice(0, quantas).map((m, i) =>
    i === ULTIMA && arrasto ? { ...m, xCm: arrasto.xCm, yCm: arrasto.yCm } : m
  );
  const ocupacao = new Map(mesas.map((m) => [m.id, OCUPACAO[m.id] ?? ""]));
  const vazio = new Set<string>();

  return (
    <section
      ref={alvo}
      style={{
        maxWidth: "1080px",
        margin: "clamp(56px,7vw,88px) auto 0",
        padding: "0 clamp(20px,4vw,28px)",
      }}
    >
      <span style={{ display: "block", margin: "0 0 10px", fontFamily: F_MONO, fontSize: "11px", fontWeight: "500", letterSpacing: ".06em", textTransform: "uppercase", color: "#928A81" }}>
        Mesas · croqui do salão
      </span>
      <h2 style={{ margin: "0 0 12px", maxWidth: "26ch", fontFamily: F_TITLE, fontWeight: "600", fontSize: "clamp(23px,3.2vw,34px)", lineHeight: "1.15", letterSpacing: "-0.028em", textWrap: "pretty" }}>
        O salão desenhado em escala, com as cadeiras no lugar.
      </h2>
      <p style={{ margin: "0", maxWidth: "60ch", fontSize: "16.5px", lineHeight: "1.6", color: "#6B6259" }}>
        Ela informa a medida do salão e arrasta as mesas. O sistema desenha as
        cadeiras de cada uma, avisa quando duas mesas se encostam ou uma bloqueia
        a saída, e mostra quantos convidados já sentaram em cada mesa.
      </p>

      {/* a aba Mesas, como no sistema: barra de ferramentas e o croqui */}
      <div style={{ marginTop: "clamp(24px,3vw,36px)", borderRadius: "14px", border: "1px solid #E6E0D8", background: "#fafaf9", padding: "16px", boxShadow: "0 1px 2px rgba(34,30,27,.04),0 14px 34px rgba(34,30,27,.07)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "12px", fontFamily: "var(--font-ui), 'Instrument Sans', sans-serif" }}>
          <span style={{ display: "inline-flex", alignItems: "center", height: "34px", padding: "0 12px", borderRadius: "8px", background: "#1c1917", color: "#fff", fontSize: "13.5px", fontWeight: 500 }}>+ Mesa</span>
          <span data-hide-sm="1" style={{ display: "inline-flex", alignItems: "center", height: "34px", padding: "0 10px", borderRadius: "8px", border: "1px solid #d6d3d1", background: "#fff", color: "#374151", fontSize: "13.5px" }}>Elemento do espaço ▾</span>
          <span data-hide-sm="1" style={{ display: "inline-flex", alignItems: "center", height: "34px", padding: "0 12px", borderRadius: "8px", border: "1px solid #d6d3d1", background: "#fff", color: "#374151", fontSize: "13.5px", fontWeight: 500 }}>+ Elemento</span>
          <span data-hide-sm="1" style={{ display: "inline-flex", alignItems: "center", height: "34px", padding: "0 12px", borderRadius: "8px", border: "1px solid #d6d3d1", background: "#fff", color: "#374151", fontSize: "13.5px", fontWeight: 500 }}>Importar planta</span>
          <span style={{ marginLeft: "auto", fontSize: "13.5px", color: "#6b7280" }}>Salão · {LARGURA / 100} × {ALTURA / 100} m</span>
          <button
            type="button"
            onClick={tocar}
            disabled={rodando}
            style={{ height: "34px", padding: "0 12px", borderRadius: "8px", border: "1px solid #6E3F5F", background: "#fff", color: "#6E3F5F", fontFamily: "inherit", fontSize: "13px", fontWeight: 600, cursor: rodando ? "default" : "pointer", opacity: rodando ? 0.5 : 1 }}
          >
            Ver de novo
          </button>
        </div>

        <Croqui
          larguraCm={LARGURA}
          alturaCm={ALTURA}
          mesas={mesas}
          elementos={ELEMENTOS}
          ocupacao={ocupacao}
          comProblema={vazio}
          sobrepostasIds={vazio}
          saidaObstruidaIds={vazio}
          selecionada={selecionada}
          editavel={false}
          planta={null}
          aoSelecionar={() => {}}
          aoMover={() => {}}
          aoSoltarConvidado={() => {}}
        />

        <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#6b7280", fontFamily: "var(--font-ui), 'Instrument Sans', sans-serif" }}>
          {quantas < MESAS.length
            ? `${quantas} de ${MESAS.length} mesas no salão`
            : `${MESAS.length} mesas · ${Object.values(OCUPACAO).reduce((s, v) => s + Number(v.split("/")[0]), 0)} convidados sentados`}
          {arrasto ? " · arrastando a Mesa 8" : ""}
        </p>
      </div>
    </section>
  );
}
