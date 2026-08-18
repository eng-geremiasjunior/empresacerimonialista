"use client";

// O croqui em escala real. Um SVG só, sem biblioteca: o viewBox é o
// salão em centímetros (2000×1500 para 20×15 m), então a coordenada do
// banco é a coordenada do desenho — zero conversão.
//
// Arrasto: pointerdown/move/up com setPointerCapture (o mesmo esqueleto
// do canvas de assinatura do aceite). Durante o movimento o estado é
// local; o banco só ouve no soltar. Snap de 25 cm ao vivo, para a mesa
// "andar em passos" e a cerimonialista ver onde vai cair.
//
// Sobreposição não é impedida — só marcada. Mesa em cima de mesa é
// problema dela, não do sistema.

import { useId, useRef, useState } from "react";
import {
  caixaDaMesa,
  LARGURA_CADEIRA_CM,
  posicoesDasCadeiras,
  snap,
  type Elemento,
  type Mesa,
  type TipoElemento,
} from "@/lib/croqui-core";

type PosLocal = { id: string; kind: "mesa" | "elemento"; x: number; y: number };

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
  selecionada: string | null;
  /** false no celular: croqui vira leitura */
  editavel: boolean;
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
  aoMover: (kind: "mesa" | "elemento", id: string, xCm: number, yCm: number) => void;
  aoSoltarConvidado: (mesaId: string, convidadoId: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [arrasto, setArrasto] = useState<PosLocal | null>(null);
  const grab = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  // a tela renderiza mais de um croqui (desktop, celular, impresso):
  // cada um precisa dos SEUS ids de pattern, ou a grade some
  const uid = useId();
  const gradeFina = `grade-fina-${uid}`;
  const gradeMetro = `grade-metro-${uid}`;

  function pontoSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function iniciarArrasto(
    e: React.PointerEvent,
    kind: "mesa" | "elemento",
    id: string,
    x: number,
    y: number
  ) {
    if (!editavel) return;
    e.preventDefault();
    // a captura garante o soltar fora do SVG; se o browser recusar
    // (pointer já encerrado), o arrasto segue sem ela
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* segue sem captura */
    }
    const p = pontoSvg(e.clientX, e.clientY);
    grab.current = { dx: p.x - x, dy: p.y - y };
    setArrasto({ id, kind, x, y });
    aoSelecionar(id === selecionada ? id : kind === "mesa" ? id : null);
  }

  function moverArrasto(e: React.PointerEvent, largura: number, altura: number) {
    if (!arrasto) return;
    const p = pontoSvg(e.clientX, e.clientY);
    const x = Math.max(0, Math.min(snap(p.x - grab.current.dx), larguraCm - largura));
    const y = Math.max(0, Math.min(snap(p.y - grab.current.dy), alturaCm - altura));
    setArrasto({ ...arrasto, x, y });
  }

  function soltarArrasto() {
    if (!arrasto) return;
    aoMover(arrasto.kind, arrasto.id, arrasto.x, arrasto.y);
    setArrasto(null);
  }

  const posDe = (kind: "mesa" | "elemento", id: string, x: number, y: number) =>
    arrasto && arrasto.kind === kind && arrasto.id === id
      ? { x: arrasto.x, y: arrasto.y }
      : { x, y };

  // marcas de metro na régua (uma a cada metro; número a cada 5 m)
  const marcasX = Array.from({ length: Math.floor(larguraCm / 100) + 1 }, (_, i) => i * 100);
  const marcasY = Array.from({ length: Math.floor(alturaCm / 100) + 1 }, (_, i) => i * 100);

  // tipografia do SVG: o viewBox está em cm, então os tamanhos escalam
  // com o salão — num salão de 20 m, fonte 36 ≈ 13 px na tela
  const fonte = Math.max(28, Math.round(larguraCm / 55));

  return (
    <svg
      ref={svgRef}
      viewBox={`-120 -120 ${larguraCm + 180} ${alturaCm + 180}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-auto w-full touch-none select-none rounded-xl border border-gray-200 bg-white"
      style={{ maxHeight: "72vh" }}
      onPointerMove={(e) => {
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
        moverArrasto(e, caixa.largura, caixa.altura);
      }}
      onPointerUp={soltarArrasto}
      onPointerLeave={soltarArrasto}
      onClick={(e) => {
        if (e.target === svgRef.current) aoSelecionar(null);
      }}
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
        return (
          <g
            key={el.id}
            transform={`translate(${x} ${y})${el.rotacao ? ` rotate(${el.rotacao} ${el.larguraCm / 2} ${el.alturaCm / 2})` : ""}`}
            onPointerDown={(e) => iniciarArrasto(e, "elemento", el.id, el.xCm, el.yCm)}
            style={{ cursor: editavel ? "grab" : "default" }}
          >
            <rect
              width={el.larguraCm}
              height={el.alturaCm}
              rx={el.tipo === "coluna" ? el.larguraCm / 2 : 8}
              fill={cor.fill}
              stroke={cor.stroke}
              strokeWidth={el.tipo === "saida_emergencia" ? 5 : 3}
              strokeDasharray={el.tipo === "pista" || el.tipo === "palco" ? "14 10" : undefined}
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
        const stroke = obstruindo
          ? "#ef4444"
          : sobre
            ? "#d97706"
            : ativa
              ? "#1c1917"
              : "#a8a29e";
        return (
          <g
            key={m.id}
            transform={`translate(${x} ${y})${m.rotacao ? ` rotate(${m.rotacao} ${caixa.largura / 2} ${caixa.altura / 2})` : ""}`}
            onPointerDown={(e) => iniciarArrasto(e, "mesa", m.id, m.xCm, m.yCm)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/vela-convidado");
              if (id) aoSoltarConvidado(m.id, id);
            }}
            style={{ cursor: editavel ? "grab" : "pointer" }}
          >
            {/* as cadeiras primeiro: a mesa fica por cima delas, como na
                vista de cima real (o tampo esconde o encosto) */}
            {posicoesDasCadeiras(m).map((c, i) => (
              <rect
                key={i}
                x={c.x - LARGURA_CADEIRA_CM / 2}
                y={c.y - LARGURA_CADEIRA_CM / 2}
                width={LARGURA_CADEIRA_CM}
                height={LARGURA_CADEIRA_CM}
                rx={10}
                transform={`rotate(${c.angulo} ${c.x} ${c.y})`}
                fill="#f5f5f4"
                stroke={ativa ? "#78716c" : "#d6d3d1"}
                strokeWidth={3}
                pointerEvents="none"
              />
            ))}
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
              y={caixa.altura / 2 - fonte * 0.15}
              textAnchor="middle"
              fontSize={fonte}
              fontWeight={600}
              fill="#292524"
              pointerEvents="none"
            >
              {m.rotulo}
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
  );
}
