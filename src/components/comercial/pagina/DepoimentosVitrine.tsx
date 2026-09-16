"use client";

// Os depoimentos da vitrine: um em destaque na faixa escura (o ponto alto
// da rolagem) e os outros embaixo. Acima de quatro, três à vista e um
// botão para o resto. Com um só, só a faixa, no singular.
//
// O destaque acompanha o formulário: quem escolhe "Formatura" passa a ler
// primeiro o depoimento de uma formatura, quando ela tem um. Sem o tipo
// na leitura (165 ainda não reaplicada), a ordem é a do Catálogo.

import { useEffect, useMemo, useRef, useState } from "react";
import { useVitrine } from "./VitrineViva";

export type DepoimentoDaVitrine = {
  texto: string;
  /** "Marina e Tiago · Casamento em 2025" */
  quem: string;
  tipo: string | null;
};

const LIMITE_SEM_BOTAO = 4;
const OUTROS_ANTES_DO_BOTAO = 3;

const chave = (d: DepoimentoDaVitrine) => `${d.quem} | ${d.texto}`;

export function DepoimentosVitrine({ depoimentos }: { depoimentos: DepoimentoDaVitrine[] }) {
  const { tipo } = useVitrine();
  const [todos, setTodos] = useState(false);
  const primeiroNovo = useRef<HTMLElement | null>(null);
  const focarNovo = useRef(false);

  const ordem = useMemo(() => {
    if (!tipo || depoimentos.length < 2) return depoimentos;
    const doTipo = depoimentos.find((d) => d.tipo === tipo);
    if (!doTipo) return depoimentos;
    return [doTipo, ...depoimentos.filter((d) => d !== doTipo)];
  }, [tipo, depoimentos]);

  useEffect(() => {
    if (!focarNovo.current) return;
    primeiroNovo.current?.focus();
    focarNovo.current = false;
  }, [todos]);

  if (ordem.length === 0) return null;
  const [destaque, ...outros] = ordem;
  const cabem = todos || depoimentos.length <= LIMITE_SEM_BOTAO;
  const visiveis = cabem ? outros : outros.slice(0, OUTROS_ANTES_DO_BOTAO);

  return (
    <>
      <section className="vt-faixa" aria-label={depoimentos.length === 1 ? "Depoimento" : "Depoimentos"}>
        <p className="vt-faixa-rotulo">{depoimentos.length === 1 ? "Depoimento" : "Depoimentos"}</p>
        {/* a chave remonta o bloco quando o destaque troca: a entrada recomeça */}
        <figure key={chave(destaque)} className="vt-faixa-giro-par" aria-live="polite">
          <blockquote className="vt-faixa-texto">{destaque.texto}</blockquote>
          <figcaption className="vt-faixa-quem">{destaque.quem}</figcaption>
        </figure>
      </section>

      {outros.length > 0 && (
        <div className="vt-depoimentos">
          <div className="vt-depoimentos-grade">
            {visiveis.map((d, i) => (
              <figure
                key={chave(d)}
                className="vt-depoimento"
                tabIndex={i === OUTROS_ANTES_DO_BOTAO ? -1 : undefined}
                ref={i === OUTROS_ANTES_DO_BOTAO ? (el) => { primeiroNovo.current = el; } : undefined}
              >
                <blockquote className="vt-depoimento-texto">{d.texto}</blockquote>
                <figcaption>
                  <span className="vt-depoimento-quem">{d.quem}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          {!cabem && (
            <button
              type="button"
              className="vt-botao-mais"
              onClick={() => {
                focarNovo.current = true;
                setTodos(true);
              }}
            >
              Ver os {depoimentos.length} depoimentos
            </button>
          )}
        </div>
      )}
    </>
  );
}
