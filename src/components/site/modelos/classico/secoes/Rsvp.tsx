"use client";

// 9 · Confirmação de presença (#rsvp): "Você vem celebrar com a gente?",
// o prazo e o botão que abre o formulário ali mesmo. O formulário é o
// REAL do produto (useRsvp: POST /api/rsvp/[hash], e-mail, acompanhantes
// com nome e marca de criança, menu, recado, QR de entrada) vestido no
// desenho do T01: campos só com o fio de baixo, rótulos de 11px, as
// escolhas que invertem ink/bg, os botões redondos de 40px no "−  n  +"
// dos acompanhantes (cada um ganha a linha do nome). Sai o contador
// anônimo de 0 a 6.
//
// Os finais: "Que alegria ter você com a gente! ❤️" com as pétalas e a
// entrada (QR), ou "Vamos sentir sua falta."; os dois com "Alterar
// resposta", que volta ao formulário preenchido (o mesmo e-mail atualiza
// a mesma resposta).
//
// Revisão do dono: o formulário já aberto, para ele ver o menu e os
// campos. Prévia: parada no botão.

import { useEffect, useRef, useState } from "react";
import { CredencialEntrada } from "@/components/rsvp/ConfirmacaoConvidado";
import { formatarPrazo, useRsvp } from "@/components/site/pecas/useRsvp";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { diaEMes, Entrada, LinkDeVolta, type PropsDaSecao } from "../comum";

export function Rsvp({ dados, ancora, modo }: PropsDaSecao) {
  const { rsvp, evento } = dados;
  const r = useRsvp(rsvp.hash);
  const [aberto, setAberto] = useState(modo === "revisao");
  const [semNome, setSemNome] = useState(false);
  // o número do "− n +" é o que vai no POST: acompanhante sem nome não
  // entra na conta do useRsvp, então não deixa enviar com linha em branco
  const [acompSemNome, setAcompSemNome] = useState(false);
  const menu = rsvp.menu ?? [];
  const primeiroNome = r.nome.trim().split(/\s+/)[0] ?? "";

  // o desenho abre com "Sim" marcado
  const { vai, setVai } = r;
  useEffect(() => {
    if (aberto && vai === null) setVai(true);
  }, [aberto, vai, setVai]);

  function enviar() {
    if (!r.nome.trim()) {
      setSemNome(true);
      return;
    }
    if (r.vai === null) return;
    if (r.vai && r.acompanhantes.some((a) => !a.nome.trim())) {
      setAcompSemNome(true);
      return;
    }
    void r.enviar();
  }

  if (!rsvp.aberto) {
    return (
      <section id={ancora} className="c-secao c-rsvp">
        <div className="c-rsvp-miolo">
          <h2 data-revelar="up" className="c-h2 c-h2--balance">
            Você vem celebrar com a gente?
          </h2>
          <p data-revelar="up" data-atraso="120" className="c-rsvp-prazo">
            As confirmações foram encerradas.
          </p>
        </div>
      </section>
    );
  }

  const feito = r.pronto;

  return (
    <section id={ancora} className="c-secao c-rsvp">
      <div className="c-rsvp-miolo">
        {!feito && (
          <>
            <h2 data-revelar="up" className="c-h2 c-h2--balance">
              Você vem celebrar com a gente?
            </h2>
            {rsvp.prazo && (
              <p data-revelar="up" data-atraso="120" className="c-rsvp-prazo">
                Confirme sua presença até
                <br />
                <span className="c-rsvp-data">{formatarPrazo(rsvp.prazo)}</span>
              </p>
            )}
          </>
        )}

        {!feito && !aberto && (
          <button type="button" data-revelar="up" data-atraso="240" className="c-btn c-btn--cheio c-btn--grande c-rsvp-abrir" onClick={() => setAberto(true)}>
            Confirmar presença
          </button>
        )}

        {!feito && aberto && (
          <Entrada className="c-form">
            <label className="c-campo">
              <span className="c-campo-rotulo">Seu nome</span>
              <input
                className="c-campo-entrada c-campo-entrada--grande"
                value={r.nome}
                placeholder="Como está no convite"
                autoComplete="name"
                onChange={(e) => {
                  r.setNome(e.target.value);
                  if (semNome) setSemNome(false);
                }}
              />
              {semNome && <span className="c-campo-erro">Conte para a gente quem você é.</span>}
            </label>

            <label className="c-campo">
              <span className="c-campo-rotulo">Seu e-mail</span>
              <input
                className="c-campo-entrada"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={r.email}
                placeholder="voce@email.com"
                onChange={(e) => r.setEmail(e.target.value)}
              />
            </label>

            <div className="c-campo">
              <span className="c-campo-rotulo">Você vai comparecer?</span>
              <div className="c-escolhas">
                <button type="button" className="c-escolha" aria-pressed={r.vai !== false} onClick={() => r.setVai(true)}>
                  Sim, estarei lá
                </button>
                <button type="button" className="c-escolha" aria-pressed={r.vai === false} onClick={() => r.setVai(false)}>
                  Infelizmente não poderei
                </button>
              </div>
            </div>

            {r.vai !== false && (
              <>
                <div className="c-acomp">
                  <div className="c-acomp-topo">
                    <span className="c-campo-rotulo">Acompanhantes</span>
                    <div className="c-acomp-conta">
                      <button
                        type="button"
                        className="c-redondo"
                        aria-label="Um acompanhante a menos"
                        disabled={r.acompanhantes.length === 0}
                        onClick={() => {
                          r.removerAcompanhante(r.acompanhantes.length - 1);
                          setAcompSemNome(false);
                        }}
                      >
                        −
                      </button>
                      <span className="c-acomp-n">{r.acompanhantes.length}</span>
                      <button
                        type="button"
                        className="c-redondo"
                        aria-label="Mais um acompanhante"
                        onClick={r.adicionarAcompanhante}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {r.acompanhantes.map((a, i) => (
                    <div key={i} className="c-acomp-linha">
                      <input
                        className="c-campo-entrada"
                        value={a.nome}
                        placeholder={`Nome do ${i + 1}º acompanhante`}
                        aria-label={`Nome do ${i + 1}º acompanhante`}
                        aria-invalid={acompSemNome && !a.nome.trim() ? true : undefined}
                        onChange={(e) => {
                          r.mudarAcompanhante(i, { nome: e.target.value });
                          if (acompSemNome) setAcompSemNome(false);
                        }}
                      />
                      <button
                        type="button"
                        className="c-escolha c-escolha--pequena"
                        aria-pressed={a.crianca}
                        onClick={() => r.mudarAcompanhante(i, { crianca: !a.crianca })}
                      >
                        Criança
                      </button>
                      <button
                        type="button"
                        className="c-tirar"
                        aria-label={`Tirar o ${i + 1}º acompanhante`}
                        onClick={() => {
                          r.removerAcompanhante(i);
                          setAcompSemNome(false);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {acompSemNome && <span className="c-campo-erro">Escreva o nome de cada acompanhante.</span>}
                </div>

                {menu.length > 0 && (
                  <div className="c-campo">
                    <span className="c-campo-rotulo">Menu</span>
                    <div className="c-escolhas">
                      {menu.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="c-escolha"
                          aria-pressed={r.menuEscolhido === m}
                          onClick={() => r.setMenuEscolhido(r.menuEscolhido === m ? "" : m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="c-campo">
                  <span className="c-campo-rotulo">Restrição alimentar (opcional)</span>
                  <input
                    className="c-campo-entrada c-campo-entrada--media"
                    value={r.restricao}
                    placeholder="Vegetariano, alergias..."
                    onChange={(e) => r.setRestricao(e.target.value)}
                  />
                </label>
              </>
            )}

            <label className="c-campo">
              <span className="c-campo-rotulo">Um recado para os noivos (opcional)</span>
              <textarea
                className="c-campo-entrada c-campo-entrada--media c-campo-texto"
                rows={3}
                value={r.recado}
                onChange={(e) => r.setRecado(e.target.value)}
              />
            </label>

            {r.erro && (
              <p className="c-campo-erro" role="alert">
                {r.erro}
              </p>
            )}

            <button type="button" className="c-btn c-btn--cheio c-btn--grande c-form-enviar" onClick={enviar} disabled={r.enviando}>
              {r.enviando ? "Enviando…" : "Enviar confirmação"}
            </button>
          </Entrada>
        )}

        {feito && r.vai !== false && (
          <>
            <Petalas />
            <Entrada className="c-rsvp-fim">
              <h2 className="c-h2 c-h2--balance c-h2--fim">Que alegria ter você com a gente! ❤️</h2>
              <p className="c-rsvp-fim-p">
                {primeiroNome ? `${primeiroNome}, sua presença está confirmada.` : "Sua presença está confirmada."} Nos
                vemos no dia {diaEMes(evento.data)}.
              </p>
              {r.credencial && (
                <div className="c-rsvp-entrada">
                  <CredencialEntrada credencial={r.credencial} />
                </div>
              )}
              <LinkDeVolta onClick={r.alterarResposta}>Alterar resposta</LinkDeVolta>
            </Entrada>
          </>
        )}

        {feito && r.vai === false && (
          <Entrada className="c-rsvp-fim">
            <h2 className="c-h2 c-h2--fim">Vamos sentir sua falta.</h2>
            <p className="c-rsvp-fim-p">
              Obrigado por nos avisar{primeiroNome ? `, ${primeiroNome}` : ""}. Você estará no nosso coração nesse dia.
            </p>
            <LinkDeVolta onClick={r.alterarResposta}>Alterar resposta</LinkDeVolta>
          </Entrada>
        )}
      </div>
    </section>
  );
}

/** As 26 pétalas do "sim": cor accent, 3.6–6s, giro e desvio sorteados no
 *  navegador. Fora do público e com reduced-motion, nada cai. */
function Petalas() {
  const ref = useRef<HTMLDivElement>(null);
  const { modo } = useModoDoSite();
  useEffect(() => {
    const el = ref.current;
    if (!el || modo !== "publico" || movimentoReduzido()) return;
    const A: Animation[] = [];
    Array.from(el.children).forEach((k) => {
      if (typeof (k as HTMLElement).animate !== "function") return;
      const x = (Math.random() * 2 - 1) * 60;
      const g = Math.random() * 540 - 270;
      A.push(
        (k as HTMLElement).animate(
          [
            { transform: "translate(0,-20px) rotate(0deg)", opacity: 0 },
            { opacity: 0.85, offset: 0.15 },
            { transform: `translate(${x}px,520px) rotate(${g}deg)`, opacity: 0 },
          ],
          { duration: 3600 + Math.random() * 2400, delay: Math.random() * 1400, easing: "cubic-bezier(.3,.1,.4,1)", fill: "both" }
        )
      );
    });
    return () => A.forEach((a) => a.cancel());
  }, [modo]);
  return (
    <div className="c-petalas" aria-hidden>
      <div ref={ref} className="c-petalas-caixa">
        {Array.from({ length: 26 }, (_, i) => (
          <span
            key={i}
            className="c-petala"
            style={{ left: `${(i * 37 + 7) % 100}%`, width: 7 + (i % 3) * 3, height: 11 + (i % 3) * 4 }}
          />
        ))}
      </div>
    </div>
  );
}
