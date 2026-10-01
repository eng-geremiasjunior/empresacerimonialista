"use client";

// 6 · O grande dia (#dia), fundo alt: o cartão-convite de papel (máx.
// 620px) com a moldura dourada a 14px, o reflexo radial que segue o
// mouse, as alianças compactas, "Nosso casamento", a data por extenso, o
// local e a programação com a linha pontilhada. Embaixo, "Ver
// localização" (só com a seção do local no site) e "Adicionar à agenda"
// (.ics de verdade: hora de Brasília, fim e endereço).
//
// O tilt: perspective(1100px) rotateX((.5−y)×7deg) rotateY((x−.5)×9deg),
// .6s E, e volta no mouseleave. Escrito direto no estilo (sem setState) e
// só no público, sem reduced-motion.
//
// A programação vem do bloco "Momentos do dia". Sem ela, a hora do evento
// vira a linha única da cerimônia; sem hora, a lista some.

import type { PointerEvent } from "react";
import { dataLonga } from "@/lib/rsvp-convite";
import { lerMomentos } from "@/lib/site-conteudo";
import { BotaoAgenda } from "@/components/site/pecas/BotaoAgenda";
import { movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { Aliancas } from "../Aliancas";
import { horaDoDesenho, type PropsDaSecao } from "../comum";

export function GrandeDia({ dados, bloco, casal, ancora, modo, comLocal }: PropsDaSecao & { comLocal: boolean }) {
  const { evento } = dados;
  const itens = lerMomentos(bloco.conteudo).itens;
  const agenda =
    itens.length > 0
      ? itens
      : evento.hora && /^\d{2}:\d{2}/.test(evento.hora)
        ? [{ rotulo: "Cerimônia", hora: evento.hora.slice(0, 5), nota: "" }]
        : [];
  const nomes = [casal.nome1, casal.nome2].filter(Boolean).join(" & ");
  const inclina = modo === "publico";

  // só com mouse: no toque o mousemove sintético deixaria o cartão torto
  function mover(e: PointerEvent<HTMLDivElement>) {
    if (!inclina || e.pointerType !== "mouse" || movimentoReduzido()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(1100px) rotateX(${((0.5 - y) * 7).toFixed(2)}deg) rotateY(${((x - 0.5) * 9).toFixed(2)}deg)`;
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  }

  function soltar(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.style.transform = "";
  }

  return (
    <section id={ancora} className="a-secao a-alt a-dia">
      <div data-revelar="up" className="a-dia-caixa">
        <div className="a-convite" onPointerMove={mover} onPointerLeave={soltar}>
          <div className="a-convite-moldura" aria-hidden />
          <div className="a-convite-reflexo" aria-hidden />
          <div className="a-convite-aneis">
            <Aliancas compacta brilho={false} faiscas={false} inicio={0} alvo={() => 0} />
          </div>
          <div className="a-eyebrow a-convite-rotulo">Nosso casamento</div>
          <h2 className="a-h2 a-h2--sm a-convite-data">{dataLonga(evento.data)}</h2>
          {evento.local && <div className="a-convite-local">{evento.local}</div>}
          {agenda.length > 0 && (
            <div className="a-convite-agenda">
              {agenda.map((a, i) => (
                <div key={i} className="a-convite-linha">
                  <span className="a-convite-rotulo-linha">{a.rotulo}</span>
                  <span className="a-convite-pontos" aria-hidden />
                  <span className="a-convite-hora">{horaDoDesenho(a.hora)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="a-convite-botoes">
            {comLocal && (
              <a href="#local" className="a-pilula">
                Ver localização
              </a>
            )}
            <BotaoAgenda
              className="a-pilula a-pilula--cheia"
              rotulo="Adicionar à agenda"
              evento={{
                titulo: nomes ? `Casamento ${nomes}` : "Casamento",
                data: evento.data,
                hora: evento.hora,
                local: evento.local,
                endereco: [evento.endereco, evento.cidade].filter(Boolean).join(", ") || null,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
