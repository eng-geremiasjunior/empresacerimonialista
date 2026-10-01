"use client";

// O dock de ícones (T03 e T04): cartão branco de raio 28, preso a 12px do
// topo e sobreposto ao hero (margin-top −clamp(84px,9vw,100px)); no
// celular rola na horizontal. Cada item é um ícone de linha num círculo
// de 50px e o rótulo de 12.5px.
//
// Só entram as seções que estão no site (quem monta a lista é o modelo).
// A seção ativa é a última [data-sec] cujo topo passou de 40% da tela; o
// círculo dela fica ink, com o ícone claro e scale 1.06 (mola).
//
// Prévia e revisão: o dock fica no fluxo (sem sticky) e o ativo é o
// Início.

import { useEffect, useRef, useState } from "react";
import type { ModoDoSite } from "@/components/site/SiteDoEvento";
import { Icone, type NomeDoIcone } from "../comum";

export type ItemDoDock = { id: string; rotulo: string; icone: NomeDoIcone };

/** Os 9 do desenho, na ordem do desenho; o modelo filtra pelo que existe. */
export const ITENS_DO_DOCK: ItemDoDock[] = [
  { id: "inicio", rotulo: "Início", icone: "grade" },
  { id: "historia", rotulo: "Nossa história", icone: "coracao" },
  { id: "dia", rotulo: "O grande dia", icone: "agenda" },
  { id: "local", rotulo: "Local", icone: "pino" },
  { id: "musicas", rotulo: "Músicas", icone: "musica" },
  { id: "presentes", rotulo: "Presentes", icone: "presente" },
  { id: "galeria", rotulo: "Galeria", icone: "imagem" },
  { id: "padrinhos", rotulo: "Padrinhos", icone: "pessoas" },
  { id: "rsvp", rotulo: "Confirmar", icone: "check" },
];

export function Dock({ itens, modo }: { itens: ItemDoDock[]; modo: ModoDoSite }) {
  const ref = useRef<HTMLElement>(null);
  const [ativo, setAtivo] = useState("inicio");

  useEffect(() => {
    if (modo !== "publico") return;
    const casca = ref.current?.closest(".k-casca") ?? document;
    let pedido = 0;
    const medir = () => {
      pedido = 0;
      const vh = window.innerHeight;
      let a = "inicio";
      casca.querySelectorAll<HTMLElement>("[data-sec]").forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.4) a = el.dataset.sec || a;
      });
      setAtivo(a);
    };
    const aoRolar = () => {
      if (!pedido) pedido = requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      window.removeEventListener("resize", aoRolar);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, [modo]);

  if (itens.length === 0) return null;

  return (
    <nav ref={ref} className={`k-dock ${modo === "publico" ? "k-dock--preso" : ""}`} aria-label="Seções do site">
      <div className="k-dock-trilho">
        {itens.map((it) => (
          <a
            key={it.id}
            href={`#${it.id}`}
            className="k-dock-item"
            data-ativo={ativo === it.id ? "" : undefined}
            aria-current={ativo === it.id ? "true" : undefined}
          >
            <span className="k-dock-bola">
              <Icone nome={it.icone} className="k-dock-icone" />
            </span>
            <span className="k-dock-rotulo">{it.rotulo}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
