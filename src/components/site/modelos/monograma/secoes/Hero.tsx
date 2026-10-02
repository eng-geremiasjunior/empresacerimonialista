"use client";

// Hero do T04 (#inicio): a foto de borda a borda, 100svh (mínimo 600px),
// raio só embaixo (clamp(24px,3vw,40px)) e o véu em gradiente. O
// cabeçalho mora sobre a foto: os nomes como wordmark (sempre na forma
// "Nomes", o "&" em pêssego) e a pílula clara "Confirmar presença" — só
// com a confirmação no site e aberta. Embaixo, à esquerda, "O casamento
// de", os nomes na forma escolhida e "data · local · cidade"; à direita a
// contagem em caixas (a mesma do T03). O pé reserva clamp(110px,12vw,140px)
// para o dock que sobe por cima.
//
// A foto é a que o casal subiu na capa; sem ela, a capa do evento; sem
// nenhuma, o fundo escuro do desenho (na prévia, o espaço vazio).
//
// Entrada (quando o useAbertura libera, 1600ms depois do começo da
// abertura): a foto vai de scale 1.14 e brightness .7 ao normal em 3200ms;
// cabeçalho e "O casamento de" (0), nomes (1), data/local (2) e contagem
// (3) vêm de translateY 22px e blur 10px em 1400ms, delay 500 + i×260ms.
//
// Parallax: a camada interna faz translate3d(0, y×.35) scale(1 + y/vh×.08)
// enquanto a rolagem está abaixo de 1,3 tela. Sem parallax na prévia, na
// revisão e com reduced-motion.

import { useEffect, useRef } from "react";
import { convitePara, dataLonga } from "@/lib/rsvp-convite";
import { estiloDaMascara, lerCapa } from "@/lib/site-conteudo";
import { useCena } from "@/components/site/pecas/useCena";
import { CURVA_E, movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { FotoDoCartao, NomesDoCasal, useTemFoto, type PropsDaSecao } from "@/components/site/modelos/cartoes/comum";
import { CaixasDaContagem } from "@/components/site/modelos/cartoes/secoes/CaixasDaContagem";
import { fotoDaCapa } from "@/components/site/modelos/cartoes/secoes/Hero";

export function Hero({
  dados,
  bloco,
  casal,
  heroLiberado,
  animar,
  comContagem,
  comRsvp,
}: PropsDaSecao & {
  heroLiberado: boolean;
  animar: boolean;
  comContagem: boolean;
  comRsvp: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const par = useRef<HTMLDivElement>(null);
  const capa = fotoDaCapa({ dados, bloco });
  const temFoto = useTemFoto()(capa.caminho, capa.url);
  const { evento } = dados;
  const rotulo = convitePara(evento.tipo);
  const quando = dataLonga(evento.data);
  const onde = [evento.local, evento.cidade].filter(Boolean).join(" · ");

  useCena(
    ref,
    ({ rect, vh, final }) => {
      const el = par.current;
      if (!el) return;
      if (final) {
        el.style.transform = "";
        return;
      }
      const y = Math.max(0, -rect.top);
      if (y < vh * 1.3) el.style.transform = `translate3d(0,${(y * 0.35).toFixed(1)}px,0) scale(${(1 + (y / vh) * 0.08).toFixed(4)})`;
    },
    { ligado: temFoto }
  );

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
    // solta o último quadro: o filtro da foto não fica preso no compositor
    A.forEach((a) => (a.onfinish = () => a.cancel()));
    return () => A.forEach((a) => a.cancel());
  }, [heroLiberado, animar]);

  return (
    <section id="inicio" data-sec="inicio" ref={ref} className="m-hero">
      <div className="m-hero-foto" data-hero-foto="">
        <div ref={par} className="m-hero-par">
          {temFoto && <FotoDoCartao caminho={capa.caminho} url={capa.url} carregar="eager" />}
        </div>
      </div>
      <div className="m-hero-veu" style={estiloDaMascara(lerCapa(bloco.conteudo).mascara)} />
      <header data-hero="0" className="m-hero-topo">
        <a href="#inicio" className="m-wordmark">
          <NomesDoCasal casal={casal} />
        </a>
        {comRsvp && (
          <a href="#rsvp" className="m-hero-pilula">
            Confirmar presença
          </a>
        )}
      </header>
      <div className="m-hero-miolo">
        <div className="m-hero-esq">
          <div data-hero="0" className="m-hero-rotulo">
            {rotulo.charAt(0).toUpperCase() + rotulo.slice(1)}
          </div>
          {casal.forma === "nomes" && (
            <h1 data-hero="1" className="k-nome m-hero-nomes">
              <NomesDoCasal casal={casal} />
            </h1>
          )}
          {casal.forma === "iniciais" && (
            <h1 data-hero="1" className="k-nome m-hero-iniciais">
              <span aria-hidden>
                {casal.i1}
                {casal.dois && <span className="k-amp m-hero-amp-ini"> &amp; </span>}
                {casal.i2}
              </span>
              <span className="k-so-leitor">{[casal.nome1, casal.nome2].filter(Boolean).join(" e ")}</span>
            </h1>
          )}
          {casal.forma === "iniciais-nomes" && (
            <h1 data-hero="1" className="m-hero-ambos">
              <span className="k-nome m-hero-iniciais m-hero-iniciais--sm" aria-hidden>
                {casal.i1}
                {casal.dois && <span className="k-amp m-hero-amp-ini"> &amp; </span>}
                {casal.i2}
              </span>
              <span className="k-nome m-hero-nomes m-hero-nomes--sm">
                {casal.nome1}
                {casal.dois && " & "}
                {casal.nome2}
              </span>
            </h1>
          )}
          <div data-hero="2" className="m-hero-quando">
            <span>{quando}</span>
            {onde && (
              <>
                <span className="m-hero-ponto" aria-hidden>
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
