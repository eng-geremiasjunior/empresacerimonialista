"use client";

// 16 · Rodapé, fundo escuro: os nomes, a data "31.10.2026", "Feito com
// carinho." e, 72px abaixo, "Site criado com eOrganizei" — com o logo da
// cerimonialista pequeno ao lado quando o casamento tem uma.

import { dataCurta, NomesDoCasal, type PropsDaSecao } from "../comum";

export function Rodape({ dados, casal }: PropsDaSecao) {
  const empresa = dados.empresa;
  return (
    <footer className="c-rodape">
      {(casal.nome1 || casal.nome2) && (
        <div className="c-nome c-rodape-nomes">
          <NomesDoCasal casal={casal} />
        </div>
      )}
      <div className="c-rodape-data">{dataCurta(dados.evento.data, ".")}</div>
      <div className="c-rodape-carinho">Feito com carinho.</div>
      <div className="c-rodape-assinatura">
        <span>Site criado com eOrganizei</span>
        {empresa?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={empresa.logo_url} alt={empresa.nome} className="c-rodape-logo" loading="lazy" />
        )}
      </div>
    </footer>
  );
}
