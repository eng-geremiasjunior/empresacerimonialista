"use client";

// 6 · Contagem, fundo escuro: "Faltam", dias/horas/minutos/segundos na
// fonte de título com números tabulares e "Para o nosso grande dia.".
// Só o textContent do número muda (useContagem); a troca anima 850ms:
// some, desce de −.22em e desfoca 8px. No dia: "Hoje é o dia!"; depois:
// "Obrigado por celebrar com a gente." no tamanho de título. No servidor
// os números saem vazios (sem divergência de hidratação).

import { ROTULOS_DA_CONTAGEM, useContagem, type UnidadeDaContagem } from "@/components/site/pecas/Contagem";
import type { PropsDaSecao } from "../comum";

const TROCA = {
  quadros: [
    { opacity: 0, transform: "translateY(-.22em)", filter: "blur(8px)" },
    { opacity: 1, transform: "none", filter: "blur(0)" },
  ],
  duracao: 850,
};

const UNIDADES: UnidadeDaContagem[] = ["d", "h", "m", "s"];

export function ContagemRegressiva({ dados }: PropsDaSecao) {
  const { evento } = dados;
  // dias com zero à esquerda, como o p2 do protótipo
  const { fase, numero } = useContagem(evento.data, evento.hora, { animacao: TROCA, preencherDias: true });

  return (
    <section className="c-secao c-escuro c-contagem">
      <div data-revelar="up" className="c-contagem-miolo">
        {fase === "contando" ? (
          <>
            <div className="c-contagem-faltam">Faltam</div>
            <div className="c-contagem-grade">
              {UNIDADES.map((u) => (
                <div key={u} className="c-contagem-un">
                  <span ref={numero[u]} className="sm-cd-n c-contagem-n" />
                  <span className="c-contagem-r">{ROTULOS_DA_CONTAGEM[u]}</span>
                </div>
              ))}
            </div>
            <div className="c-contagem-para">Para o nosso grande dia.</div>
          </>
        ) : (
          <div className="c-contagem-final">
            {fase === "hoje" ? "Hoje é o dia!" : "Obrigado por celebrar com a gente."}
          </div>
        )}
      </div>
    </section>
  );
}
