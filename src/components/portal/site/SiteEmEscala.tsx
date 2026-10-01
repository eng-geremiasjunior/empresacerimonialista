"use client";

// O site em escala, sem clique nem foco (é só para ver): a prévia do alto
// do "Nosso site" e as miniaturas dos modelos em Aparência. `largura` é a
// do celular em que ele é desenhado; `alturaDoSite`, quanto dele aparece
// (640 = a capa inteira no celular: foto, nomes e o cartão da data).

import { useEffect, useRef, useState } from "react";
import { SiteDoEvento } from "@/components/site/SiteDoEvento";
import type { SitePublico } from "@/lib/site-publico-tipos";

export function SiteEmEscala({
  dados,
  fotosAlbum,
  fotoCasalUrl,
  urls,
  largura,
  alturaDoSite,
  raio = 10,
}: {
  dados: SitePublico;
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
  /** caminho no balde 'site' → URL (assinada ou a local da foto recém-enviada) */
  urls: Record<string, string>;
  largura: number;
  alturaDoSite: number;
  raio?: number;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const miolo = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setEscala(el.clientWidth / largura);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [largura]);
  useEffect(() => {
    miolo.current?.setAttribute("inert", "");
  }, []);
  return (
    <div
      ref={caixa}
      aria-hidden
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${largura} / ${alturaDoSite}`,
        overflow: "hidden",
        borderRadius: raio,
        background: "#faf6f0",
      }}
    >
      <div
        ref={miolo}
        style={{
          width: largura,
          transform: `scale(${escala})`,
          transformOrigin: "top left",
          pointerEvents: "none",
          opacity: escala ? 1 : 0,
        }}
      >
        <SiteDoEvento dados={dados} midia={{ fotosAlbum, fotoCasalUrl, urls }} modo="previa" semEnvelope />
      </div>
    </div>
  );
}
