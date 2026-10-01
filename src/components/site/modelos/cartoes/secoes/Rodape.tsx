"use client";

// Rodapé (T03 e T04): o cartão escuro de raio 32 e altura mínima 420, a
// foto a 45% de opacidade sob o véu rgba(15,18,15,.35) e, no centro, a
// frase em headFont itálico (até 520px), os nomes (nameSizeMd, o "&" em
// pêssego) e a hashtag. No pé, "Site criado com eOrganizei" — com o logo
// da cerimonialista pequeno ao lado quando o casamento tem uma.
//
// A foto é a da capa (o desenho não tem espaço próprio para ela); sem
// foto, o fundo escuro.

import { FotoDoCartao, NomesDoCasal, useUrlDaFoto, type PropsDaSecao } from "../comum";

const FRASE = "Estamos preparando tudo com muito carinho e mal podemos esperar para viver esse dia ao lado de quem amamos.";

export function Rodape({
  dados,
  casal,
  foto,
}: PropsDaSecao & { foto: { caminho: string | null; url: string | null } }) {
  const empresa = dados.empresa;
  const resolver = useUrlDaFoto();
  const temFoto = !!resolver(foto.caminho, foto.url);
  return (
    <footer className="k-rodape">
      {temFoto && (
        <div className="k-rodape-foto">
          <FotoDoCartao caminho={foto.caminho} url={foto.url} />
        </div>
      )}
      <div className="k-rodape-veu" />
      <div data-revelar="up" className="k-rodape-miolo">
        <p className="k-rodape-frase">{FRASE}</p>
        {(casal.nome1 || casal.nome2) && (
          <div className="k-nome k-rodape-nomes">
            <NomesDoCasal casal={casal} />
          </div>
        )}
        {casal.hashtag && <div className="k-rodape-hashtag">{casal.hashtag}</div>}
      </div>
      <div className="k-rodape-assinatura">
        <span>Site criado com eOrganizei</span>
        {empresa?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={empresa.logo_url} alt={empresa.nome} className="k-rodape-logo" loading="lazy" />
        )}
      </div>
    </footer>
  );
}
