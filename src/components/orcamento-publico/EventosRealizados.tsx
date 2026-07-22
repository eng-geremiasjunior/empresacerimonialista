// "Eventos realizados": grid do portfólio (Etapa 8). Só chegam aqui as
// fotos com ativo = true, já ordenadas pela RPC.

import { Secao } from "./SecaoBase";
import type { FotoPublica } from "@/lib/orcamento-publico";

export function EventosRealizados({ fotos }: { fotos: FotoPublica[] }) {
  if (fotos.length === 0) return null;

  return (
    <Secao id="eventos" titulo="Eventos realizados">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {fotos.map((foto, i) => (
          <figure key={`${foto.url}-${i}`} className="space-y-1.5">
            <div
              className="overflow-hidden rounded-xl"
              style={{ background: "#EFDCD5" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.url}
                alt={foto.legenda ?? `Evento realizado ${i + 1}`}
                loading="lazy"
                className="h-[130px] w-full object-cover sm:h-[150px]"
              />
            </div>
            {foto.legenda && (
              <figcaption
                className="truncate text-[11.5px]"
                style={{ color: "#8A7B73" }}
              >
                {foto.legenda}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </Secao>
  );
}
