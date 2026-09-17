"use client";

// 04 — os depoimentos do modelo Capítulos: um em destaque, em itálico, e
// os outros em colunas embaixo. Acima de quatro, três à vista e um botão
// para o resto.
//
// O destaque acompanha o formulário: quem escolhe "Formatura" passa a ler
// primeiro o depoimento de uma formatura, quando ela tem um (a mesma régua
// do modelo Clássico).

import { useEffect, useMemo, useRef, useState } from "react";
import type { DepoimentoDaVitrine } from "../DepoimentosVitrine";
import { useVitrine } from "../VitrineViva";

const LIMITE_SEM_BOTAO = 4;
const OUTROS_ANTES_DO_BOTAO = 3;

const chave = (d: DepoimentoDaVitrine) => `${d.quem} | ${d.texto}`;

export function DepoimentosCapitulos({
  depoimentos,
  numero,
}: {
  depoimentos: DepoimentoDaVitrine[];
  /** o número do capítulo ("04") */
  numero: string;
}) {
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
  const rotulo = depoimentos.length === 1 ? "Depoimento" : "Depoimentos";

  return (
    <section className="cp-capitulo" data-cp-capitulo aria-label={rotulo}>
      <div className="cp-cabeca cp-cabeca-depoimentos">
        <span className="cp-numero" aria-hidden="true">
          {numero}
        </span>
        <p className="cp-rotulo">
          {rotulo}
          <span className="cp-rotulo-linha" data-cp-linha aria-hidden="true" />
        </p>
      </div>

      {/* a chave remonta o bloco quando o destaque troca: a entrada recomeça */}
      <figure key={chave(destaque)} className="cp-destaque" aria-live="polite">
        <blockquote className="cp-destaque-texto">{destaque.texto}</blockquote>
        <figcaption className="cp-destaque-quem">{destaque.quem}</figcaption>
      </figure>

      {outros.length > 0 && (
        <>
          <div className="cp-depoimentos">
            {visiveis.map((d, i) => (
              <figure
                key={chave(d)}
                className="cp-depoimento"
                tabIndex={i === OUTROS_ANTES_DO_BOTAO ? -1 : undefined}
                ref={
                  i === OUTROS_ANTES_DO_BOTAO
                    ? (el) => {
                        primeiroNovo.current = el;
                      }
                    : undefined
                }
              >
                <blockquote className="cp-depoimento-texto">{d.texto}</blockquote>
                <figcaption className="cp-depoimento-quem">{d.quem}</figcaption>
              </figure>
            ))}
          </div>
          {!cabem && (
            <button
              type="button"
              className="cp-botao-contorno cp-botao-mais"
              onClick={() => {
                focarNovo.current = true;
                setTodos(true);
              }}
            >
              Ver os {depoimentos.length} depoimentos
            </button>
          )}
        </>
      )}
    </section>
  );
}
