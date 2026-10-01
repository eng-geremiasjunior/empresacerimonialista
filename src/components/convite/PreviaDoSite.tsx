"use client";

// O site de verdade (SiteDoEvento), sem envelope e sem clique: serve a
// revisão do dono no /admin, a prévia da família e a página de vendas.
// Nada ali dentro recebe foco nem toque — a prévia não pode confirmar a
// presença de ninguém nem mandar recado.

import { useEffect, useRef } from "react";
import { SiteDoEvento } from "@/components/site/SiteDoEvento";
import type { SitePublico } from "@/lib/site-publico-tipos";

export function PreviaDoSite({
  dados,
  fotosAlbum,
  fotoCasalUrl,
  urls,
  modo = "previa",
}: {
  dados: SitePublico;
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
  /** fotos do balde 'site' já assinadas; ausente = nenhuma */
  urls?: Record<string, string>;
  /** a revisão do dono espalha o que no público fica atrás de um gesto */
  modo?: "previa" | "revisao";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("inert", "");
  }, []);
  return (
    <div ref={ref} style={{ pointerEvents: "none" }}>
      <SiteDoEvento
        dados={dados}
        midia={{ fotosAlbum, fotoCasalUrl, urls: urls ?? {} }}
        modo={modo}
        semEnvelope
      />
    </div>
  );
}
