"use client";

// O croqui em escala real. Um SVG só, sem biblioteca: o viewBox é o
// salão em centímetros (2000×1500 para 20×15 m), então a coordenada do
// banco é a coordenada do desenho — zero conversão.
//
// Toque e arrasto (30/09/2026, refeito para o celular): tocar seleciona
// qualquer peça — mesa ou elemento. No mouse a peça já arrasta no
// aperto, como antes; no dedo só arrasta a que está marcada, para que
// passear pelo salão nunca tire nada do lugar. Durante o movimento o
// estado é local; o banco só ouve no soltar, e só se a peça mudou de
// lugar. Snap de 25 cm ao vivo.
//
// `navegavel` liga o zoom: o salão abre inteiro (para ver) e aproxima
// para mexer — um toque numa mesa no celular já aproxima nela; pinça,
// Ctrl+roda (e a pinça do trackpad) e os botões − / + / "Salão inteiro".
// Aproximado, as cadeiras mostram as iniciais de quem senta.
//
// Sobreposição não é impedida — só marcada. Mesa em cima de mesa é
// problema dela, não do sistema.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import {
  caixaDaMesa,
  CADEIRA_TOTAL_CM,
  LARGURA_CADEIRA_CM,
  posicoesDasCadeiras,
  snap,
  type Elemento,
  type Mesa,
  type TipoElemento,
} from "@/lib/croqui-core";

type Peca = "mesa" | "elemento";
type PosLocal = { id: string; kind: Peca; x: number; y: number; x0: number; y0: number };
type Vista = { x: number; y: number; w: number; h: number };
type Gesto =
  | { tipo: "toque"; alvo: { kind: Peca; id: string } | null; x0: number; y0: number }
  | { tipo: "passeio"; x0: number; y0: number; vista0: Vista }
  | { tipo: "pinca"; d0: number; vista0: Vista; p0: { x: number; y: number } };

/** até aqui de movimento, o dedo ainda está "tocando", não passeando */
const TOQUE_PX = 8;
/** a cadeira precisa desse tamanho na tela para caber as iniciais */
const LEGIVEL_PX = 20;
/** o zoom máximo: 2,5 m de salão na largura da tela */
const MENOR_VISTA_CM = 250;

const COR_ELEMENTO: Record<TipoElemento, { fill: string; stroke: string; texto: string }> = {
  porta: { fill: "#f5f5f4", stroke: "#a8a29e", texto: "#57534e" },
  banheiro: { fill: "#f5f5f4", stroke: "#a8a29e", texto: "#57534e" },
  bar: { fill: "#fef3c7", stroke: "#d6b25e", texto: "#78350f" },
  praca_alimentacao: { fill: "#fef3c7", stroke: "#d6b25e", texto: "#78350f" },
  coluna: { fill: "#d6d3d1", stroke: "#78716c", texto: "#44403c" },
  saida_emergencia: { fill: "#fee2e2", stroke: "#ef4444", texto: "#991b1b" },
  pista: { fill: "#ede9fe", stroke: "#a78bfa", texto: "#5b21b6" },
  palco: { fill: "#e0e7ff", stroke: "#818cf8", texto: "#3730a3" },
};

const ROTULO_CURTO: Record<TipoElemento, string> = {
  porta: "Porta",
  banheiro: "WC",
  bar: "Bar",
  praca_alimentacao: "Alimentação",
  coluna: "",
  saida_emergencia: "SAÍDA",
  pista: "Pista",
  palco: "Palco",
};

/** o nome cabe na mesa: encolhe até 72% e, se ainda sobrar, corta */
function rotuloQueCabe(rotulo: string, fonte: number, largura: number): { texto: string; fonte: number } {
  const larguraDe = (t: string, f: number) => t.length * f * 0.56;
  let f = fonte;
  if (larguraDe(rotulo, f) > largura) f = Math.max(fonte * 0.72, largura / (rotulo.length * 0.56));
  if (larguraDe(rotulo, f) <= largura) return { texto: rotulo, fonte: f };
  const n = Math.max(2, Math.floor(largura / (f * 0.56)) - 1);
  return { texto: `${rotulo.slice(0, n).trimEnd()}…`, fonte: f };
}

export function Croqui({
  larguraCm,
  alturaCm,
  mesas,
  elementos,
  ocupacao,
  comProblema,
  sobrepostasIds,
  saidaObstruidaIds,
  selecionada,
  editavel,
  arrastavel = editavel,
  navegavel = false,
  ocupantes,
  apagadas,
  planta,
  aoSelecionar,
  aoMover,
  aoSoltarConvidado,
}: {
  larguraCm: number;
  alturaCm: number;
  mesas: Mesa[];
  elementos: Elemento[];
  /** mesaId → "7/8" */
  ocupacao: Map<string, string>;
  /** mesas com problema de gente (conflito, criança, lotação) */
  comProblema: Set<string>;
  sobrepostasIds: Set<string>;
  saidaObstruidaIds: Set<string>;
  /** id da peça marcada — mesa ou elemento */
  selecionada: string | null;
  /** false = só desenho (impresso, demonstração): nenhum toque responde */
  editavel: boolean;
  /** false = tocar seleciona mas nada se move (sentando um convidado) */
  arrastavel?: boolean;
  /** zoom, passeio e pinça (a tela de Mesas) */
  navegavel?: boolean;
  /** mesaId → o que vai escrito em cada cadeira, na ordem ("AM", "+") */
  ocupantes?: Map<string, string[]>;
  /** mesas esmaecidas (as que não cabem quem está sendo sentado) */
  apagadas?: Set<string>;
  /** planta baixa do local por baixo de tudo, já calibrada em cm.
   *  A url é assinada e temporária; o arquivo entra como <image>, nunca
   *  inline — SVG de terceiro não roda script assim. */
  planta?: {
    url: string;
    xCm: number;
    yCm: number;
    larguraCm: number;
    alturaCm: number;
    opacidade: number;
  } | null;
  aoSelecionar: (id: string | null) => void;
  aoMover: (kind: Peca, id: string, xCm: number, yCm: number) => void;
  aoSoltarConvidado: (mesaId: string, convidadoId: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [arrasto, setArrasto] = useState<PosLocal | null>(null);
  const grab = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  // a tela renderiza mais de um croqui (tela, impresso, demonstração):
  // cada um precisa dos SEUS ids de pattern, ou a grade some
  const uid = useId();
  const gradeFina = `grade-fina-${uid}`;
  const gradeMetro = `grade-metro-${uid}`;

  /* ---------- a vista (zoom) ---------- */

  const baseX = -120;
  const baseY = -120;
  const baseW = larguraCm + 180;
  const baseH = alturaCm + 180;

  const [vista, setVista] = useState<Vista | null>(null);
  const vistaRef = useRef<Vista | null>(null);
  const [alturaZoom, setAlturaZoom] = useState<number | null>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<Gesto | null>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setTam({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** no celular o croqui aproximado cresce para caber a mão; no
   *  computador fica do tamanho que já tem na tela (nada pula) */
  const alturaDaTela = useCallback(
    // celular = a TELA estreita (o mesmo md: do Tailwind), não o croqui:
    // no computador a coluna do croqui também passa de 768 px por pouco
    (r: { width: number; height: number }) =>
      window.innerWidth < 768 ? Math.round(window.innerHeight * 0.62) : r.height || (r.width * baseH) / baseW,
    [baseW, baseH]
  );

  /** o salão inteiro, no formato (altura/largura) da tela */
  const vistaInteira = useCallback(
    (asp: number): Vista => {
      if (baseH / baseW > asp) {
        const w = baseH / asp;
        return { x: baseX - (w - baseW) / 2, y: baseY, w, h: baseH };
      }
      const h = baseW * asp;
      return { x: baseX, y: baseY - (h - baseH) / 2, w: baseW, h };
    },
    [baseX, baseY, baseW, baseH]
  );

  /** prende a vista no salão; aberta demais = volta ao salão inteiro */
  const limitar = useCallback(
    (v: Vista, asp: number): Vista | null => {
      if (v.w >= vistaInteira(asp).w * 0.97) return null;
      const w = Math.max(MENOR_VISTA_CM, v.w);
      const h = w * asp;
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      const x = Math.min(Math.max(cx - w / 2, baseX - w * 0.3), baseX + baseW - w * 0.7);
      const y = Math.min(Math.max(cy - h / 2, baseY - h * 0.3), baseY + baseH - h * 0.7);
      return { x, y, w, h };
    },
    [vistaInteira, baseX, baseY, baseW, baseH]
  );

  const aplicar = useCallback(
    (v: Vista | null) => {
      const el = svgRef.current;
      if (v && !vistaRef.current && el) {
        setAlturaZoom(alturaDaTela(el.getBoundingClientRect()));
        // no celular, aproximar também encosta o croqui no alto da tela:
        // o que sobra embaixo é da folha da mesa
        if (window.innerWidth < 768) {
          const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          requestAnimationFrame(() => el.scrollIntoView({ block: "start", behavior: suave ? "smooth" : "auto" }));
        }
      }
      if (!v) setAlturaZoom(null);
      vistaRef.current = v;
      setVista(v);
    },
    [alturaDaTela]
  );

  /** a vista de onde um gesto parte, no formato atual da tela */
  const vistaDePartida = useCallback((): { v: Vista; asp: number } => {
    const el = svgRef.current;
    const r = el?.getBoundingClientRect();
    const largura = r?.width || 1;
    if (vistaRef.current) return { v: vistaRef.current, asp: vistaRef.current.h / vistaRef.current.w };
    const asp = alturaDaTela({ width: largura, height: r?.height || 0 }) / largura;
    return { v: vistaInteira((r?.height || largura) / largura), asp };
  }, [alturaDaTela, vistaInteira]);

  // o salão mudou de medida: começa de novo, inteiro
  useEffect(() => {
    aplicar(null);
  }, [larguraCm, alturaCm, aplicar]);

  // a tela mudou de tamanho com a vista aberta: acerta o formato
  useEffect(() => {
    if (!vista || tam.w === 0 || tam.h === 0) return;
    const h = vista.w * (tam.h / tam.w);
    if (Math.abs(h - vista.h) > 1) aplicar({ ...vista, y: vista.y + (vista.h - h) / 2, h });
  }, [tam.w, tam.h, vista, aplicar]);

  function zoomPelosBotoes(fator: number) {
    const { v, asp } = vistaDePartida();
    const w = v.w * fator;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    aplicar(limitar({ x: cx - w / 2, y: cy - (w * asp) / 2, w, h: w * asp }, asp));
  }

  function aproximarNa(id: string) {
    const m = mesas.find((x) => x.id === id);
    if (!m) return;
    const c = caixaDaMesa(m);
    const { asp } = vistaDePartida();
    // a mesa com as cadeiras ocupa ~45% da largura: as iniciais cabem e
    // ainda se vê a vizinhança
    const w = Math.max(420, (Math.max(c.largura, c.altura) + CADEIRA_TOTAL_CM * 2) * 2.2);
    const cx = c.x + c.largura / 2;
    const cy = c.y + c.altura / 2;
    // a mesa no terço de cima: no celular a folha dela cobre o pé da tela
    const acima = window.innerWidth < 768 ? 0.36 : 0.5;
    aplicar(limitar({ x: cx - w / 2, y: cy - w * asp * acima, w, h: w * asp }, asp));
  }

  // Ctrl+roda e a pinça do trackpad (que chega como Ctrl+roda): o
  // ouvinte precisa ser nativo e não passivo para segurar a página
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !navegavel || !editavel) return;
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { v, asp } = vistaDePartida();
      const r = el.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      const px = v.x + fx * v.w;
      const py = v.y + fy * v.h;
      const w = v.w * Math.exp(e.deltaY * 0.01);
      const h = w * asp;
      aplicar(limitar({ x: px - fx * w, y: py - fy * h, w, h }, asp));
    };
    el.addEventListener("wheel", roda, { passive: false });
    return () => el.removeEventListener("wheel", roda);
  }, [navegavel, editavel, vistaDePartida, limitar, aplicar]);

  /* ---------- toque, arrasto, passeio e pinça ---------- */

  function pontoSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function capturar(pointerId: number) {
    // a captura garante o soltar fora do SVG; se o browser recusar
    // (pointer já encerrado), o gesto segue sem ela
    try {
      svgRef.current?.setPointerCapture(pointerId);
    } catch {
      /* segue sem captura */
    }
  }

  function iniciarArrasto(e: React.PointerEvent, kind: Peca, id: string) {
    const alvo = kind === "mesa" ? mesas.find((m) => m.id === id) : elementos.find((el) => el.id === id);
    if (!alvo) return;
    e.preventDefault();
    capturar(e.pointerId);
    const p = pontoSvg(e.clientX, e.clientY);
    grab.current = { dx: p.x - alvo.xCm, dy: p.y - alvo.yCm };
    setArrasto({ id, kind, x: alvo.xCm, y: alvo.yCm, x0: alvo.xCm, y0: alvo.yCm });
    if (id !== selecionada) aoSelecionar(id);
  }

  function moverArrasto(e: React.PointerEvent) {
    if (!arrasto) return;
    const alvo =
      arrasto.kind === "mesa"
        ? mesas.find((m) => m.id === arrasto.id)
        : elementos.find((el) => el.id === arrasto.id);
    if (!alvo) return;
    const caixa =
      arrasto.kind === "mesa"
        ? caixaDaMesa(alvo as Mesa)
        : { largura: (alvo as Elemento).larguraCm, altura: (alvo as Elemento).alturaCm };
    const p = pontoSvg(e.clientX, e.clientY);
    const x = Math.max(0, Math.min(snap(p.x - grab.current.dx), larguraCm - caixa.largura));
    const y = Math.max(0, Math.min(snap(p.y - grab.current.dy), alturaCm - caixa.altura));
    if (x !== arrasto.x || y !== arrasto.y) setArrasto({ ...arrasto, x, y });
  }

  function aoApertar(e: React.PointerEvent<SVGSVGElement>) {
    if (!editavel) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // o segundo dedo: pinça (e o arrasto em curso é desfeito, sem gravar)
    if (ponteiros.current.size === 2 && navegavel) {
      setArrasto(null);
      const [a, b] = [...ponteiros.current.values()];
      const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const r = svgRef.current?.getBoundingClientRect();
      const { v } = vistaDePartida();
      const fx = r ? (meio.x - r.left) / r.width : 0.5;
      const fy = r ? (meio.y - r.top) / r.height : 0.5;
      gesto.current = {
        tipo: "pinca",
        d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        vista0: v,
        p0: { x: v.x + fx * v.w, y: v.y + fy * v.h },
      };
      for (const id of ponteiros.current.keys()) capturar(id);
      return;
    }
    if (ponteiros.current.size > 1) return;

    const peca = (e.target as Element).closest("[data-peca]") as SVGGElement | null;
    const kind = peca?.dataset.peca as Peca | undefined;
    const id = peca?.dataset.id;
    const dedo = e.pointerType === "touch";
    // no dedo só arrasta a peça marcada — e só aproximado: com o salão
    // inteiro o dedo também rola a página, e os dois brigariam
    const dedoPodeArrastar = id === selecionada && (!navegavel || !!vistaRef.current);
    if (arrastavel && kind && id && (!dedo || dedoPodeArrastar)) {
      iniciarArrasto(e, kind, id);
      gesto.current = null;
      return;
    }
    gesto.current = { tipo: "toque", alvo: kind && id ? { kind, id } : null, x0: e.clientX, y0: e.clientY };
  }

  function aoMoverPonteiro(e: React.PointerEvent<SVGSVGElement>) {
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;

    if (g?.tipo === "pinca") {
      const pts = [...ponteiros.current.values()];
      if (pts.length < 2) return;
      const [a, b] = pts;
      const d = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const r = svgRef.current?.getBoundingClientRect();
      if (!r) return;
      const asp = g.vista0.h / g.vista0.w;
      const w = (g.vista0.w * g.d0) / d;
      const h = w * asp;
      const fx = (meio.x - r.left) / r.width;
      const fy = (meio.y - r.top) / r.height;
      aplicar(limitar({ x: g.p0.x - fx * w, y: g.p0.y - fy * h, w, h }, asp));
      return;
    }

    if (arrasto) {
      moverArrasto(e);
      return;
    }

    if (g?.tipo === "toque") {
      const longe = Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > TOQUE_PX;
      if (!longe) return;
      // saiu do lugar: aproximado, vira passeio; inteiro, não é nada
      if (navegavel && vistaRef.current) {
        gesto.current = { tipo: "passeio", x0: g.x0, y0: g.y0, vista0: vistaRef.current };
        capturar(e.pointerId);
      } else {
        gesto.current = null;
        return;
      }
    }

    const p = gesto.current;
    if (p?.tipo === "passeio") {
      const r = svgRef.current?.getBoundingClientRect();
      if (!r) return;
      const cmPorPx = p.vista0.w / r.width;
      const asp = p.vista0.h / p.vista0.w;
      aplicar(
        limitar(
          {
            ...p.vista0,
            x: p.vista0.x - (e.clientX - p.x0) * cmPorPx,
            y: p.vista0.y - (e.clientY - p.y0) * cmPorPx,
          },
          asp
        )
      );
    }
  }

  function aoSoltar(e: React.PointerEvent<SVGSVGElement>) {
    ponteiros.current.delete(e.pointerId);

    if (arrasto) {
      // só grava se mudou de lugar: clicar numa mesa não é mover
      if (arrasto.x !== arrasto.x0 || arrasto.y !== arrasto.y0) {
        aoMover(arrasto.kind, arrasto.id, arrasto.x, arrasto.y);
      }
      setArrasto(null);
      gesto.current = null;
      return;
    }

    const g = gesto.current;
    if (g?.tipo === "pinca") {
      // o dedo que sobra não vira toque
      if (ponteiros.current.size === 0) gesto.current = null;
      return;
    }
    if (g?.tipo === "toque") {
      if (g.alvo) {
        aoSelecionar(g.alvo.id);
        // no dedo, com o salão inteiro, tocar numa mesa já aproxima nela
        if (navegavel && !vistaRef.current && e.pointerType === "touch" && g.alvo.kind === "mesa") {
          aproximarNa(g.alvo.id);
        }
      } else {
        aoSelecionar(null);
      }
    }
    gesto.current = null;
  }

  function aoCancelar(e: React.PointerEvent<SVGSVGElement>) {
    ponteiros.current.delete(e.pointerId);
    // o navegador tomou o gesto (rolagem da página): nada muda
    if (arrasto) setArrasto(null);
    gesto.current = null;
  }

  const posDe = (kind: Peca, id: string, x: number, y: number) =>
    arrasto && arrasto.kind === kind && arrasto.id === id
      ? { x: arrasto.x, y: arrasto.y }
      : { x, y };

  /* ---------- medidas do desenho ---------- */

  // quantos pixels cabem num centímetro, na vista de agora
  const pxPorCm =
    tam.w > 0 ? (vista ? tam.w / vista.w : Math.min(tam.w / baseW, tam.h / baseH || Infinity)) : 0;

  // marcas de metro na régua (uma a cada metro; número a cada 5 m)
  const marcasX = Array.from({ length: Math.floor(larguraCm / 100) + 1 }, (_, i) => i * 100);
  const marcasY = Array.from({ length: Math.floor(alturaCm / 100) + 1 }, (_, i) => i * 100);

  // tipografia do SVG: o viewBox está em cm, então os tamanhos escalam
  // com o salão — num salão de 20 m, fonte 36 ≈ 13 px na tela. Com zoom,
  // a letra para em 14 px: aproximar é para ver as cadeiras, não o nome
  // gigante.
  const fonteBase = Math.max(28, Math.round(larguraCm / 55));
  const fonte = navegavel && vista && pxPorCm > 0 ? Math.min(fonteBase, 14 / pxPorCm) : fonteBase;
  const mostrarIniciais =
    !!ocupantes && navegavel && pxPorCm > 0 && LARGURA_CADEIRA_CM * pxPorCm >= LEGIVEL_PX;
  const fonteCadeira = pxPorCm > 0 ? Math.min(20, 13 / pxPorCm) : 20;

  const touchAction = !editavel ? "auto" : navegavel ? (vista ? "none" : "pan-y") : "none";

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={vista ? `${vista.x} ${vista.y} ${vista.w} ${vista.h}` : `${baseX} ${baseY} ${baseW} ${baseH}`}
        preserveAspectRatio="xMidYMid meet"
        className={`w-full select-none rounded-xl border border-gray-200 bg-white ${vista ? "" : "h-auto"}`}
        style={{
          maxHeight: vista ? undefined : "72vh",
          height: vista && alturaZoom ? alturaZoom : undefined,
          // o cabeçalho e a barra de contagem ficam presos no alto
          scrollMarginTop: 156,
          touchAction,
        }}
        onPointerDown={aoApertar}
        onPointerMove={aoMoverPonteiro}
        onPointerUp={aoSoltar}
        onPointerCancel={aoCancelar}
      >
        <defs>
          <pattern id={gradeFina} width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="#f1f0ee" strokeWidth="2" />
          </pattern>
          <pattern id={gradeMetro} width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M100 0H0V100" fill="none" stroke="#e7e5e4" strokeWidth="2" />
          </pattern>
        </defs>

        {/* o piso do salão */}
        <rect x="0" y="0" width={larguraCm} height={alturaCm} fill="#fdfcfb" stroke="#d6d3d1" strokeWidth="4" />

        {/* a planta do local, se houver, entre o piso e a grade */}
        {planta && (
          <image
            href={planta.url}
            x={planta.xCm}
            y={planta.yCm}
            width={planta.larguraCm}
            height={planta.alturaCm}
            opacity={planta.opacidade / 100}
            preserveAspectRatio="xMidYMid meet"
            pointerEvents="none"
          />
        )}

        <rect x="0" y="0" width={larguraCm} height={alturaCm} fill={`url(#${gradeFina})`} pointerEvents="none" />
        <rect x="0" y="0" width={larguraCm} height={alturaCm} fill={`url(#${gradeMetro})`} pointerEvents="none" />

        {/* régua em metros */}
        {marcasX.map((x) => (
          <g key={`rx${x}`} pointerEvents="none">
            <line x1={x} y1={-24} x2={x} y2={0} stroke="#a8a29e" strokeWidth={x % 500 === 0 ? 4 : 2} />
            {x % 500 === 0 && (
              <text x={x} y={-44} textAnchor="middle" fontSize={fonte} fill="#78716c">
                {x / 100} m
              </text>
            )}
          </g>
        ))}
        {marcasY.map((y) => (
          <g key={`ry${y}`} pointerEvents="none">
            <line x1={-24} y1={y} x2={0} y2={y} stroke="#a8a29e" strokeWidth={y % 500 === 0 ? 4 : 2} />
            {y % 500 === 0 && y > 0 && (
              <text x={-40} y={y + fonte / 3} textAnchor="end" fontSize={fonte} fill="#78716c">
                {y / 100}
              </text>
            )}
          </g>
        ))}

        {/* elementos do espaço, por baixo das mesas */}
        {elementos.map((el) => {
          const { x, y } = posDe("elemento", el.id, el.xCm, el.yCm);
          const cor = COR_ELEMENTO[el.tipo];
          const rotulo = el.rotulo?.trim() || ROTULO_CURTO[el.tipo];
          const ativo = selecionada === el.id;
          return (
            <g
              key={el.id}
              data-peca="elemento"
              data-id={el.id}
              transform={`translate(${x} ${y})${el.rotacao ? ` rotate(${el.rotacao} ${el.larguraCm / 2} ${el.alturaCm / 2})` : ""}`}
              style={{ cursor: editavel ? (arrastavel ? "grab" : "pointer") : "default" }}
            >
              <rect
                width={el.larguraCm}
                height={el.alturaCm}
                rx={el.tipo === "coluna" ? el.larguraCm / 2 : 8}
                fill={cor.fill}
                stroke={ativo ? "#1c1917" : cor.stroke}
                strokeWidth={ativo ? 7 : el.tipo === "saida_emergencia" ? 5 : 3}
                strokeDasharray={!ativo && (el.tipo === "pista" || el.tipo === "palco") ? "14 10" : undefined}
              />
              {rotulo && el.larguraCm > 80 && (
                <text
                  x={el.larguraCm / 2}
                  y={el.alturaCm / 2 + fonte / 3}
                  textAnchor="middle"
                  fontSize={fonte}
                  fontWeight={el.tipo === "saida_emergencia" ? 700 : 500}
                  fill={cor.texto}
                  pointerEvents="none"
                >
                  {rotulo}
                </text>
              )}
            </g>
          );
        })}

        {/* mesas */}
        {mesas.map((m) => {
          const caixa = caixaDaMesa(m);
          const { x, y } = posDe("mesa", m.id, m.xCm, m.yCm);
          const redonda = caixa.raio != null;
          const ativa = selecionada === m.id;
          const alerta = comProblema.has(m.id);
          const sobre = sobrepostasIds.has(m.id);
          const obstruindo = saidaObstruidaIds.has(m.id);
          const apagada = apagadas?.has(m.id) ?? false;
          const quem = ocupantes?.get(m.id);
          const stroke = obstruindo
            ? "#ef4444"
            : sobre
              ? "#d97706"
              : ativa
                ? "#1c1917"
                : "#a8a29e";
          const nome = rotuloQueCabe(m.rotulo, fonte, caixa.largura * (redonda ? 0.78 : 0.86));
          return (
            <g
              key={m.id}
              data-peca="mesa"
              data-id={m.id}
              opacity={apagada ? 0.35 : 1}
              transform={`translate(${x} ${y})${m.rotacao ? ` rotate(${m.rotacao} ${caixa.largura / 2} ${caixa.altura / 2})` : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/vela-convidado");
                if (id) aoSoltarConvidado(m.id, id);
              }}
              style={{ cursor: editavel ? (arrastavel ? "grab" : "pointer") : "default" }}
            >
              <title>{m.rotulo}</title>
              {/* as cadeiras primeiro: a mesa fica por cima delas, como na
                  vista de cima real (o tampo esconde o encosto). Ocupada
                  fica escura; aproximado, ganha as iniciais de quem senta. */}
              {posicoesDasCadeiras(m).map((c, i) => {
                const rotulo = quem?.[i];
                const ocupada = rotulo != null;
                return (
                  <g key={i} pointerEvents="none">
                    <rect
                      x={c.x - LARGURA_CADEIRA_CM / 2}
                      y={c.y - LARGURA_CADEIRA_CM / 2}
                      width={LARGURA_CADEIRA_CM}
                      height={LARGURA_CADEIRA_CM}
                      rx={10}
                      transform={`rotate(${c.angulo} ${c.x} ${c.y})`}
                      fill={ocupada ? (mostrarIniciais ? "#ffffff" : "#d6d3d1") : "#f5f5f4"}
                      stroke={ocupada ? "#57534e" : ativa ? "#78716c" : "#d6d3d1"}
                      strokeWidth={3}
                      strokeDasharray={!ocupada && mostrarIniciais ? "8 6" : undefined}
                    />
                    {ocupada && mostrarIniciais && (
                      <text
                        x={c.x}
                        y={c.y + fonteCadeira * 0.36}
                        textAnchor="middle"
                        fontSize={fonteCadeira}
                        fontWeight={600}
                        fill="#292524"
                        transform={m.rotacao ? `rotate(${-m.rotacao} ${c.x} ${c.y})` : undefined}
                      >
                        {rotulo}
                      </text>
                    )}
                  </g>
                );
              })}
              {redonda ? (
                <circle
                  cx={caixa.raio}
                  cy={caixa.raio}
                  r={caixa.raio}
                  fill={ativa ? "#f5f5f4" : "#fafaf9"}
                  stroke={stroke}
                  strokeWidth={ativa || sobre || obstruindo ? 6 : 3}
                />
              ) : (
                <rect
                  width={caixa.largura}
                  height={caixa.altura}
                  rx={16}
                  fill={ativa ? "#f5f5f4" : "#fafaf9"}
                  stroke={stroke}
                  strokeWidth={ativa || sobre || obstruindo ? 6 : 3}
                />
              )}
              <text
                x={caixa.largura / 2}
                y={caixa.altura / 2 - nome.fonte * 0.15}
                textAnchor="middle"
                fontSize={nome.fonte}
                fontWeight={600}
                fill="#292524"
                pointerEvents="none"
              >
                {nome.texto}
              </text>
              <text
                x={caixa.largura / 2}
                y={caixa.altura / 2 + fonte}
                textAnchor="middle"
                fontSize={fonte * 0.85}
                fill={alerta ? "#b45309" : "#78716c"}
                pointerEvents="none"
              >
                {ocupacao.get(m.id) ?? ""}
              </text>
              {alerta && (
                <circle
                  cx={caixa.largura - fonte * 0.5}
                  cy={fonte * 0.5}
                  r={fonte * 0.55}
                  fill="#f59e0b"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </svg>

      {navegavel && editavel && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {vista && (
            <>
              <button
                type="button"
                onClick={() => aplicar(null)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white/95 px-2.5 text-xs font-medium text-gray-700 hover:border-gray-400"
              >
                <Maximize2 size={13} />
                Salão inteiro
              </button>
              <button
                type="button"
                aria-label="Afastar"
                onClick={() => zoomPelosBotoes(1.4)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white/95 text-gray-700 hover:border-gray-400"
              >
                <Minus size={14} />
              </button>
            </>
          )}
          <button
            type="button"
            aria-label="Aproximar"
            onClick={() => zoomPelosBotoes(1 / 1.6)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white/95 text-gray-700 hover:border-gray-400"
          >
            <Plus size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
