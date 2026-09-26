"use client";

// O fundo do portal v2 — as cinco atmosferas do desenho e o retrato no
// topo do Início. Fica parado (position: fixed) enquanto o conteúdo rola.
//
// Versão leve (.pv2[data-leve]): o que é ambiente em laço (pétalas,
// brilhos, manchas que flutuam) para de mexer ou some; a cor continua.

import { memo } from "react";
import type { Fundo } from "@/lib/cor-da-festa";

const GRAO =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5 0 0 0 0 .45 0 0 0 0 .4 0 0 0 .5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

const BASE: Record<Exclude<Fundo, "festa">, string> = {
  seda: "linear-gradient(170deg,var(--destaque-fundo),#f7f3ed 70%)",
  noite:
    "linear-gradient(180deg,var(--destaque-profundo) 0%,color-mix(in oklch,var(--destaque-profundo) 75%,#000) 34%,#f7f3ed 54%)",
  jardim:
    "radial-gradient(80% 40% at 50% 0%,color-mix(in oklch,var(--destaque) 30%,transparent),transparent 70%),#f8f4ed",
  papel: "#f8f4ec",
};

const FESTA_CLARA =
  "radial-gradient(90% 50% at 12% 0%,color-mix(in oklch,var(--destaque) 50%,transparent),transparent 70%),radial-gradient(70% 40% at 100% 10%,color-mix(in oklch,var(--destaque-linha) 85%,transparent),transparent 70%),linear-gradient(180deg,var(--destaque-fundo) 0%,#f7f3ed 60%)";
const FESTA_ESCURA =
  "radial-gradient(80% 45% at 18% 0%,color-mix(in oklch,var(--destaque) 70%,transparent),transparent 70%),linear-gradient(180deg,var(--destaque-profundo) 0%,var(--destaque-profundo) 40%,#f7f3ed 72%)";

/** As luzes da festa: manchas, faíscas e pétalas (as posições do desenho). */
export const Luzes = memo(function Luzes() {
  const manchas: [number, number, number, number][] = [
    [6, 2, 200, 17],
    [58, -6, 260, 23],
    [80, 24, 130, 19],
    [18, 30, 110, 15],
  ];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {manchas.map(([l, t, s, d], i) => (
        <span
          key={`o${i}`}
          className="pv2-mov"
          style={{
            position: "absolute", left: `${l}%`, top: `${t}%`, width: s, height: s, borderRadius: "50%",
            background: "var(--destaque)", opacity: 0.3, filter: "blur(42px)",
            animation: `pv2-flutuar ${d}s ease-in-out ${-i * 3}s infinite alternate`,
          }}
        />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={`b${i}`}
          className="pv2-mov pv2-so-cheio"
          style={{
            position: "absolute", left: `${(i * 37) % 97}%`, top: `${(i * 23) % 44}%`,
            width: i % 3 ? 3 : 4, height: i % 3 ? 3 : 4, borderRadius: "50%", background: "#fffdf6",
            boxShadow: "0 0 8px #fff", animation: `pv2-cintilar ${3 + (i % 5)}s ease-in-out ${i * 0.4}s infinite`,
          }}
        />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={`p${i}`}
          className="pv2-mov pv2-so-cheio"
          style={{
            position: "absolute", left: `${(i * 29 + 7) % 92}%`, top: 0,
            width: 11 - (i % 3) * 2, height: 7 - (i % 3), borderRadius: "60% 40% 60% 40%",
            background: i % 2 ? "var(--destaque-linha)" : "#fffaf2", boxShadow: "0 2px 6px rgba(0,0,0,.06)",
            animation: `pv2-cair ${16 + (i % 4) * 5}s linear ${-i * 2.7}s infinite`,
          }}
        />
      ))}
    </div>
  );
});

const Estrelas = memo(function Estrelas() {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "48%" }}>
      {Array.from({ length: 46 }, (_, i) => (
        <span
          key={i}
          className="pv2-mov"
          style={{
            position: "absolute", left: `${(i * 53) % 100}%`, top: `${(i * 31) % 100}%`,
            width: i % 7 ? 2 : 3, height: i % 7 ? 2 : 3, borderRadius: "50%", background: "#fffdf6",
            boxShadow: i % 7 ? "none" : "0 0 6px #fff",
            animation: `pv2-cintilar ${2.5 + (i % 6) * 0.7}s ease-in-out ${(i % 9) * 0.5}s infinite`,
          }}
        />
      ))}
    </div>
  );
});

export function Atmosfera({
  fundo,
  escuro,
  retratoUrl,
  monograma,
}: {
  fundo: Fundo;
  /** o topo do Início escurece (retrato, céu da noite, semana da festa) */
  escuro: boolean;
  /** o retrato no topo — só no Início com o topo "Retrato" */
  retratoUrl: string | null;
  /** a letra do Papel e monograma */
  monograma: string;
}) {
  const base = fundo === "festa" ? (escuro ? FESTA_ESCURA : FESTA_CLARA) : BASE[fundo];
  return (
    <div className="pv2-atm" aria-hidden>
      <div style={{ background: base, transition: "opacity .8s" }} />

      {retratoUrl && (
        <div className="pv2-retrato">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={retratoUrl}
            alt=""
            className="pv2-mov"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              animation: "pv2-retrato-zoom 24s ease-in-out infinite alternate",
            }}
          />
          <div
            style={{
              position: "absolute", inset: 0, mixBlendMode: "soft-light",
              background:
                "radial-gradient(70% 50% at 80% 10%,color-mix(in oklch,var(--destaque) 55%,transparent),transparent 70%)",
            }}
          />
          <div className="pv2-retrato-veu" style={{ position: "absolute", inset: 0 }} />
        </div>
      )}

      {fundo === "seda" && (
        <div style={{ overflow: "hidden" }}>
          <span className="pv2-mov" style={{ position: "absolute", left: "-30%", top: "-25%", width: "110%", height: "70%", borderRadius: "50%", background: "var(--destaque)", opacity: 0.42, filter: "blur(70px)", animation: "pv2-flutuar 26s ease-in-out infinite alternate" }} />
          <span className="pv2-mov" style={{ position: "absolute", right: "-35%", top: "5%", width: "100%", height: "60%", borderRadius: "50%", background: "var(--destaque-linha)", opacity: 0.75, filter: "blur(70px)", animation: "pv2-flutuar 32s ease-in-out -9s infinite alternate-reverse" }} />
          <span className="pv2-mov" style={{ position: "absolute", left: "10%", top: "30%", width: "80%", height: "40%", borderRadius: "50%", background: "#fffaf2", opacity: 0.8, filter: "blur(60px)", animation: "pv2-flutuar 22s ease-in-out -4s infinite alternate" }} />
        </div>
      )}

      {fundo === "noite" && (
        <div style={{ overflow: "hidden" }}>
          <span
            className="pv2-lua"
            style={{
              position: "absolute", borderRadius: "50%",
              background: "radial-gradient(circle at 38% 38%,#fffaf0,#f1e6d2 60%,#d9ccb6)",
              boxShadow: "0 0 50px 16px color-mix(in oklch,var(--destaque) 40%,transparent),0 0 0 1px rgba(255,255,255,.4)",
            }}
          />
          <Estrelas />
        </div>
      )}

      {fundo === "jardim" && (
        <div
          style={{
            background:
              "radial-gradient(circle at 50% 100%,transparent 44px,color-mix(in oklch,var(--destaque-linha) 80%,transparent) 45px 46.5px,transparent 47.5px) 0 0/96px 80px,radial-gradient(circle at 50% 100%,transparent 30px,color-mix(in oklch,var(--destaque-linha) 55%,transparent) 31px 32px,transparent 33px) 48px 40px/96px 80px",
            WebkitMaskImage: "linear-gradient(180deg,#000,rgba(0,0,0,.5) 35%,transparent 62%)",
            maskImage: "linear-gradient(180deg,#000,rgba(0,0,0,.5) 35%,transparent 62%)",
          }}
        />
      )}

      {fundo === "papel" && (
        <div style={{ overflow: "hidden" }}>
          <span
            className="pv2-monograma"
            style={{
              position: "absolute", fontFamily: "var(--pv2-titulo)", fontStyle: "italic", fontWeight: 400,
              lineHeight: 0.8, color: "var(--destaque-linha)", opacity: 0.5, transform: "rotate(-8deg)",
            }}
          >
            {monograma}
          </span>
          <span style={{ position: "absolute", inset: 12, border: "1px solid var(--destaque-linha)", borderRadius: 28, opacity: 0.7 }} />
          <span style={{ position: "absolute", inset: 17, border: "1px solid var(--destaque-linha)", borderRadius: 26, opacity: 0.35 }} />
        </div>
      )}

      {(fundo === "seda" || fundo === "papel") && (
        <div style={{ opacity: 0.22, mixBlendMode: "multiply", backgroundImage: GRAO }} />
      )}

      {fundo === "festa" && <Luzes />}
    </div>
  );
}
