"use client";

// "O sistema por dentro" (23/09/2026): desenho do dono no Claude Design
// (design_handoff_sistema_por_dentro). Um cursor anda sozinho por 6 cenas
// em loop — Resumo → Planejamento → Financeiro → RSVP → Convidado →
// Portal da noiva. O miolo é gerado do .dc.html por
// ferramentas/sim/gerar-sistema-por-dentro.mjs; aqui vive a linha do
// tempo de cada cena e a escala.
//
// TAMANHO: a tela é um palco FIXO de 1120 × 680 reduzido por escala, como
// uma imagem — nunca esticado. escala = min(1, largura / 1120), e o
// invólucro recebe a altura 680 × escala (com transform o palco não ocupa
// espaço). Escala 0 nunca: sem largura medida, tenta no próximo quadro.

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { SistemaPorDentroMiolo } from "./SistemaPorDentroMiolo";

const LARGURA = 1120;
const ALTURA = 680;

const CSS = `
@keyframes goldSweep{0%{transform:translateX(-120%)}55%,100%{transform:translateX(320%)}}
@keyframes sdIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes sdToast{0%{opacity:0;transform:translate(-50%,8px)}10%,85%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,0)}}
.spd h1,.spd h2,.spd h3,.spd p{margin:0}
.spd button{font-family:inherit}
@media (max-width:620px){.spd .spd-g{padding:72px 20px!important}}
`;

type Sub = Record<string, boolean>;
type Estado = { scene: number; sub: Sub; cx: number; cy: number; cOp: number; ripple: number; rippleOp: number };

const LABELS = ["Resumo do evento", "Planejamento", "Financeiro", "RSVP", "O convidado", "Portal da noiva"];
const URLS = [
  "eorganizei.com.br/eventos/marina-e-teo",
  "eorganizei.com.br/eventos/marina-e-teo/planejamento",
  "eorganizei.com.br/eventos/marina-e-teo/financeiro",
  "eorganizei.com.br/eventos/marina-e-teo/rsvp",
  "eorganizei.com.br/confirmar/ana-souza",
  "eorganizei.com.br/portal/marina-e-teo",
];

// o QR fictício do convidado (mesma semente do protótipo)
function qr() {
  const n = 21;
  const c = 5;
  const cells = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const inF = (x: number, y: number) =>
    [[0, 0], [14, 0], [0, 14]].some(([fx, fy]) => x >= fx && x <= fx + 6 && y >= fy && y <= fy + 6);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (inF(x, y)) continue;
      if (rnd() > 0.52) cells.push(createElement("rect", { key: x + "-" + y, x: x * c, y: y * c, width: c, height: c, fill: "#332B24" }));
    }
  [[0, 0], [14, 0], [0, 14]].forEach(([fx, fy], i) => {
    cells.push(createElement("rect", { key: "f" + i, x: fx * c + 2.5, y: fy * c + 2.5, width: 30, height: 30, fill: "none", stroke: "#332B24", strokeWidth: 5 }));
    cells.push(createElement("rect", { key: "g" + i, x: fx * c + 10, y: fy * c + 10, width: 15, height: 15, fill: "#332B24" }));
  });
  return createElement("svg", { width: 126, height: 126, viewBox: "0 0 105 105" }, cells);
}
const QR = qr();

export function SistemaPorDentro() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [wrapH, setWrapH] = useState(ALTURA);
  const escala = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const parado = useRef(false);
  const [e, setE] = useState<Estado>({ scene: 0, sub: {}, cx: 640, cy: 340, cOp: 0, ripple: 0.3, rippleOp: 0 });

  const at = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const limpar = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const sub = (p: Sub) => setE((s) => ({ ...s, sub: { ...s.sub, ...p } }));

  const moveTo = (alvo: string) => {
    const st = stageRef.current;
    if (!st) return;
    const el = st.querySelector<HTMLElement>('[data-alvo="' + alvo + '"]');
    if (!el) return;
    // o cursor mora na área do app, abaixo da barra do navegador (40 px):
    // a conta é relativa a ela, não ao palco (no protótipo o cursor
    // parava 40 px abaixo do alvo)
    const base = (st.children[1] as HTMLElement | undefined) ?? st;
    const r = el.getBoundingClientRect();
    const s = base.getBoundingClientRect();
    const k = escala.current || 1;
    setE((x) => ({ ...x, cOp: 1, cx: (r.left + r.width / 2 - s.left) / k, cy: (r.top + r.height / 2 - s.top) / k }));
  };
  const click = (fn?: () => void) => {
    setE((x) => ({ ...x, ripple: 0.3, rippleOp: 1 }));
    at(30, () => setE((x) => ({ ...x, ripple: 1.4, rippleOp: 0 })));
    if (fn) at(160, fn);
  };

  const play = useCallback((scene: number) => {
    limpar();
    setE((x) => ({ ...x, scene, sub: {} }));
    // movimento reduzido: a cena fica parada; a troca é só pelos chips
    if (parado.current) {
      setE((x) => ({ ...x, cOp: 0, sub: { rails: true } }));
      return;
    }
    const next = (n: number, ms: number) => at(ms, () => play(n));
    if (scene === 0) {
      at(80, () => sub({ rails: true }));
      at(1200, () => moveTo("fase1"));
      at(1700, () => sub({ fase: true }));
      at(2400, () => click(() => play(1)));
    } else if (scene === 1) {
      at(80, () => sub({ rails: true }));
      at(800, () => moveTo("planTarefa"));
      at(1400, () => sub({ planHover: true }));
      at(2200, () => click(() => sub({ planOk: true, planHover: false })));
      at(4000, () => moveTo("tabFin"));
      at(4800, () => click(() => play(2)));
    } else if (scene === 2) {
      at(80, () => sub({ rails: true }));
      at(800, () => moveTo("btnPagar"));
      at(1600, () => click(() => sub({ pago: true, toast: true })));
      at(4000, () => moveTo("contaAss"));
      at(4800, () => click(() => sub({ ass: true, toast: false })));
      at(7000, () => moveTo("tabRsvp"));
      at(7800, () => click(() => play(3)));
    } else if (scene === 3) {
      at(80, () => sub({ rails: true }));
      at(700, () => moveTo("btnWhats"));
      at(1600, () => click(() => sub({ whats: true, toast: true })));
      at(3200, () => sub({ ana: true, sino: true }));
      next(4, 6200);
    } else if (scene === 4) {
      at(700, () => moveTo("simVou"));
      at(1500, () => click(() => sub({ sim: true })));
      at(2300, () => moveTo("acomp"));
      at(3000, () => click(() => sub({ acomp: true })));
      at(3700, () => moveTo("confirmar"));
      at(4400, () => click(() => sub({ pronto: true })));
      at(4700, () => setE((x) => ({ ...x, cOp: 0 })));
      next(5, 7600);
    } else if (scene === 5) {
      at(900, () => moveTo("decisao"));
      at(1500, () => sub({ decHover: true }));
      at(2400, () => click(() => sub({ decOk: true })));
      next(0, 7000);
    }
    // as funções auxiliares só usam refs e setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let raf = 0;
    const fit = () => {
      const w = wrapRef.current?.clientWidth ?? 0;
      if (!w) {
        raf = requestAnimationFrame(fit);
        return;
      }
      const s = Math.min(1, w / LARGURA);
      if (Math.abs(s - escala.current) > 0.001) {
        escala.current = s;
        setScale(s);
        setWrapH(Math.round(ALTURA * s));
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", fit);
    try {
      parado.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* sem matchMedia: anima */
    }
    play(0);
    return () => {
      limpar();
      ro.disconnect();
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(raf);
    };
    // monta uma vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sc = e.scene;
  const u = e.sub;
  const ok = !!u.planOk;
  const meses: [string, number, number, boolean?, boolean?][] = [
    ["Outubro '26", ok ? 3 : 2, 4, true, true],
    ["Novembro '26", 0, 3],
    ["Dezembro '26", 0, 2],
    ["Janeiro '27", 0, 1],
    ["Fevereiro '27", 0, 1],
    ["Março '27", 0, 1],
  ];
  const planMeses = meses.map(([nome, f, t, atual, venc]) => ({
    nome,
    razao: f + "/" + t,
    pct: Math.round((f / t) * 100) + "%",
    bd: atual ? "#6E2E34" : "transparent",
    bg: atual ? "#fff" : "transparent",
    fg: atual ? "#6E2E34" : "#221E1B",
    barCor: venc ? "#A5544B" : "#6E7F63",
    rc: venc ? "#A5544B" : "#928A81",
  }));
  const pago = !!u.pago;
  const ana = !!u.ana;
  const conf = { avBg: "#ECFDF5", avFg: "#047857", seloBg: "#ECFDF5", seloFg: "#047857", selo: "Confirmado" };
  const ag = { avBg: "#FFFBEB", avFg: "#92400E", seloBg: "#FFFBEB", seloFg: "#92400E", selo: "Aguardando" };
  const guests = [
    { ini: "AS", nome: "Ana Souza", det: ana ? "+1 acompanhante · se cadastrou pelo link" : "adicionado pela cliente", ...(ana ? conf : ag) },
    { ini: "BL", nome: "Bruno Lima", det: "+1 acompanhante · adicionado pela cliente", ...conf },
    { ini: "CM", nome: "Carla Mendes", det: "restrição: sem glúten · família da noiva", ...conf },
    { ini: "DR", nome: "Diego Rocha", det: "amigos do noivo · adicionado pela equipe", ...ag },
    { ini: "EF", nome: "Elisa Farias", det: "+2 acompanhantes · família do noivo", ...conf },
  ];
  const nConf = ana ? 97 : 96;
  const nAg = ana ? 37 : 38;
  const rails = !!u.rails;

  const valores = {
    chips: LABELS.map((label, i) => ({
      label,
      go: () => {
        setE((x) => ({ ...x, cOp: 0 }));
        play(i);
      },
      bg: sc === i ? "#6E2E34" : "#fff",
      fg: sc === i ? "#FAF8F5" : "#221E1B",
      bd: sc === i ? "#6E2E34" : "rgba(34,30,27,.15)",
    })),
    url: URLS[sc],
    wrapRef,
    stageRef,
    scale,
    wrapH,
    proArea: sc <= 3,
    s0: sc === 0,
    s1: sc === 1,
    s2: sc === 2,
    s3: sc === 3,
    s4: sc === 4,
    s5: sc === 5,
    planMeses,
    planFeitas: ok ? 9 : 8,
    planAbertas: ok ? 2 : 3,
    planDecididas: ok ? 2 : 1,
    planHover: u.planHover ? "#F2EEE9" : "transparent",
    planRingBg: ok ? "#5E7355" : "transparent",
    planRingBd: ok ? "#5E7355" : "#B4ADA4",
    planTxt: ok ? "#5E7355" : "#221E1B",
    planDeco: ok ? "line-through" : "none",
    planData: ok ? "decidida" : "20/10/2026",
    finVerba: !u.ass,
    finAss: !!u.ass,
    cvBd: u.ass ? "#E5E7EB" : "#221E1B",
    cvBg: u.ass ? "#fff" : "#FBFAF8",
    caBd: u.ass ? "#221E1B" : "#E5E7EB",
    caBg: u.ass ? "#FBFAF8" : "#fff",
    pago: pago ? "R$ 77.700,00" : "R$ 71.200,00",
    aPagar: pago ? "R$ 8.700,00" : "R$ 15.200,00",
    comprov: pago ? 13 : 12,
    nAbertas: pago ? 2 : 3,
    fcBg: pago ? "#EDF0EA" : "#F5ECD9",
    fcFg: pago ? "#5E7355" : "#A5813C",
    fcSelo: pago ? "pago · comprovante" : "vence em 16 dias",
    pagBg: "#fff",
    pagOp: pago ? 0 : 1,
    toastTxt:
      sc === 2 ? "Pagamento registrado · comprovante anexado à prestação de contas" : "WhatsApp aberto com a mensagem e o link do convite",
    rail1: rails ? "84%" : "0%",
    rail2: rails ? "84%" : "0%",
    rail3: rails ? "3%" : "0%",
    fase1Bg: u.fase || sc === 1 ? "#F3E9E6" : "#fff",
    tabResumoBd: sc === 0 ? "#1B1C1E" : "transparent",
    tabResumoFg: sc === 0 ? "#1B1C1E" : "#797E86",
    tabRsvpBd: sc === 3 ? "#1B1C1E" : "transparent",
    tabRsvpFg: sc === 3 ? "#1B1C1E" : "#797E86",
    tabFinBd: sc === 2 ? "#1B1C1E" : "transparent",
    tabFinFg: sc === 2 ? "#1B1C1E" : "#797E86",
    sino: u.sino ? 4 : 3,
    whatsBg: u.whats ? "#047857" : "#059669",
    toast: !!u.toast,
    guests,
    nConf,
    nAg,
    nPessoas: ana ? 130 : 128,
    barC: (nConf / 140) * 100 + "%",
    barA: (nAg / 140) * 100 + "%",
    convAberto: !u.pronto,
    convPronto: !!u.pronto,
    convPerguntas: !!u.sim,
    simBg: u.sim ? "#332B24" : "#fff",
    simFg: u.sim ? "#FDFBF7" : "#3A312A",
    simBd: u.sim ? "#332B24" : "#E7DFD2",
    acompTxt: u.acomp ? "Mais 1 pessoa" : "Vou sozinho(a)",
    confBg: "#332B24",
    qr: QR,
    decBg: u.decOk ? "#EDF0EA" : u.decHover ? "#F5EFE6" : "transparent",
    decTxt: u.decOk ? "enviado à Juliana ✓" : "até 20/01",
    decFg: u.decOk ? "#5E7355" : "#B08052",
    portalConv: "130 pessoas confirmadas · 37 aguardando",
    cx: e.cx,
    cy: e.cy,
    cOp: e.cOp,
    ripple: e.ripple,
    rippleOp: e.rippleOp,
  };

  return (
    <div className="spd">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <SistemaPorDentroMiolo {...valores} />
    </div>
  );
}
