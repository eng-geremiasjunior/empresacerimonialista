"use client";

// Cabeçalho do T03, sem caixa: o wordmark "{n1} & {n2}" (sempre em nomes,
// o "&" em accentText) à esquerda; à direita, a pílula de data
// "31.10.2026" em soft (some até 640px) e "Confirmar presença" em ink —
// só quando a confirmação está no site e aberta.

import { dataComPontos, NomesDoCasal, type CasalDoSite } from "../comum";

export function Cabecalho({ casal, data, comRsvp }: { casal: CasalDoSite; data: string; comRsvp: boolean }) {
  const quando = dataComPontos(data);
  return (
    <header className="k-cabecalho">
      <a href="#inicio" className="k-wordmark">
        <NomesDoCasal casal={casal} ampClasse="k-amp-texto" />
      </a>
      <div className="k-cabecalho-dir">
        {quando && <span className="k-cabecalho-data">{quando}</span>}
        {comRsvp && (
          <a href="#rsvp" className="k-pilula">
            Confirmar presença
          </a>
        )}
      </div>
    </header>
  );
}
