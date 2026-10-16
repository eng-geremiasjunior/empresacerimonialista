"use client";

// Aparência (16/10/2026, pedido dele, no molde do Google Ads): o tamanho da
// letra e três cores — Claro (o de sempre), Noturno e Ameixa (a cor da
// marca no menu e na faixa do alto). Fica neste aparelho (é preferência de
// quem está vendo, não da conta).
//
// O Noturno é feito por inversão de cor no documento inteiro, com as fotos
// devolvidas ao normal: as telas antigas têm a cor escrita uma a uma, e um
// tema escuro feito à mão pediria passar por todas. O que destoar se ajusta
// tela a tela.

import { useEffect, useRef, useState } from "react";

export type Tema = "claro" | "noturno" | "ameixa";
export type Fonte = "pequena" | "media" | "grande";

export const CHAVE_APARENCIA = "eorg-aparencia";

/** Roda antes da pintura (script no HTML): evita o clarão ao abrir no Noturno. */
export const SCRIPT_APARENCIA = `try{var a=JSON.parse(localStorage.getItem("${CHAVE_APARENCIA}")||"{}");var d=document.documentElement;if(a.tema&&a.tema!=="claro")d.setAttribute("data-tema",a.tema);if(a.fonte&&a.fonte!=="media")d.setAttribute("data-fonte",a.fonte);}catch(e){}`;

function aplicar(tema: Tema, fonte: Fonte) {
  const d = document.documentElement;
  if (tema === "claro") d.removeAttribute("data-tema");
  else d.setAttribute("data-tema", tema);
  if (fonte === "media") d.removeAttribute("data-fonte");
  else d.setAttribute("data-fonte", fonte);
  try {
    localStorage.setItem(CHAVE_APARENCIA, JSON.stringify({ tema, fonte }));
  } catch {
    // aparelho sem armazenamento: vale até recarregar
  }
}

const TEMAS: { v: Tema; rotulo: string; amostra: [string, string] }[] = [
  { v: "claro", rotulo: "Claro", amostra: ["#FAF8F5", "#F2EEE9"] },
  { v: "noturno", rotulo: "Noturno", amostra: ["#1c1a19", "#2a2624"] },
  { v: "ameixa", rotulo: "Ameixa", amostra: ["#4A2A40", "#F3EBF0"] },
];
const FONTES: { v: Fonte; rotulo: string; tamanho: number }[] = [
  { v: "pequena", rotulo: "Pequena", tamanho: 12 },
  { v: "media", rotulo: "Média", tamanho: 14 },
  { v: "grande", rotulo: "Grande", tamanho: 16 },
];

export function Aparencia() {
  const [aberto, setAberto] = useState(false);
  const [tema, setTema] = useState<Tema>("claro");
  const [fonte, setFonte] = useState<Fonte>("media");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem(CHAVE_APARENCIA) || "{}") as { tema?: Tema; fonte?: Fonte };
      if (a.tema) setTema(a.tema);
      if (a.fonte) setFonte(a.fonte);
    } catch {
      // sem preferência guardada
    }
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fn = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [aberto]);

  const escolherTema = (t: Tema) => {
    setTema(t);
    aplicar(t, fonte);
  };
  const escolherFonte = (f: Fonte) => {
    setFonte(f);
    aplicar(tema, f);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="mo-acao-topo" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
          <path d="M4 5h16M4 12h10M4 19h6" />
          <circle cx="18" cy="17" r="3" />
        </svg>
        <span className="mo-acao-rotulo">Aparência</span>
      </button>
      {aberto && (
        <div className="mo-menu mo-aparencia" role="dialog" aria-label="Aparência">
          <span className="mo-rotulo">Tamanho da letra</span>
          <div className="mo-aparencia-opcoes">
            {FONTES.map((f) => (
              <button
                key={f.v}
                type="button"
                aria-pressed={fonte === f.v}
                className="mo-aparencia-op"
                onClick={() => escolherFonte(f.v)}
              >
                <span style={{ fontSize: f.tamanho + 4, fontWeight: 600, lineHeight: 1 }}>A</span>
                <span>{f.rotulo}</span>
              </button>
            ))}
          </div>
          <span className="mo-rotulo" style={{ marginTop: 14 }}>Cores</span>
          <div className="mo-aparencia-opcoes">
            {TEMAS.map((t) => (
              <button
                key={t.v}
                type="button"
                aria-pressed={tema === t.v}
                className="mo-aparencia-op"
                onClick={() => escolherTema(t.v)}
              >
                <span className="mo-amostra" aria-hidden>
                  <span style={{ background: t.amostra[0] }} />
                  <span style={{ background: t.amostra[1] }} />
                </span>
                <span>{t.rotulo}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
