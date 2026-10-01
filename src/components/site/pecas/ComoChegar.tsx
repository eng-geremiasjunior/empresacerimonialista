// "Como chegar" no site do evento: o mesmo link do src/components/
// ComoChegar (Google Maps por busca, que abre o app no celular, e o Waze
// ao lado), só que vestido pelo modelo. Sem mapa embutido e sem chave de
// API. A busca junta o nome do local, o endereço e a cidade, sem repetir.

import type { ReactNode } from "react";

function busca(partes: (string | null | undefined)[]): string | null {
  const vistas: string[] = [];
  for (const p of partes) {
    const t = p?.replace(/\s+/g, " ").trim();
    // a cidade já costuma estar dentro do endereço
    if (t && !vistas.some((v) => v.toLowerCase().includes(t.toLowerCase()))) vistas.push(t);
  }
  return vistas.length ? vistas.join(", ") : null;
}

export type LugarDoEvento = {
  local?: string | null;
  endereco?: string | null;
  cidade?: string | null;
};

export function linkGoogleMaps(l: LugarDoEvento): string | null {
  const q = busca([l.local, l.endereco, l.cidade]);
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

export function linkWaze(l: LugarDoEvento): string | null {
  // o Waze acha melhor pelo endereço; o nome do salão só sem endereço
  const q = busca(l.endereco ? [l.endereco, l.cidade] : [l.local, l.cidade]);
  return q ? `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes` : null;
}

export function ComoChegar({
  local,
  endereco,
  cidade,
  className,
  children = "Como chegar",
  waze,
}: LugarDoEvento & {
  className?: string;
  children?: ReactNode;
  /** o segundo link, para quem usa Waze; ausente = só o Google Maps */
  waze?: { className?: string; children?: ReactNode };
}) {
  const maps = linkGoogleMaps({ local, endereco, cidade });
  if (!maps) return null;
  const w = waze ? linkWaze({ local, endereco, cidade }) : null;
  return (
    <>
      <a href={maps} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
      {w && (
        <a href={w} target="_blank" rel="noopener noreferrer" className={waze?.className}>
          {waze?.children ?? "Waze"}
        </a>
      )}
    </>
  );
}
