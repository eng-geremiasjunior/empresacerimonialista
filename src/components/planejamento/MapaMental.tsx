"use client";

// Mapa mental (handoff "animação de entrada + Copiloto contextual").
// PANORAMA, SOMENTE LEITURA: o evento no centro e os objetivos em volta.
// Toda edição acontece nos outros modos; aqui o clique só leva de volta.
//
// Duas camadas sobre o radial:
//   1. Cascata de entrada — dispara UMA vez ao abrir, do centro para fora na
//      ordem de prioridade, com as linhas traçando junto. Ensina por onde ler.
//      Roda uma vez e para: movimento perpétuo cansa quem usa o dia todo.
//   2. Apresentação guiada — o Copiloto narra quadro a quadro e o holofote
//      segue a narração: o nó em foco cresce e ganha elevação, os outros
//      recuam a 40%, a linha central até ele acende.
//
// Regra absoluta do Copiloto: cada frase é rastreável a um número real do
// dado. Ele descreve o que É — nunca sugere, nunca opina, nunca prioriza.
//
// Nota de paleta: o handoff veio na paleta quente do Celebra Pro; como o
// mapa vive dentro do Planejamento (neutro frio), os PAPÉIS de cor foram
// mapeados para os neutros da tela. Estrutura, timings e easings são
// literais do handoff. Ameixa e sálvia são iguais nas duas paletas.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Decisao, Objetivo, Verba } from "@/lib/supabase/planejamento";
import {
  brl,
  C,
  dataBr,
  F_MONO,
  F_TITLE,
  F_UI,
  rotuloArquetipo,
  type Arquetipos,
} from "./celebra";

const SALVIA = "#6E7F63";

// ---- geometria do canvas lógico -------------------------------------
// O handoff fixa 1044×620 com raio 450/258. Essa elipse é ACHATADA: empilha
// os nós nas laterais e por isso exige uma caixa larguíssima, que a coluna
// real precisava reduzir a ~63% — o texto de 12,5px virava 8px, ilegível.
// Uma elipse quase circular acomoda os mesmos nós num canvas bem menor, e a
// escala que sobra vai toda para o conteúdo.
//
// Regra: o raio MÍNIMO que não colide — o mapa nunca maior do que precisa.
// Altura é barata (a página rola); largura é o recurso escasso.

const CARD_W = 132;
// altura por nome de VERDADE, não pelo pior caso: pad (18) + dots (18) +
// meta (14) + borda (~6) = 56, mais 16 por linha de texto. O pior caso
// fixo (3 linhas = 104) obrigava TODO par vizinho a se afastar como se
// os dois cards fossem altos — e quase nenhum é.
function alturaEstimada(nome: string): number {
  const linhas = Math.min(3, Math.max(1, Math.ceil(nome.length / 15)));
  return 56 + linhas * 16;
}
const ASPECTO = 1.08;

// Recuo radial que varia com o ângulo: nas LATERAIS os vizinhos já se
// separam na vertical (o anel resolve sozinho); é em CIMA e EMBAIXO que
// eles disputam largura — e ali o card alternado recua para dentro, e a
// diferença de raio vira separação vertical. Resultado medido: com 16
// objetivos o raio cai a ~69% do que o anel único exigia, sem nenhuma
// sobreposição. (O pedido era −40%; cru, sobrepunha 42px — este é o
// menor raio que a física dos cards permite.)
function fatorDoNo(i: number, n: number, f0: number, k: number): number {
  if (i % 2 === 0) return 1;
  const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
  return 1 - (1 - f0) * Math.pow(Math.abs(Math.sin(a)), k);
}

function posicoes(n: number, rx: number, ry: number, f0: number, k: number) {
  const passo = 360 / Math.max(1, n);
  const p: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((-90 + i * passo) * Math.PI) / 180;
    const f = fatorDoNo(i, n, f0, k);
    p.push({ x: rx * f * Math.cos(a), y: ry * f * Math.sin(a) });
  }
  return p;
}

function colide(
  alturas: number[],
  rx: number,
  ry: number,
  f0: number,
  k: number
): boolean {
  const n = alturas.length;
  const p = posicoes(n, rx, ry, f0, k);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const hPar = (alturas[i] + alturas[j]) / 2;
      if (
        Math.abs(p[i].x - p[j].x) < CARD_W &&
        Math.abs(p[i].y - p[j].y) < hPar
      ) {
        return true;
      }
    }
  }
  return false;
}

function geometria(nomes: string[]) {
  const n = Math.max(1, nomes.length);
  const alturas = nomes.map(alturaEstimada);

  // Busca determinística do menor raio: para cada perfil de recuo, cresce
  // o raio até a checagem par-a-par ficar limpa; fica o perfil que fechou
  // menor. O arredondamento acontece DENTRO do laço: é a geometria
  // arredondada que vai para a tela, então é ela que passa no teste.
  let melhor: { rx: number; ry: number; f0: number; k: number } | null = null;
  for (const f0 of [1, 0.7, 0.65, 0.6, 0.55, 0.5]) {
    for (const k of f0 === 1 ? [1] : [1, 1.5, 2]) {
      let rx = 80;
      let ry = Math.round(rx * ASPECTO);
      while (rx < 1200 && colide(alturas, rx, ry, f0, k)) {
        rx += 2;
        ry = Math.round(rx * ASPECTO);
      }
      if (!melhor || rx < melhor.rx) melhor = { rx, ry, f0, k };
    }
  }
  const { rx, ry, f0, k } = melhor!;
  const hMax = Math.max(56, ...alturas);
  const W = 2 * rx + CARD_W;
  const H = 2 * ry + hMax;
  return {
    W,
    H,
    cx: W / 2,
    cy: H / 2,
    rx,
    ry,
    passo: 360 / n,
    fator: (i: number) => fatorDoNo(i, n, f0, k),
  };
}

// ---- dado do mapa, derivado do real ---------------------------------

type NoObjetivo = {
  id: string;
  nome: string;
  valor: number;
  feitas: number;
  total: number;
  pri: number; // ordem de leitura (1..n)
  decisoes: Decisao[];
  x: number;
  y: number;
};

// resolvido vai por último: já não disputa a atenção de ninguém
const BUCKET_PESO: Record<string, number> = {
  agora: 0,
  proximas: 1,
  depois: 2,
  concluido: 3,
};

function montarNos(objetivos: Objetivo[]): {
  nos: NoObjetivo[];
  g: ReturnType<typeof geometria>;
} {
  const ativos = objetivos.filter((o) => o.ativo);
  const g = geometria(ativos.map((o) => o.nome));

  // Ordem de PRIORIDADE (leitura): o que vence antes primeiro, depois o
  // peso das decisões. Diferente da posição angular, que segue a ordem do
  // método — assim o anel fica estável e a narração fica útil.
  const porPrioridade = [...ativos].sort((a, b) => {
    const pb = BUCKET_PESO[a.bucket] - BUCKET_PESO[b.bucket];
    if (pb !== 0) return pb;
    const maxA = Math.max(0, ...a.decisoes.map((d) => d.prioridade));
    const maxB = Math.max(0, ...b.decisoes.map((d) => d.prioridade));
    if (maxA !== maxB) return maxB - maxA;
    return a.ordem - b.ordem;
  });
  const pri = new Map(porPrioridade.map((o, i) => [o.id, i + 1]));

  const nos = ativos.map((o, i) => {
    const ang = ((-90 + i * g.passo) * Math.PI) / 180;
    const f = g.fator(i);
    const aplicaveis = o.decisoes.filter((d) => d.estado !== "nao_se_aplica");
    return {
      id: o.id,
      nome: o.nome,
      valor: Number(o.valorPrevisto ?? 0),
      feitas: aplicaveis.filter((d) => d.estado === "decidida").length,
      total: aplicaveis.length,
      pri: pri.get(o.id) ?? i + 1,
      decisoes: aplicaveis,
      x: g.cx + g.rx * f * Math.cos(ang),
      y: g.cy + g.ry * f * Math.sin(ang),
    };
  });
  return { nos, g };
}

// ---- Copiloto: todo texto vem de um campo do dado -------------------

type Linha = { texto: string; fortes: string[] };
type Quadro = {
  eyebrow: string;
  titulo: string;
  linhas: Linha[];
  decisoes?: { nome: string; feita: boolean }[];
  restantes?: number;
  plain: string; // para o cálculo do tempo de leitura
};

export function MapaMental({
  tipoEvento,
  objetivos,
  clienteNome,
  localEvento,
  dataEvento,
  diasAteEvento,
  escala,
  cenario,
  arquetipos,
  verba,
  onFechar,
  onIrParaObjetivo,
  onIrParaDecisao,
}: {
  tipoEvento: string;
  objetivos: Objetivo[];
  clienteNome: string | null;
  localEvento: string | null;
  dataEvento: string | null;
  diasAteEvento: number | null;
  escala: string | null;
  cenario: string | null;
  arquetipos: Arquetipos;
  verba: Verba;
  onFechar: () => void;
  onIrParaObjetivo: (objetivoId: string) => void;
  onIrParaDecisao: (d: Decisao) => void;
}) {
  // "Casamento" era fixo no título e no nó central — numa debutante lia
  // errado. O rótulo agora vem do tipo do evento.
  const ROTULO_TIPO: Record<string, string> = {
    casamento: "Casamento",
    debutante: "15 anos",
    bodas: "Bodas",
    aniversario: "Aniversário",
    formatura: "Formatura",
    batizado: "Batizado",
    cha_revelacao: "Chá revelação",
    corporativo: "Evento",
    outro: "Evento",
  };
  const rotuloTipo = ROTULO_TIPO[tipoEvento] ?? "Evento";

  const { nos, g } = useMemo(() => montarNos(objetivos), [objetivos]);
  const n = nos.length;

  const [view, setView] = useState<"radial" | "arvore">("radial");
  // Nó escolhido com um clique (0 = nenhum). Clicar NÃO navega mais:
  // mostra o objetivo no trilho lateral, e o segundo clique — ou o botão
  // do trilho — abre o modo Foco. A mudança brusca de tela era o problema.
  const [sel, setSel] = useState(0);
  const [phase, setPhase] = useState<"hidden" | "shown" | "ready">("hidden");
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [colW, setColW] = useState(0);

  const colRef = useRef<HTMLDivElement>(null);
  const tAvanco = useRef<number | null>(null);
  const tFase1 = useRef<number | null>(null);
  const tFase2 = useRef<number | null>(null);

  const reduzir =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ---- números derivados (handoff §Números derivados) ----
  const agg = useMemo(() => {
    const comprometido = verba.comprometido;
    const semDecisao = nos.filter((o) => o.feitas === 0).length;
    const feitas = nos.reduce((s, o) => s + o.feitas, 0);
    const total = nos.reduce((s, o) => s + o.total, 0);
    const maior = [...nos].sort((a, b) => b.valor - a.valor)[0] ?? null;
    return { comprometido, semDecisao, feitas, total, maior };
  }, [nos, verba.comprometido]);

  // ---- conteúdo de cada quadro ----
  const quadro = useCallback(
    (s: number): Quadro => {
      if (s === 0) {
        const contexto = [
          rotuloArquetipo(escala, arquetipos.escala),
          rotuloArquetipo(cenario, arquetipos.cenario),
          localEvento,
        ]
          .filter(Boolean)
          .join(" · ");
        const linhas: Linha[] = [];
        if (contexto || diasAteEvento !== null) {
          linhas.push({
            texto: `${contexto}${diasAteEvento !== null ? ` · faltam ${diasAteEvento} dias` : ""}`,
            fortes: diasAteEvento !== null ? [`${diasAteEvento} dias`] : [],
          });
        }
        linhas.push({
          texto: `${n} objetivos no mapa · ${agg.semDecisao} ainda sem nenhuma decisão`,
          fortes: [String(n), String(agg.semDecisao)],
        });
        linhas.push({
          texto: `${agg.feitas} de ${agg.total} decisões resolvidas`,
          fortes: [String(agg.feitas), String(agg.total)],
        });
        if (verba.total !== null) {
          linhas.push({
            texto: `Verba ${brl(verba.total)} · ${brl(agg.comprometido)} comprometido · ${verba.saldo !== null ? brl(verba.saldo) : "—"} livre`,
            fortes: [
              brl(verba.total),
              brl(agg.comprometido),
              verba.saldo !== null ? brl(verba.saldo) : "",
            ].filter(Boolean),
          });
        }
        if (agg.maior && agg.maior.valor > 0) {
          linhas.push({
            texto: `Maior verba prevista · ${agg.maior.nome} · ${brl(agg.maior.valor)}`,
            fortes: [agg.maior.nome, brl(agg.maior.valor)],
          });
        }
        return {
          eyebrow: playing ? "Panorama" : "Panorama · só leitura",
          titulo: clienteNome ? `${rotuloTipo} ${clienteNome}` : "Panorama do evento",
          linhas,
          plain: linhas.map((l) => l.texto).join(" "),
        };
      }

      const o = nos.find((x) => x.pri === s);
      if (!o) return { eyebrow: "", titulo: "", linhas: [], plain: "" };
      const linhas: Linha[] = [];
      if (o.valor > 0) {
        const pct =
          agg.comprometido > 0
            ? Math.round((o.valor / agg.comprometido) * 100)
            : 0;
        linhas.push({
          texto: `Verba prevista · ${brl(o.valor)} · ${pct}% do comprometido`,
          fortes: [brl(o.valor), `${pct}%`],
        });
      } else {
        linhas.push({
          texto: "Sem verba prevista neste objetivo",
          fortes: [],
        });
      }
      linhas.push({
        texto: `${o.feitas} de ${o.total} decisões resolvidas`,
        fortes: [String(o.feitas), String(o.total)],
      });
      const mostradas = o.decisoes.slice(0, 5);
      return {
        eyebrow: `Quadro ${s} de ${n}`,
        titulo: o.nome,
        linhas,
        decisoes: mostradas.map((d) => ({
          nome: d.titulo,
          feita: d.estado === "decidida",
        })),
        restantes: Math.max(0, o.total - mostradas.length),
        plain: `${o.nome} ${linhas.map((l) => l.texto).join(" ")} ${mostradas
          .map((d) => d.titulo)
          .join(" ")}`,
      };
    },
    [nos, n, agg, verba, escala, cenario, arquetipos, localEvento, diasAteEvento, clienteNome, playing]
  );

  // ---- ritmo: tempo de LEITURA do quadro ----
  const duracao = useCallback(
    (s: number) => {
      const palavras = quadro(s).plain.trim().split(/\s+/).length;
      const wpm = 230; // leitura calma
      return Math.min(5500, Math.max(2600, Math.round((palavras / wpm) * 60000) + 500));
    },
    [quadro]
  );

  // ---- máquina da apresentação ----
  // O auto-avanço é re-armado explicitamente a cada quadro (o handoff avisa
  // que depender de efeito genérico não dispara de forma confiável).
  const avancar = useCallback(
    (s: number) => {
      if (tAvanco.current) window.clearTimeout(tAvanco.current);
      if (s > n) {
        setPlaying(false);
        setStep(0);
        return;
      }
      const alvo = Math.max(0, s);
      setPlaying(true);
      setStep(alvo);
      tAvanco.current = window.setTimeout(
        () => avancar(alvo + 1),
        duracao(alvo)
      );
    },
    [n, duracao]
  );

  const parar = useCallback(() => {
    if (tAvanco.current) window.clearTimeout(tAvanco.current);
    tAvanco.current = null;
    setPlaying(false);
    setStep(0);
  }, []);

  // ---- cascata de entrada: dispara uma vez, ao montar (= ao abrir) ----
  useEffect(() => {
    if (reduzir) {
      setPhase("ready");
      return;
    }
    tFase1.current = window.setTimeout(() => setPhase("shown"), 60);
    tFase2.current = window.setTimeout(
      () => setPhase("ready"),
      300 + n * 70 + 650
    );
    return () => {
      if (tFase1.current) window.clearTimeout(tFase1.current);
      if (tFase2.current) window.clearTimeout(tFase2.current);
    };
  }, [reduzir, n]);

  useEffect(
    () => () => {
      if (tAvanco.current) window.clearTimeout(tAvanco.current);
    },
    []
  );

  // Esc fecha
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  // ---- escala para caber na coluna (sem cortar, sem pan) ----
  useEffect(() => {
    const el = colRef.current;
    if (!el) return;
    const medir = () => setColW(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  const fit = colW > 0 ? Math.min(1, Math.max(0.28, (colW - 40) / g.W)) : 1;
  const entrando = phase !== "ready";
  const ativo = playing ? step : sel;
  const q = quadro(ativo);
  const noSel = sel > 0 ? (nos.find((x) => x.pri === sel) ?? null) : null;

  // ---- estilo de um nó, nas três situações (entrada, holofote, neutro) --
  function estiloNo(no: NoObjetivo) {
    const emFoco = playing ? step === no.pri : sel === no.pri;
    const recuado = playing && step !== no.pri;
    const preterido = !playing && sel > 0 && sel !== no.pri;
    const delay = 150 + (no.pri - 1) * 70;

    // nasce ~40% mais perto do centro
    const offX = entrando && phase === "hidden" ? (g.cx - no.x) * 0.4 : 0;
    const offY = entrando && phase === "hidden" ? (g.cy - no.y) * 0.4 : 0;
    const escalaNo =
      entrando && phase === "hidden" ? 0.9 : emFoco ? 1.06 : recuado ? 0.96 : 1;

    const base: React.CSSProperties = {
      position: "absolute",
      left: no.x,
      top: no.y,
      width: CARD_W,
      transform: `translate(-50%,-50%) translate(${offX}px,${offY}px) scale(${escalaNo})`,
      opacity:
        entrando && phase === "hidden" ? 0 : recuado ? 0.4 : preterido ? 0.72 : 1,
      background: "#fff",
      border: `1px solid ${emFoco ? C.ameixa : C.bordaSutil}`,
      borderRadius: 10,
      padding: "9px 11px",
      textAlign: "left",
      cursor: "pointer",
      zIndex: emFoco ? 5 : 1,
      boxShadow: emFoco
        ? "0 0 0 3px rgba(110,63,95,.16), 0 12px 30px rgba(34,30,27,.14)"
        : "none",
    };

    if (reduzir) return { ...base, transition: "none", opacity: 1, transform: `translate(-50%,-50%)` };
    return {
      ...base,
      transition: entrando
        ? `opacity 380ms ease ${delay}ms, transform 560ms cubic-bezier(0.34,1.4,0.64,1) ${delay}ms`
        : "opacity 280ms ease, transform 320ms cubic-bezier(0.22,0.61,0.36,1), border-color 260ms ease, box-shadow 300ms ease",
    };
  }

  const centroEmFoco = playing && step === 0;
  const centroRecuado = playing && step > 0;

  // ---------------------------------------------------------------- UI
  return (
    <div
      style={{
        border: `1px solid ${C.bordaForte}`,
        borderRadius: 14,
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,.04)",
      }}
    >
      {/* header do painel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          borderBottom: `1px solid ${C.bordaSutil}`,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: F_TITLE,
            fontWeight: 600,
            fontSize: 17,
            letterSpacing: "-0.02em",
            color: C.tinta,
          }}
        >
          Mapa mental
        </span>
        <span
          style={{
            padding: "3px 9px",
            borderRadius: 999,
            background: C.zona,
            fontFamily: F_MONO,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: C.secundario,
          }}
        >
          somente leitura
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 180,
            fontFamily: F_UI,
            fontSize: 13,
            color: C.meta,
          }}
        >
          Arquitetura do casamento de uma olhada. Clicar num nó leva à decisão
          no modo Foco.
        </span>
        <span
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            borderRadius: 999,
            background: C.zona,
          }}
        >
          {(["radial", "arvore"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                border: "none",
                background: view === v ? C.tinta : "transparent",
                fontFamily: F_MONO,
                fontSize: 11,
                color: view === v ? "#fff" : C.secundario,
                cursor: "pointer",
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              {v === "radial" ? "radial" : "árvore"}
            </button>
          ))}
        </span>
        <button
          type="button"
          onClick={onFechar}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 32,
            padding: "0 12px",
            border: `1px solid ${C.bordaMedia}`,
            borderRadius: 8,
            background: "#fff",
            fontFamily: F_TITLE,
            fontWeight: 600,
            fontSize: 13,
            color: C.tinta,
            cursor: "pointer",
          }}
        >
          Fechar <X size={13} />
        </button>
      </div>

      {/* corpo: mapa + trilho do copiloto */}
      <div style={{ display: "flex", alignItems: "stretch", flexWrap: "wrap" }}>
        <div ref={colRef} style={{ flex: 1, minWidth: 320, padding: "20px 0" }}>
          {view === "radial" ? (
            // clicar no fundo desfaz a seleção (os nós dão stopPropagation)
            <div
              onClick={() => setSel(0)}
              style={{
                position: "relative",
                height: g.H * fit,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  width: g.W,
                  height: g.H,
                  transform: `translateX(-50%) scale(${fit})`,
                  transformOrigin: "top center",
                }}
              >
                {/* linhas: traçam junto com a cascata, acendem no holofote */}
                <svg
                  width={g.W}
                  height={g.H}
                  style={{ position: "absolute", inset: 0 }}
                >
                  {nos.map((no) => {
                    const len = Math.hypot(no.x - g.cx, no.y - g.cy);
                    const acesa = playing ? step === no.pri : sel === no.pri;
                    const delay = 150 + (no.pri - 1) * 70;
                    return (
                      <line
                        key={no.id}
                        x1={g.cx}
                        y1={g.cy}
                        x2={no.x}
                        y2={no.y}
                        stroke={acesa ? C.ameixa : C.bordaSutil}
                        strokeWidth={acesa ? 2 : 1.5}
                        strokeDasharray={entrando ? len : undefined}
                        strokeDashoffset={
                          entrando && phase === "hidden" ? len : 0
                        }
                        opacity={playing && !acesa ? 0.35 : 1}
                        style={
                          reduzir
                            ? undefined
                            : {
                                transition: entrando
                                  ? `stroke-dashoffset 460ms ease ${delay}ms`
                                  : "stroke 260ms ease, opacity 280ms ease",
                              }
                        }
                      />
                    );
                  })}
                </svg>

                {/* nó central — entra primeiro, sem delay */}
                <div
                  style={{
                    position: "absolute",
                    left: g.cx,
                    top: g.cy,
                    width: 212,
                    transform: `translate(-50%,-50%) scale(${
                      entrando && phase === "hidden"
                        ? 0.82
                        : centroEmFoco
                          ? 1.05
                          : centroRecuado
                            ? 0.97
                            : 1
                    })`,
                    opacity:
                      entrando && phase === "hidden" ? 0 : centroRecuado ? 0.5 : 1,
                    background: C.tinta,
                    borderRadius: 14,
                    padding: "16px 18px",
                    zIndex: centroEmFoco ? 6 : 2,
                    boxShadow: centroEmFoco
                      ? "0 0 0 3px rgba(110,63,95,.16), 0 12px 30px rgba(34,30,27,.14)"
                      : "none",
                    transition: reduzir
                      ? "none"
                      : entrando
                        ? "opacity 300ms ease, transform 460ms cubic-bezier(0.34,1.4,0.64,1)"
                        : "opacity 280ms ease, transform 320ms cubic-bezier(0.22,0.61,0.36,1), box-shadow 300ms ease",
                  }}
                >
                  <div
                    style={{
                      fontFamily: F_TITLE,
                      fontWeight: 600,
                      fontSize: 18,
                      letterSpacing: "-0.02em",
                      color: "#fff",
                    }}
                  >
                    {clienteNome ?? rotuloTipo}
                  </div>
                  {(dataEvento || localEvento) && (
                    <div style={linhaCentro}>
                      {[dataEvento ? dataBr(dataEvento) : null, localEvento]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                  {(escala || cenario) && (
                    <div style={linhaCentro}>
                      {[
                        rotuloArquetipo(escala, arquetipos.escala),
                        rotuloArquetipo(cenario, arquetipos.cenario),
                      ]
                        .filter(Boolean)
                        .join(" · ")
                        .toLowerCase()}
                    </div>
                  )}
                  <div style={{ ...linhaCentro, color: "rgba(255,255,255,.9)" }}>
                    {[
                      verba.total !== null ? brl(verba.total) : null,
                      diasAteEvento !== null ? `faltam ${diasAteEvento} dias` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>

                {/* nós de objetivo */}
                {nos.map((no) => (
                  <button
                    key={no.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playing) parar();
                      if (sel === no.pri) onIrParaObjetivo(no.id);
                      else setSel(no.pri);
                    }}
                    title={
                      sel === no.pri
                        ? "Clique de novo para abrir no modo Foco"
                        : no.nome
                    }
                    style={estiloNo(no)}
                  >
                    <span
                      style={{
                        display: "block",
                        fontFamily: F_UI,
                        fontWeight: 600,
                        fontSize: 12.5,
                        lineHeight: "16px",
                        color: C.tinta,
                      }}
                    >
                      {no.nome}
                    </span>
                    <span style={{ display: "flex", gap: 3, margin: "5px 0 4px" }}>
                      {Array.from({ length: Math.min(no.total, 8) }).map((_, i) => (
                        <span
                          key={i}
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: i < no.feitas ? C.tinta : C.bordaSutil,
                          }}
                        />
                      ))}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontFamily: F_MONO,
                        fontSize: 10.5,
                        color: C.meta,
                      }}
                    >
                      {no.feitas}/{no.total} · {brl(no.valor)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ArvoreLista
              rotuloTipo={rotuloTipo}
              nos={nos}
              clienteNome={clienteNome}
              verbaTotal={verba.total}
              diasAteEvento={diasAteEvento}
              playing={playing}
              step={step}
              reduzir={!!reduzir}
              onIr={onIrParaObjetivo}
            />
          )}
        </div>

        {/* trilho do Copiloto */}
        <aside
          style={{
            width: 288,
            flexShrink: 0,
            borderLeft: `1px solid ${C.bordaSutil}`,
            background: C.zona,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "16px 18px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconeCopiloto />
              <span
                style={{
                  fontFamily: F_TITLE,
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: "-0.02em",
                  color: C.tinta,
                }}
              >
                Copiloto
              </span>
            </div>
            <span
              style={{
                display: "block",
                marginTop: 8,
                fontFamily: F_MONO,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: C.meta,
              }}
            >
              {q.eyebrow}
            </span>
          </div>

          {/* conteúdo troca com fade/slide curto (key reinicia a animação) */}
          <div
            key={step}
            style={{
              flex: 1,
              padding: "10px 18px 16px",
              animation: reduzir
                ? "planoCopilotoFade 200ms ease both"
                : "planoCopiloto 320ms cubic-bezier(0.22,0.61,0.36,1) both",
            }}
          >
            <style>{`
              @keyframes planoCopiloto { from { opacity:0; transform: translateY(7px) } to { opacity:1; transform:none } }
              @keyframes planoCopilotoFade { from { opacity:0 } to { opacity:1 } }
            `}</style>
            <h3
              style={{
                fontFamily: F_TITLE,
                fontWeight: 600,
                fontSize: 17,
                lineHeight: "23px",
                letterSpacing: "-0.02em",
                color: C.tinta,
                margin: "0 0 10px",
              }}
            >
              {q.titulo}
            </h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {q.linhas.map((l, i) => (
                <li
                  key={i}
                  style={{
                    position: "relative",
                    paddingLeft: 14,
                    marginBottom: 9,
                    fontFamily: F_UI,
                    fontSize: 12.5,
                    lineHeight: "18px",
                    color: C.corpo,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 7,
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: C.bordaMedia,
                    }}
                  />
                  <Realce texto={l.texto} fortes={l.fortes} />
                </li>
              ))}
            </ul>

            {q.decisoes && q.decisoes.length > 0 && (
              <>
                <div
                  style={{
                    marginTop: 14,
                    marginBottom: 8,
                    fontFamily: F_MONO,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: C.meta,
                  }}
                >
                  principais decisões
                </div>
                {q.decisoes.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 0",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: d.feita ? SALVIA : C.bordaSutil,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: F_UI,
                        fontSize: 12.5,
                        fontWeight: d.feita ? 500 : 400,
                        color: d.feita ? C.tinta : C.meta,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.nome}
                    </span>
                    <span
                      style={{
                        fontFamily: F_MONO,
                        fontSize: 10,
                        color: C.fantasma,
                        flexShrink: 0,
                      }}
                    >
                      {d.feita ? "feita" : "pendente"}
                    </span>
                  </div>
                ))}
                {q.restantes! > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: F_MONO,
                      fontSize: 10.5,
                      color: C.fantasma,
                    }}
                  >
                    +{q.restantes} decisões neste objetivo
                  </div>
                )}
              </>
            )}
          </div>

          {/* rodapé: ocioso = executar; tocando = transporte */}
          <div
            style={{
              padding: "12px 18px 16px",
              borderTop: `1px solid ${C.bordaSutil}`,
            }}
          >
            {!playing ? (
              <>
                {noSel && (
                  <>
                    <button
                      type="button"
                      onClick={() => onIrParaObjetivo(noSel.id)}
                      style={{
                        width: "100%",
                        height: 40,
                        borderRadius: 8,
                        border: "none",
                        background: C.ameixa,
                        color: "#fff",
                        fontFamily: F_TITLE,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        marginBottom: 8,
                      }}
                    >
                      Abrir no modo Foco →
                    </button>
                    <p
                      style={{
                        margin: "0 0 10px",
                        fontFamily: F_UI,
                        fontSize: 11,
                        lineHeight: "16px",
                        color: C.fantasma,
                      }}
                    >
                      Você será levada para o modo Foco, com este objetivo
                      aberto. Clicar de novo no cartão faz o mesmo.
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => avancar(0)}
                  style={{
                    width: "100%",
                    height: 40,
                    borderRadius: 8,
                    border: noSel ? `1px solid ${C.bordaSutil}` : "none",
                    background: noSel ? "#fff" : C.ameixa,
                    color: noSel ? C.tinta : "#fff",
                    fontFamily: F_TITLE,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Executar explicação
                </button>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontFamily: F_UI,
                    fontSize: 11,
                    lineHeight: "16px",
                    color: C.fantasma,
                  }}
                >
                  Leitura guiada quadro a quadro. Cada frase vem de um campo
                  deste mapa — o copiloto narra, não sugere.
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: F_MONO,
                    fontSize: 10.5,
                    color: C.secundario,
                    marginBottom: 6,
                  }}
                >
                  <span>
                    {step === 0 ? "Panorama" : `Quadro ${step} de ${n}`}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: C.bordaSutil,
                    borderRadius: 2,
                    overflow: "hidden",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: `${(step / n) * 100}%`,
                      height: "100%",
                      background: C.ameixa,
                      transition: "width 280ms ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => avancar(step - 1)}
                    disabled={step === 0}
                    style={{ ...btnTransporte, opacity: step === 0 ? 0.4 : 1 }}
                  >
                    ‹ Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => avancar(step + 1)}
                    style={btnTransporte}
                  >
                    Próximo ›
                  </button>
                  <button type="button" onClick={parar} style={btnTransporte}>
                    Parar
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* rodapé */}
      <div
        style={{
          padding: "10px 18px",
          borderTop: `1px solid ${C.bordaSutil}`,
          fontFamily: F_UI,
          fontSize: 11.5,
          color: C.fantasma,
        }}
      >
        Linha cheia = objetivo do evento · barrinhas = decisões resolvidas do
        objetivo.
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// peças auxiliares
// ------------------------------------------------------------------

const linhaCentro: React.CSSProperties = {
  marginTop: 4,
  fontFamily: F_MONO,
  fontSize: 11,
  lineHeight: "16px",
  color: "rgba(255,255,255,.62)",
};

const btnTransporte: React.CSSProperties = {
  flex: 1,
  height: 32,
  borderRadius: 8,
  border: `1px solid ${C.bordaMedia}`,
  background: "#fff",
  fontFamily: F_UI,
  fontSize: 11.5,
  color: C.tinta,
  cursor: "pointer",
};

// Números em mono e escuros; o texto de apoio fica em cinza. É o que faz
// a frase "ser um dado", não uma opinião.
function Realce({ texto, fortes }: { texto: string; fortes: string[] }) {
  if (fortes.length === 0) return <>{texto}</>;
  const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${fortes.map(escapa).join("|")})`, "g");
  return (
    <>
      {texto.split(re).map((p, i) =>
        fortes.includes(p) ? (
          <strong
            key={i}
            style={{
              fontFamily: F_MONO,
              fontWeight: 400,
              fontSize: 12,
              color: C.tinta,
            }}
          >
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function IconeCopiloto() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="7" stroke={C.ameixaClara} strokeWidth="1.2" />
      <circle cx="9" cy="9" r="2.2" fill={C.ameixa} />
      <path
        d="M9 1.4v2.2M9 14.4v2.2M1.4 9h2.2M14.4 9h2.2"
        stroke={C.ameixa}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Sub-modo árvore: mesma informação em lista, na ordem de prioridade, e
// recebendo o mesmo holofote da apresentação.
function ArvoreLista({
  rotuloTipo,
  nos,
  clienteNome,
  verbaTotal,
  diasAteEvento,
  playing,
  step,
  reduzir,
  onIr,
}: {
  rotuloTipo: string;
  nos: NoObjetivo[];
  clienteNome: string | null;
  verbaTotal: number | null;
  diasAteEvento: number | null;
  playing: boolean;
  step: number;
  reduzir: boolean;
  onIr: (id: string) => void;
}) {
  const ordenados = [...nos].sort((a, b) => a.pri - b.pri);
  return (
    <div style={{ padding: "0 20px" }}>
      <div
        style={{
          background: C.tinta,
          borderRadius: 14,
          padding: "14px 18px",
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
          opacity: playing && step > 0 ? 0.5 : 1,
          transition: reduzir ? "none" : "opacity 280ms ease",
        }}
      >
        <span
          style={{
            fontFamily: F_TITLE,
            fontWeight: 600,
            fontSize: 17,
            letterSpacing: "-0.02em",
            color: "#fff",
          }}
        >
          {clienteNome ?? rotuloTipo}
        </span>
        <span style={{ fontFamily: F_MONO, fontSize: 11, color: "rgba(255,255,255,.7)" }}>
          {[
            verbaTotal !== null ? brl(verbaTotal) : null,
            diasAteEvento !== null ? `faltam ${diasAteEvento} dias` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      <div style={{ marginTop: 10 }}>
        {ordenados.map((no) => {
          const emFoco = playing && step === no.pri;
          const recuado = playing && step !== no.pri;
          return (
            <button
              key={no.id}
              type="button"
              onClick={() => onIr(no.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${emFoco ? C.ameixa : "transparent"}`,
                borderRadius: 10,
                background: emFoco ? "#fff" : "transparent",
                borderBottom: emFoco
                  ? `1px solid ${C.ameixa}`
                  : `1px solid ${C.divisoria}`,
                opacity: recuado ? 0.4 : 1,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: emFoco ? "0 8px 24px rgba(34,30,27,.10)" : "none",
                transition: reduzir
                  ? "none"
                  : "opacity 280ms ease, border-color 260ms ease, box-shadow 300ms ease",
              }}
            >
              <span
                style={{
                  fontFamily: F_MONO,
                  fontSize: 11,
                  color: C.fantasma,
                  width: 20,
                  flexShrink: 0,
                }}
              >
                {String(no.pri).padStart(2, "0")}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: F_UI,
                  fontSize: 14,
                  color: C.tinta,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {no.nome}
              </span>
              <span style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                {Array.from({ length: Math.min(no.total, 8) }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: i < no.feitas ? C.tinta : C.bordaSutil,
                    }}
                  />
                ))}
              </span>
              <span
                style={{
                  fontFamily: F_MONO,
                  fontSize: 11,
                  color: C.meta,
                  width: 110,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {no.feitas}/{no.total} · {brl(no.valor)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
