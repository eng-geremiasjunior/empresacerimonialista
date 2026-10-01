"use client";

// Hero do T03 (#inicio): cartão de raio clamp(20px,2.4vw,32px), altura
// mínima clamp(520px,78vh,760px), a foto do casal sob o gradiente e, à
// esquerda, "O casamento de", os nomes na forma escolhida e "31 de outubro
// de 2026 · Villa Toscana · São Paulo"; à direita, a contagem em caixas.
// O pé reserva clamp(96px,11vw,128px) para o dock que sobe por cima.
//
// A foto é a que o casal subiu na capa; sem ela, a capa do evento; sem
// nenhuma, o fundo escuro do desenho (na prévia, o espaço vazio da foto).
//
// Entrada (quando o useAbertura libera): a foto vai de scale 1.14 e
// brightness .7 ao normal em 3200ms; os 4 itens vêm de translateY 22px e
// blur 10px em 1400ms, com delay 500 + i×260ms.

import { useEffect, useRef } from "react";
import { convitePara, dataLonga } from "@/lib/rsvp-convite";
import { lerCapa } from "@/lib/site-conteudo";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { FotoDoCartao, NomesDoCasal, useTemFoto, type PropsDaSecao } from "../comum";
import { CaixasDaContagem } from "./CaixasDaContagem";

/** A foto da capa: a do casal ou, de reserva, a capa do evento. */
export function fotoDaCapa(p: Pick<PropsDaSecao, "dados" | "bloco">): { caminho: string | null; url: string | null } {
  return { caminho: lerCapa(p.bloco.conteudo).foto, url: p.dados.evento.capa_url };
}

export function Hero({
  dados,
  bloco,
  casal,
  heroLiberado,
  animar,
  comContagem,
}: PropsDaSecao & {
  heroLiberado: boolean;
  animar: boolean;
  comContagem: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const capa = fotoDaCapa({ dados, bloco });
  const temFoto = useTemFoto()(capa.caminho, capa.url);
  const { evento } = dados;
  const rotulo = convitePara(evento.tipo);
  const quando = dataLonga(evento.data);
  const onde = [evento.local, evento.cidade].filter(Boolean).join(" · ");

  useEffect(() => {
    const el = ref.current;
    if (!el || !heroLiberado) return;
    if (!animar || movimentoReduzido() || typeof el.animate !== "function") {
      el.setAttribute("data-pronto", "");
      return;
    }
    const A: Animation[] = [];
    const ph = el.querySelector<HTMLElement>("[data-hero-foto]");
    if (ph)
      A.push(
        ph.animate(
          [
            { transform: "scale(1.14)", filter: "brightness(.7)" },
            { transform: "scale(1)", filter: "brightness(1)" },
          ],
          { duration: 3200, easing: CURVA_E, fill: "both" }
        )
      );
    el.querySelectorAll<HTMLElement>("[data-hero]").forEach((h) => {
      const i = Number(h.dataset.hero);
      A.push(
        h.animate(
          [
            { opacity: 0, transform: "translateY(22px)", filter: "blur(10px)" },
            { opacity: 1, transform: "none", filter: "blur(0)" },
          ],
          { duration: 1400, delay: 500 + i * 260, easing: CURVA_E, fill: "both" }
        )
      );
    });
    el.setAttribute("data-pronto", "");
    const quadros = A;
    // solta o último quadro: o filtro da foto não fica preso no compositor
    quadros.forEach((a) => (a.onfinish = () => a.cancel()));
    return () => quadros.forEach((a) => a.cancel());
  }, [heroLiberado, animar]);

  return (
    <section id="inicio" data-sec="inicio" ref={ref} className="k-hero">
      <div className="k-hero-foto" data-hero-foto="">
        {temFoto && <FotoDoCartao caminho={capa.caminho} url={capa.url} carregar="eager" />}
      </div>
      <div className="k-hero-veu" />
      <div className="k-hero-miolo">
        <div className="k-hero-esq">
          <div data-hero="0" className="k-hero-rotulo">
            {rotulo.charAt(0).toUpperCase() + rotulo.slice(1)}
          </div>
          {casal.forma === "nomes" && (
            <h1 data-hero="1" className="k-nome k-hero-nomes">
              <NomesDoCasal casal={casal} />
            </h1>
          )}
          {casal.forma === "iniciais" && (
            <h1 data-hero="1" className="k-nome k-hero-iniciais">
              <span aria-hidden>
                {casal.i1}
                {casal.dois && <span className="k-amp k-hero-amp-ini"> &amp; </span>}
                {casal.i2}
              </span>
              <span className="k-so-leitor">{[casal.nome1, casal.nome2].filter(Boolean).join(" e ")}</span>
            </h1>
          )}
          {casal.forma === "iniciais-nomes" && (
            <h1 data-hero="1" className="k-hero-ambos">
              <span className="k-nome k-hero-iniciais k-hero-iniciais--sm" aria-hidden>
                {casal.i1}
                {casal.dois && <span className="k-amp k-hero-amp-ini"> &amp; </span>}
                {casal.i2}
              </span>
              <span className="k-nome k-hero-nomes k-hero-nomes--sm">
                {casal.nome1}
                {casal.dois && " & "}
                {casal.nome2}
              </span>
            </h1>
          )}
          <div data-hero="2" className="k-hero-quando">
            <span>{quando}</span>
            {onde && (
              <>
                <span className="k-hero-ponto" aria-hidden>
                  ·
                </span>
                <span>{onde}</span>
              </>
            )}
          </div>
        </div>
        {comContagem && <CaixasDaContagem data-hero="3" data={evento.data} hora={evento.hora} />}
      </div>
    </section>
  );
}
