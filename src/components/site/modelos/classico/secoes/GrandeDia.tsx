"use client";

// 5 · O grande dia (#dia), fundo alt: "Nosso casamento", a data longa, o
// local e a programação em colunas com fio entre elas (o desenho tem 3:
// Cerimônia, Recepção e Festa). Embaixo, "Ver localização" (só se a seção
// do local está no site) e "Adicionar à minha agenda" (.ics de verdade,
// com a hora de Brasília, o fim e o endereço).
//
// A programação vem do bloco "Momentos do dia". Sem ela, a hora do evento
// vira a coluna única da cerimônia; sem hora, a faixa de colunas some.

import type { CSSProperties } from "react";
import { dataLonga } from "@/lib/rsvp-convite";
import { lerMomentos } from "@/lib/site-conteudo";
import { BotaoAgenda } from "@/components/site/pecas/BotaoAgenda";
import { horaDoDesenho, type PropsDaSecao } from "../comum";

export function GrandeDia({ dados, bloco, casal, ancora, comLocal }: PropsDaSecao & { comLocal: boolean }) {
  const { evento } = dados;
  const itens = lerMomentos(bloco.conteudo).itens;
  const agenda =
    itens.length > 0
      ? itens
      : evento.hora && /^\d{2}:\d{2}/.test(evento.hora)
        ? [{ rotulo: "Cerimônia", hora: evento.hora.slice(0, 5), nota: "" }]
        : [];
  // 3 por linha, como no desenho; 4 viram 2 × 2
  const colunas = agenda.length === 4 ? 2 : Math.min(agenda.length, 3);
  const nomes = [casal.nome1, casal.nome2].filter(Boolean).join(" & ");

  return (
    <section id={ancora} className="c-secao c-alt c-dia">
      <div className="c-dia-miolo">
        <div data-revelar="up" className="c-eyebrow">
          Nosso casamento
        </div>
        <h2 data-revelar="up" data-atraso="120" className="c-h2">
          {dataLonga(evento.data)}
        </h2>
        {evento.local && (
          <div data-revelar="up" data-atraso="200" className="c-dia-local">
            {evento.local}
          </div>
        )}
        {agenda.length > 0 && (
          <div
            data-revelar="up"
            data-atraso="280"
            className="c-dia-grade"
            style={{ "--c-colunas": colunas } as CSSProperties}
          >
            {agenda.map((a, i) => (
              <div
                key={i}
                className="c-dia-item"
                data-col={i % colunas === 0 ? "primeira" : undefined}
                data-linha={i >= colunas ? "seguinte" : undefined}
              >
                <div className="c-dia-rotulo">{a.rotulo}</div>
                <div className="c-dia-hora">{horaDoDesenho(a.hora)}</div>
                {a.nota && <div className="c-dia-nota">{a.nota}</div>}
              </div>
            ))}
          </div>
        )}
        <div data-revelar="up" data-atraso="360" className="c-dia-botoes">
          {comLocal && (
            <a href="#local" className="c-btn">
              Ver localização
            </a>
          )}
          <BotaoAgenda
            className="c-btn c-btn--cheio"
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
    </section>
  );
}
