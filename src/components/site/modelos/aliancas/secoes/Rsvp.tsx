"use client";

// 10 · Confirmação de presença (#rsvp), fundo escuro: "Você vem celebrar
// com a gente?", o prazo e a pílula "Confirmar presença", que abre o
// formulário ali mesmo. O formulário é o REAL do produto (useRsvp: POST
// /api/rsvp/[hash], e-mail, acompanhantes com nome e marca de criança,
// menu, recado, QR de entrada) vestido no desenho do T02: campos só com o
// fio de baixo (darkLine), rótulos de 11px a .7, pílulas Sim/Não que
// invertem (darkInk/dark, .4s), os círculos de 44px do "−  n  +" — cada
// acompanhante ganha a linha do nome. Sai o contador anônimo de 0 a 6. O
// erro do nome vem em ouro, como no desenho.
//
// No "sim": as alianças que se encaixam (lerp .035) com o segundo estouro
// (40 partículas, 1100ms, alcance 220px), "Que alegria ter você com a
// gente! ❤️", a entrada (QR) e "Alterar resposta", que volta ao
// formulário preenchido (o mesmo e-mail atualiza a mesma resposta). No
// "não": "Vamos sentir sua falta.".
//
// Revisão do dono: o formulário já aberto. Prévia: parada no botão.

import { useEffect, useState } from "react";
import { CredencialEntrada } from "@/components/rsvp/ConfirmacaoConvidado";
import { formatarPrazo, useRsvp } from "@/components/site/pecas/useRsvp";
import { Estouro } from "@/components/site/pecas/Estouro";
import { Aliancas } from "../Aliancas";
import { diaEMes, Entrada, LinkDeVolta, type PropsDaSecao } from "../comum";

export function Rsvp({ dados, ancora, modo }: PropsDaSecao) {
  const { rsvp, evento } = dados;
  const r = useRsvp(rsvp.hash);
  const [aberto, setAberto] = useState(modo === "revisao");
  const [semNome, setSemNome] = useState(false);
  // acompanhante sem nome não entra na conta do useRsvp: não deixa enviar
  // com linha em branco
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
      <section id={ancora} className="a-secao a-escuro a-rsvp">
        <div className="a-rsvp-miolo">
          <h2 data-revelar="up" className="a-h2 a-h2--balance">
            Você vem celebrar com a gente?
          </h2>
          <p data-revelar="up" data-atraso="120" className="a-rsvp-prazo">
            As confirmações foram encerradas.
          </p>
        </div>
      </section>
    );
  }

  const feito = r.pronto;

  return (
    <section id={ancora} className="a-secao a-escuro a-rsvp">
      <div className="a-rsvp-miolo">
        {!feito && (
          <>
            <h2 data-revelar="up" className="a-h2 a-h2--balance">
              Você vem celebrar com a gente?
            </h2>
            {rsvp.prazo && (
              <p data-revelar="up" data-atraso="120" className="a-rsvp-prazo">
                Confirme sua presença até <span className="a-nowrap">{formatarPrazo(rsvp.prazo)}</span>
              </p>
            )}
          </>
        )}

        {!feito && !aberto && (
          <button
            type="button"
            data-revelar="up"
            data-atraso="220"
            className="a-pilula a-pilula--clara a-pilula--grande a-rsvp-abrir"
            onClick={() => setAberto(true)}
          >
            Confirmar presença
          </button>
        )}

        {!feito && aberto && (
          <Entrada className="a-form">
            <label className="a-campo">
              <span className="a-campo-rotulo">Seu nome</span>
              <input
                className="a-campo-entrada a-campo-entrada--grande"
                value={r.nome}
                placeholder="Como está no convite"
                autoComplete="name"
                onChange={(e) => {
                  r.setNome(e.target.value);
                  if (semNome) setSemNome(false);
                }}
              />
              {semNome && <span className="a-campo-erro">Conte para a gente quem você é.</span>}
            </label>

            <label className="a-campo">
              <span className="a-campo-rotulo">Seu e-mail</span>
              <input
                className="a-campo-entrada"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={r.email}
                placeholder="voce@email.com"
                onChange={(e) => r.setEmail(e.target.value)}
              />
            </label>

            <div className="a-escolhas a-escolhas--duas" role="group" aria-label="Você vai comparecer?">
              <button type="button" className="a-escolha" aria-pressed={r.vai !== false} onClick={() => r.setVai(true)}>
                Sim, estarei lá
              </button>
              <button type="button" className="a-escolha" aria-pressed={r.vai === false} onClick={() => r.setVai(false)}>
                Não poderei ir
              </button>
            </div>

            {r.vai !== false && (
              <>
                <div className="a-acomp">
                  <div className="a-acomp-topo">
                    <span className="a-campo-rotulo">Acompanhantes</span>
                    <div className="a-acomp-conta">
                      <button
                        type="button"
                        className="a-redondo"
                        aria-label="Um acompanhante a menos"
                        disabled={r.acompanhantes.length === 0}
                        onClick={() => {
                          r.removerAcompanhante(r.acompanhantes.length - 1);
                          setAcompSemNome(false);
                        }}
                      >
                        −
                      </button>
                      <span className="a-acomp-n">{r.acompanhantes.length}</span>
                      <button
                        type="button"
                        className="a-redondo"
                        aria-label="Mais um acompanhante"
                        onClick={r.adicionarAcompanhante}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {r.acompanhantes.map((a, i) => (
                    <div key={i} className="a-acomp-linha">
                      <input
                        className="a-campo-entrada"
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
                        className="a-escolha a-escolha--pequena"
                        aria-pressed={a.crianca}
                        onClick={() => r.mudarAcompanhante(i, { crianca: !a.crianca })}
                      >
                        Criança
                      </button>
                      <button
                        type="button"
                        className="a-tirar"
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
                  {acompSemNome && <span className="a-campo-erro">Escreva o nome de cada acompanhante.</span>}
                </div>

                {menu.length > 0 && (
                  <div className="a-campo">
                    <span className="a-campo-rotulo">Menu</span>
                    <div className="a-escolhas">
                      {menu.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="a-escolha"
                          aria-pressed={r.menuEscolhido === m}
                          onClick={() => r.setMenuEscolhido(r.menuEscolhido === m ? "" : m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="a-campo">
                  <span className="a-campo-rotulo">Restrição alimentar (opcional)</span>
                  <input
                    className="a-campo-entrada a-campo-entrada--media"
                    value={r.restricao}
                    placeholder="Vegetariano, alergias..."
                    onChange={(e) => r.setRestricao(e.target.value)}
                  />
                </label>
              </>
            )}

            <label className="a-campo">
              <span className="a-campo-rotulo">Um recado para os noivos (opcional)</span>
              <textarea
                className="a-campo-entrada a-campo-entrada--media a-campo-texto"
                rows={3}
                value={r.recado}
                onChange={(e) => r.setRecado(e.target.value)}
              />
            </label>

            {r.erro && (
              <p className="a-campo-erro" role="alert">
                {r.erro}
              </p>
            )}

            <button
              type="button"
              className="a-pilula a-pilula--clara a-pilula--grande a-form-enviar"
              onClick={enviar}
              disabled={r.enviando}
            >
              {r.enviando ? "Enviando…" : "Enviar confirmação"}
            </button>
          </Entrada>
        )}

        {feito && r.vai !== false && (
          <Entrada className="a-rsvp-fim">
            <div className="a-rsvp-aneis">
              <Aliancas inicio={1} lerp={0.035} alvo={() => 0} />
              <Estouro quantidade={40} atraso={1100} alcance={220} />
            </div>
            <h2 className="a-h2 a-h2--sm a-h2--balance a-h2--fim">Que alegria ter você com a gente! ❤️</h2>
            <p className="a-rsvp-fim-p">
              {primeiroNome ? `${primeiroNome}, sua presença está confirmada.` : "Sua presença está confirmada."} Nos
              vemos no dia {diaEMes(evento.data)}.
            </p>
            {r.credencial && (
              <div className="a-rsvp-entrada">
                <CredencialEntrada credencial={r.credencial} />
              </div>
            )}
            <LinkDeVolta onClick={r.alterarResposta}>Alterar resposta</LinkDeVolta>
          </Entrada>
        )}

        {feito && r.vai === false && (
          <Entrada className="a-rsvp-fim">
            <h2 className="a-h2 a-h2--sm a-h2--fim">Vamos sentir sua falta.</h2>
            <p className="a-rsvp-fim-p">
              Obrigado por nos avisar{primeiroNome ? `, ${primeiroNome}` : ""}. Você estará no nosso coração nesse dia.
            </p>
            <LinkDeVolta onClick={r.alterarResposta}>Alterar resposta</LinkDeVolta>
          </Entrada>
        )}
      </div>
    </section>
  );
}
