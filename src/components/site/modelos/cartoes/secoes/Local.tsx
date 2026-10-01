"use client";

// O local (#local, T03 e T04): cartão-foto de raio 32 e altura mínima
// 460px sobre #1a1f1b, o gradiente para rgba(15,18,15,.78) e, embaixo,
// "Onde vamos celebrar", o nome do espaço (clamp(30px,3.6vw,44px)), o
// endereço e a pílula clara "Como chegar" (Google Maps em nova aba).
//
// Nome, endereço e cidade vêm do evento, ao vivo; a foto é a do bloco "O
// local". Sem foto, o cartão fica no fundo escuro do desenho. O zoom lento
// da foto (1 → 1.08 em 14s, vai e volta) é só do T03 — o T04 tirou.

import { lerLocal } from "@/lib/site-conteudo";
import { ComoChegar } from "@/components/site/pecas/ComoChegar";
import { FotoDoCartao, Icone, Rotulo, useTemFoto, type PropsDaSecao } from "../comum";

export function temLocal({ dados }: Pick<PropsDaSecao, "dados">): boolean {
  const e = dados.evento;
  return !!(e.local || e.cidade || e.endereco);
}

/** "Rua X, 123 — São Paulo/SP": o endereço e a cidade, sem repetir. */
function enderecoDoCartao(endereco?: string | null, cidade?: string | null): string {
  const e = endereco?.trim() ?? "";
  const c = cidade?.trim() ?? "";
  if (e && c && e.toLowerCase().includes(c.toLowerCase())) return e;
  return [e, c].filter(Boolean).join(" — ");
}

export function Local({ dados, bloco, ancora, zoomLento = false, atraso }: PropsDaSecao & { zoomLento?: boolean; atraso?: number }) {
  const { evento } = dados;
  const foto = lerLocal(bloco.conteudo).foto;
  const temFoto = useTemFoto();
  const nome = evento.local || evento.cidade || "";
  const endereco = enderecoDoCartao(evento.endereco, evento.local ? evento.cidade : null);

  return (
    <div id={ancora} data-sec={ancora} data-revelar="up" data-atraso={atraso || undefined} className="k-local">
      {temFoto(foto) && (
        <div className={`k-local-foto ${zoomLento ? "k-local-foto--lenta" : ""}`}>
          <FotoDoCartao caminho={foto} />
        </div>
      )}
      <div className="k-local-veu" />
      <div className="k-local-miolo">
        <Rotulo>Onde vamos celebrar</Rotulo>
        {nome && <div className="k-local-nome">{nome}</div>}
        {endereco && <div className="k-local-endereco">{endereco}</div>}
        <ComoChegar local={evento.local} endereco={evento.endereco} cidade={evento.cidade} className="k-pilula-clara">
          <Icone nome="pino" className="k-icone--18" />
          Como chegar
        </ComoChegar>
      </div>
    </div>
  );
}
