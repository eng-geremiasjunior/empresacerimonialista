"use client";

// "Um pedido nosso" (T03 e T04), logo abaixo do dock: o ponto pêssego, o
// envelope de 64px em sage, "Confirme sua presença", "Pedimos a resposta
// até 15 de outubro" (a data em accentText) e a dica em soft; à direita,
// "Confirmar agora" (ink) e "Ver o convite" (contorno, leva ao grande dia).
//
// Só aparece com a confirmação no site e aberta. Sem prazo, a linha do
// prazo sai; sem o grande dia no site, o "Ver o convite" sai.

import { formatarPrazo } from "@/components/site/pecas/useRsvp";
import { Icone } from "../comum";

export function Pedido({ prazo, comDia }: { prazo: string | null; comDia: boolean }) {
  return (
    <section data-revelar="up" className="k-cartao k-pedido">
      <div className="k-pedido-esq">
        <div className="k-pedido-rotulo">
          <span className="k-ponto" aria-hidden />
          Um pedido nosso
        </div>
        <div className="k-pedido-titulo">
          <span className="k-selo-icone" aria-hidden>
            <Icone nome="envelope" className="k-icone--28" />
          </span>
          <div className="k-pedido-textos">
            <h2 className="k-h2 k-h2--sm k-h2--pedido">Confirme sua presença</h2>
            {prazo && (
              <div className="k-mudo">
                Pedimos a resposta até <span className="k-pedido-prazo">{formatarPrazo(prazo)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="k-dica">
          <Icone nome="lampada" className="k-dica-icone" />
          <span>Se for levar acompanhante, é só contar para a gente no formulário.</span>
        </div>
      </div>
      <div className="k-pedido-botoes">
        <a href="#rsvp" className="k-botao">
          Confirmar agora
        </a>
        {comDia && (
          <a href="#dia" className="k-botao k-botao--contorno">
            Ver o convite
          </a>
        )}
      </div>
    </section>
  );
}
