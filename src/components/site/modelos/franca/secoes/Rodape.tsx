"use client";

// 13 · Rodapé, fundo dark: "À bientôt", os nomes por extenso (o & em
// goldLight), a data "31.10.2026" entre linhas de 40px, a hashtag em
// itálico e, 64px abaixo, "Site criado com eOrganizei" — com o logo da
// cerimonialista pequeno ao lado quando o casamento tem uma. Exportado
// para o T06.

import { dataCurta, NomesDoCasal, type PropsDaSecao } from "../comum";

export function Rodape({ dados, casal }: PropsDaSecao) {
  const empresa = dados.empresa;
  const data = dataCurta(dados.evento.data, ".");
  return (
    <footer className="f-rodape">
      <div className="f-eyebrow f-eyebrow--claro">À bientôt</div>
      {(casal.nome1 || casal.nome2) && (
        <div className="f-nome f-rodape-nomes">
          <NomesDoCasal casal={casal} />
        </div>
      )}
      {data && (
        <div className="f-rodape-data">
          <span className="f-rodape-linha" aria-hidden />
          <span>{data}</span>
          <span className="f-rodape-linha" aria-hidden />
        </div>
      )}
      {casal.hashtag && <div className="f-rodape-hashtag">{casal.hashtag}</div>}
      <div className="f-rodape-assinatura">
        <span>Site criado com eOrganizei</span>
        {empresa?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={empresa.logo_url} alt={empresa.nome} className="f-rodape-logo" loading="lazy" />
        )}
      </div>
    </footer>
  );
}
