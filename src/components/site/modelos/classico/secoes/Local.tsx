"use client";

// 7 · Localização (#local): a foto do espaço 16/8 (mínimo 320px) e, por
// cima dela (−96px), o cartão com "Onde vamos celebrar", o nome do local,
// o endereço e "Como chegar →" (Google Maps em nova aba).
//
// Nome, endereço e cidade vêm do evento, ao vivo; a foto é a do bloco
// "O local". Sem foto, o cartão fica sozinho, sem a sobreposição.

import { lerLocal } from "@/lib/site-conteudo";
import { ComoChegar } from "@/components/site/pecas/ComoChegar";
import { Quadro, useUrlDaFoto, type PropsDaSecao } from "../comum";

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

export function Local({ dados, bloco, ancora, modo }: PropsDaSecao) {
  const { evento } = dados;
  const foto = lerLocal(bloco.conteudo).foto;
  const resolver = useUrlDaFoto();
  const comFoto = !!resolver(foto) || modo === "previa";
  const nome = evento.local || evento.cidade || "";
  const endereco = enderecoDoCartao(evento.endereco, evento.local ? evento.cidade : null);

  return (
    <section id={ancora} className="c-secao c-local">
      <div className="c-local-miolo">
        <Quadro caminho={foto} proporcao="16/8" className="c-local-foto" />
        <div data-revelar="up" className={`c-local-cartao ${comFoto ? "" : "c-local-cartao--so"}`}>
          <div className="c-eyebrow">Onde vamos celebrar</div>
          {nome && <h2 className="c-h2 c-h2--sm c-local-nome">{nome}</h2>}
          {endereco && <p className="c-local-endereco">{endereco}</p>}
          <ComoChegar local={evento.local} endereco={evento.endereco} cidade={evento.cidade} className="c-sublinhado">
            Como chegar <span aria-hidden>→</span>
          </ComoChegar>
        </div>
      </div>
    </section>
  );
}
