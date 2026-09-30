"use client";

// O site de verdade (ConviteCompleto), sem envelope e sem clique: serve a
// revisão do dono no /admin, a prévia da família e a página de vendas.
// Nada ali dentro recebe foco nem toque — a prévia não pode confirmar a
// presença de ninguém nem mandar recado.

import { useEffect, useRef } from "react";
import { ConviteCompleto } from "@/components/convite/ConviteCompleto";
import type { SitePublico } from "@/lib/site-publico-tipos";

export function PreviaDoSite({
  dados,
  fotosAlbum,
  fotoCasalUrl,
}: {
  dados: SitePublico;
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("inert", "");
  }, []);
  return (
    <div ref={ref} style={{ pointerEvents: "none" }}>
      <ConviteCompleto dados={dados} fotosAlbum={fotosAlbum} fotoCasalUrl={fotoCasalUrl} semEnvelope />
    </div>
  );
}
