"use client";

// 8 · Localização (#local), fundo alt, em duas colunas (auto-fit, mínimo
// 340px): a foto CIRCULAR do espaço com parallax (a camada a −8% e 116%,
// translateY = (centro do quadro − vh/2) × −0.07, no laço único) e, do
// outro lado, "Onde vamos celebrar", o nome do espaço, o endereço e a
// pílula "Como chegar →" (Google Maps em nova aba).
//
// Nome, endereço e cidade vêm do evento, ao vivo; a foto é a do bloco
// "O local". Sem foto, o texto fica sozinho, centrado.

import { useRef } from "react";
import { lerLocal } from "@/lib/site-conteudo";
import { ComoChegar } from "@/components/site/pecas/ComoChegar";
import { useCena } from "@/components/site/pecas/useCena";
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

  const casca = useRef<HTMLDivElement>(null);
  const camada = useRef<HTMLDivElement>(null);
  const ultimo = useRef<number | null>(null);
  useCena(
    casca,
    ({ rect, vh, final }) => {
      const el = camada.current;
      if (!el) return;
      if (final) {
        el.style.transform = "";
        return;
      }
      const y = Math.round((rect.top + rect.height / 2 - vh / 2) * -0.07 * 10) / 10;
      if (y === ultimo.current) return;
      ultimo.current = y;
      el.style.transform = `translate3d(0,${y}px,0)`;
    },
    { ligado: comFoto }
  );

  return (
    <section id={ancora} className="a-secao a-alt a-local">
      <div className={`a-local-grade ${comFoto ? "" : "a-local-grade--so"}`}>
        {comFoto && (
          <div ref={casca}>
            <Quadro caminho={foto} proporcao="1/1" forma="circulo" parallax={{ ref: camada }} />
          </div>
        )}
        <div className="a-local-texto">
          <div data-revelar="up" className="a-eyebrow">
            Onde vamos celebrar
          </div>
          {nome && (
            <h2 data-revelar="up" data-atraso="120" className="a-h2">
              {nome}
            </h2>
          )}
          {endereco && (
            <p data-revelar="up" data-atraso="200" className="a-local-endereco">
              {endereco}
            </p>
          )}
          <div data-revelar="up" data-atraso="280" className="a-local-botao">
            <ComoChegar local={evento.local} endereco={evento.endereco} cidade={evento.cidade} className="a-pilula">
              Como chegar <span aria-hidden>→</span>
            </ComoChegar>
          </div>
        </div>
      </div>
    </section>
  );
}
