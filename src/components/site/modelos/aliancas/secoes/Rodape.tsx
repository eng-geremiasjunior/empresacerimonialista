"use client";

// 16 · Rodapé, fundo escuro: as alianças compactas (80×54), os nomes, a
// data "31.10.2026", "Feito com carinho." e, 64px abaixo, "Site criado
// com eOrganizei" — com o logo da cerimonialista pequeno ao lado quando o
// casamento tem uma.

import { Aliancas } from "../Aliancas";
import { dataCurta, NomesDoCasal, type PropsDaSecao } from "../comum";

export function Rodape({ dados, casal }: Pick<PropsDaSecao, "dados" | "casal">) {
  const empresa = dados.empresa;
  return (
    <footer className="a-rodape">
      <div className="a-rodape-aneis">
        <Aliancas compacta brilho={false} faiscas={false} inicio={0} alvo={() => 0} />
      </div>
      {(casal.nome1 || casal.nome2) && (
        <div className="a-nome a-rodape-nomes">
          <NomesDoCasal casal={casal} />
        </div>
      )}
      <div className="a-rodape-data">{dataCurta(dados.evento.data, ".")}</div>
      <div className="a-rodape-carinho">Feito com carinho.</div>
      <div className="a-rodape-assinatura">
        <span>Site criado com eOrganizei</span>
        {empresa?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={empresa.logo_url} alt={empresa.nome} className="a-rodape-logo" loading="lazy" />
        )}
      </div>
    </footer>
  );
}
