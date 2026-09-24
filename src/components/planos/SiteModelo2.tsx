"use client";

// A página de vendas, modelo 2 (23/09/2026): desenho do dono no Claude
// Design (design_handoff_site_planos, Opção A · Convite). O miolo é
// gerado do .dc.html por ferramentas/sim/gerar-site-modelo2.mjs; aqui
// vive o que o protótipo fazia em script: a notificação que troca a cada
// 3,2 s, o tour de 6 passos que anda sozinho a cada 5 s (pausa com o
// mouse em cima e por 15 s depois de um clique) e o evento de teste, que
// não salva nada. Preços e limites chegam prontos do servidor (painel).

import { createElement, useEffect, useRef, useState } from "react";
import { SiteModelo2Miolo } from "./SiteModelo2Miolo";
import { SistemaPorDentro } from "./SistemaPorDentro";
import { hojeBR } from "@/lib/tempo";

export type PlanosDoSite = {
  precoEssencial: string;
  notaPromo: string | null;
  eventosEssencial: string;
  precoProfissional: string;
  eventosProfissional: string;
  precoMaster: string;
  eventosMaster: string;
};

const CSS = `
.s2{--eo-serif:var(--font-newsreader),Newsreader,Georgia,serif;--eo-sans:var(--font-ui),'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:clip}
.s2 *{box-sizing:border-box}
.s2 a{color:inherit;text-decoration:none}
.s2 a:hover{opacity:.75}
.s2 h1,.s2 h2,.s2 h3,.s2 p{margin:0;text-wrap:pretty}
.s2 button{font-family:inherit}
.s2 input::placeholder{color:#B4ADA4}
.s2 :focus-visible{outline:2px solid #6E2E34;outline-offset:2px}
@keyframes eoNotif{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes eoBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (prefers-reduced-motion:reduce){.s2 *{animation-duration:.01ms!important}}
/* os 4 planos rolam de lado quando não cabem (o desenho pedia; com
   minmax(0,1fr) eles se espremiam e cortavam) */
.s2 .s2-planos{grid-template-columns:repeat(4,minmax(200px,1fr))!important}
@media (max-width:760px){.s2 .s2-nav{display:none!important}}
@media (max-width:620px){
  .s2 .s2-g{padding-left:20px!important;padding-right:20px!important}
  /* no celular o herói empilha: a foto inteira em cima (ela à direita,
     a foto vem espelhada), o celular do fornecedor sobre a parte de baixo
     e a notificação embaixo — lado a lado, o celular tampava a foto */
  .s2 .s2-visual{min-height:0!important;display:flex;flex-direction:column}
  .s2 .s2-visual > div:nth-of-type(1){position:relative!important;inset:auto!important;width:100%;aspect-ratio:4/5}
  .s2 .s2-visual img{object-position:72% 40%!important}
  .s2 .s2-visual > p{left:0!important;padding-left:10px!important}
  .s2 .s2-visual > div:nth-of-type(2){position:relative!important;left:auto!important;top:auto!important;margin:-150px 0 0 12px}
  .s2 .s2-visual > div:nth-of-type(3){position:relative!important;right:auto!important;bottom:auto!important;width:auto!important;margin-top:16px}
  .s2 .s2-painel{padding:20px 14px!important}
  .s2 .s2-contas{grid-template-columns:1fr 1fr!important}
  .s2 .s2-app{grid-template-columns:1fr!important}
  .s2 .s2-side{display:none!important}
  .s2 .s2-miolo{padding:24px 18px!important}
  .s2 .s2-marca{grid-column:auto!important}
  .s2 .s2-tipos{gap:8px 14px!important;font-size:18px!important}
}
`;

const NOTIFS: [string, string, string][] = [
  ["#6E7F63", "Buffet Aurora confirmou 16:30", "há 2 min · 5 de 7 fornecedores confirmados"],
  ["#6E7F63", "Juliana chegou à recepção", "agora · equipe"],
  ["#A5813C", "Banda Lume reportou um problema", "microfone da cerimônia · há 1 min"],
  ["#6E7F63", "Flor & Casa concluiu a montagem", "agora · 6 de 7 fornecedores confirmados"],
  ["#6E7F63", "Marina viu o roteiro no portal", "há 3 min · cliente"],
];

const PLANO_CAS: [string, number][] = [["Salão e buffet", 10], ["Fotografia e vídeo", 8], ["Decoração", 6], ["Convites", 4], ["Roteiro e equipe", 1]];
const PLANO_DEB: [string, number][] = [["Salão e buffet", 8], ["Fotografia e vídeo", 6], ["Vestido e valsa", 4], ["Convites", 2], ["Roteiro e equipe", 0.5]];
const ROT_CAS: [string, string][] = [["14:00", "Montagem da decoração"], ["16:30", "Entrada do buffet"], ["19:00", "Cerimônia"], ["20:15", "Jantar servido"], ["23:30", "Retirada"]];
const ROT_DEB: [string, string][] = [["16:00", "Montagem da decoração"], ["19:30", "Entrada do buffet"], ["21:00", "Recepção"], ["22:00", "Entrada da debutante"], ["22:30", "Valsa"]];

// hoje (Brasília) + 12 meses, igual no servidor e no navegador. O desenho
// usava + 8, e os prazos de 10 e 8 meses do casamento nasciam vencidos.
function dataPadrao(): string {
  const [a, m, d] = hojeBR().split("-").map(Number);
  const x = new Date(a, m - 1 + 12, d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function SiteModelo2({
  planos,
  hrefConta,
  hrefPlano,
}: {
  planos: PlanosDoSite;
  /** o cadastro (visitante) ou a assinatura (dona logada) */
  hrefConta: string;
  /** prefixo do botão de plano pago: "/comecar?plano=" ou "/assinatura?plano=" */
  hrefPlano: string;
}) {
  const [notif, setNotif] = useState(0);
  const [tour, setTour] = useState(1);
  const [tick, setTick] = useState(0);
  const [tourHover, setTourHover] = useState(false);
  const pausaAte = useRef(0);
  const hover = useRef(false);
  const [dType, setDType] = useState<"Casamento" | "Debutante">("Casamento");
  const [dName, setDName] = useState("");
  const [dDate, setDDate] = useState(dataPadrao);
  const [dCreated, setDCreated] = useState(false);

  useEffect(() => {
    const n = setInterval(() => setNotif((x) => (x + 1) % NOTIFS.length), 3200);
    const t = setInterval(() => {
      if (hover.current || Date.now() < pausaAte.current) return;
      setTour((x) => (x >= 6 ? 1 : x + 1));
      setTick((x) => x + 1);
    }, 5000);
    return () => {
      clearInterval(n);
      clearInterval(t);
    };
  }, []);

  const [nc, nt, ns] = NOTIFS[notif];
  const heroNotif = createElement(
    "div",
    { key: "n" + notif, style: { display: "flex", gap: 12, alignItems: "flex-start", animation: "eoNotif .5s ease both" } },
    createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: nc, marginTop: 6, flex: "none" } }),
    createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 3 } },
      createElement("p", { style: { fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#6E2E34" } }, "O que chega para você"),
      createElement("p", { style: { fontSize: 14, fontWeight: 400 } }, nt),
      createElement("p", { style: { fontSize: 12, color: "#928A81" } }, ns)
    )
  );

  const tv: Record<string, unknown> = {};
  for (let i = 1; i <= 6; i++) {
    const on = tour === i;
    tv["t" + i] = on;
    tv["tb" + i] = on ? "#6E2E34" : "rgba(42,36,33,.12)";
    tv["tg" + i] = on ? "#fff" : "transparent";
    tv["to" + i] = on ? 1 : 0.7;
    tv["go" + i] = () => {
      pausaAte.current = Date.now() + 15000;
      setTour(i);
      setTick((x) => x + 1);
    };
    tv["bar" + i] =
      on && !tourHover
        ? createElement("span", {
            key: "bar" + tour + "-" + tick,
            style: { position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: "#6E2E34", opacity: 0.35, transformOrigin: "left", animation: "eoBar 5s linear forwards" },
          })
        : null;
  }

  const deb = dType === "Debutante";
  const ev = new Date(dDate + "T12:00:00");
  const valida = !isNaN(ev.getTime());
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  const menos = (m: number) => {
    const d = new Date(ev);
    if (m < 1) d.setDate(d.getDate() - Math.round(m * 30));
    else d.setMonth(d.getMonth() - m);
    return fmt(d);
  };
  const dias = valida ? Math.max(0, Math.round((ev.getTime() - Date.now()) / 864e5)) : 0;

  const valores = {
    heroNotif,
    ...tv,
    tourHoverOn: () => {
      hover.current = true;
      setTourHover(true);
    },
    tourHoverOff: () => {
      hover.current = false;
      setTourHover(false);
      setTick((x) => x + 1);
    },
    tourNext: () => {
      pausaAte.current = Date.now() + 15000;
      if (tour < 6) {
        setTour(tour + 1);
        setTick((x) => x + 1);
      } else {
        const el = document.getElementById("a-demo");
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
      }
    },
    tourNextLabel: tour < 6 ? "Próximo passo →" : "Agora experimente →",
    dFormOpen: !dCreated,
    dCreated,
    dName,
    dDate,
    nameLabel: deb ? "Nome da debutante" : "Nome do casal",
    namePh: deb ? "Helena" : "Marina e Téo",
    tCasBg: deb ? "#fff" : "#6E2E34",
    tCasC: deb ? "#6E2E34" : "#F7F3EC",
    tDebBg: deb ? "#6E2E34" : "#fff",
    tDebC: deb ? "#F7F3EC" : "#6E2E34",
    setCasamento: () => setDType("Casamento"),
    setDebutante: () => setDType("Debutante"),
    onName: (e: { target: { value: string } }) => setDName(e.target.value),
    onDate: (e: { target: { value: string } }) => setDDate(e.target.value),
    create: () => setDCreated(true),
    reset: () => {
      setDCreated(false);
      setDName("");
    },
    evTitle: (deb ? "Debutante — " : "Casamento — ") + (dName.trim() || (deb ? "Helena" : "Marina e Téo")),
    evDate: valida ? fmt(ev) : "",
    evDays: dias,
    evPlan: valida ? (deb ? PLANO_DEB : PLANO_CAS).map(([t, m]) => ({ t, d: menos(m) })) : [],
    evRoteiro: (deb ? ROT_DEB : ROT_CAS).map(([h, t]) => ({ h, t })),
    hrefConta,
    hrefPlano,
    sistemaPorDentro: <SistemaPorDentro />,
    ...planos,
  };

  return (
    <div className="s2">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <SiteModelo2Miolo {...valores} />
    </div>
  );
}
