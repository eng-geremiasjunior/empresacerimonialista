"use client";

// 4 · Bienvenue (o bloco "Mensagem do casal"), fundo bg, coluna de 680px:
// o brasão redondo de 128px com o anel duplo de ouro e as iniciais "H&R",
// "Bienvenue", o título do desenho e o convite — a mensagem que a noiva
// escreve; sem ela a seção some, e só a prévia mostra o texto do desenho
// com a data verdadeira —, fechando
// com o ornamento (48px · losango de 6px · 48px). Reveals em 0, 100, 180,
// 260 e 340ms.

import { dataLonga } from "@/lib/rsvp-convite";
import { IniciaisDoCasal, Ornamento, type PropsDaSecao } from "../comum";

export function Bienvenue({ dados, casal }: PropsDaSecao) {
  const mensagem = dados.site?.mensagem?.trim();
  const texto =
    mensagem ||
    `Com a bênção de nossas famílias, temos a alegria de convidar você para celebrar o nosso casamento no dia ${dataLonga(dados.evento.data)}.`;
  return (
    <section className="f-secao f-bienvenue">
      <div className="f-bienvenue-miolo">
        {(casal.i1 || casal.i2) && (
          <div data-revelar="up" className="f-brasao" aria-hidden>
            <span className="f-brasao-letras">
              <IniciaisDoCasal casal={casal} espacado={false} />
            </span>
          </div>
        )}
        <div data-revelar="up" data-atraso="100" className="f-eyebrow">
          Bienvenue
        </div>
        <h2 data-revelar="up" data-atraso="180" className="f-h2 f-h2--balance f-bienvenue-h2">
          Uma história de amor merece um lugar encantado.
        </h2>
        <p data-revelar="up" data-atraso="260" className="f-bienvenue-p">
          {texto}
        </p>
        <Ornamento className="f-orn--secao" data-revelar="up" data-atraso="340" />
      </div>
    </section>
  );
}
