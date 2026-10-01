"use client";

// Confirmação de presença (#rsvp, T03 e T04): o cartão de raio 32 em 2
// colunas — à esquerda "Confirmação de presença", "Você vem celebrar com
// a gente?" e o prazo; à direita, o formulário com os campos de raio 18
// em soft (16px) e os botões de contorno ink que se preenchem.
//
// O formulário é o REAL do produto (useRsvp: POST /api/rsvp/[hash]):
// nome (o erro é a borda em accentText, como no desenho), e-mail, "Sim,
// estarei lá"/"Não poderei ir", e no sim os acompanhantes no "− n +" do
// desenho, cada um com a linha do nome e a marca de criança, o menu (se
// a noiva pôs opções) e a restrição; o recado e "Enviar confirmação".
// Sai o contador anônimo de 0 a 6.
//
// Os finais em soft: o coração em pêssego, "Que alegria ter você com a
// gente! ❤️", a frase com o primeiro nome e a data, a entrada (QR) e
// "Alterar resposta", com as 34 pétalas de outono; ou "Vamos sentir sua
// falta.". "Alterar resposta" volta ao formulário preenchido (o mesmo
// e-mail atualiza a mesma resposta).

import { useEffect, useRef, useState } from "react";
import { CredencialEntrada } from "@/components/rsvp/ConfirmacaoConvidado";
import { formatarPrazo, useRsvp } from "@/components/site/pecas/useRsvp";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { diaEMes, Entrada, Icone, LinkDeVolta, Rotulo, type PropsDaSecao } from "../comum";

export function Rsvp({ dados, ancora }: PropsDaSecao) {
  const { rsvp, evento } = dados;
  const r = useRsvp(rsvp.hash);
  const [semNome, setSemNome] = useState(false);
  const [acompSemNome, setAcompSemNome] = useState(false);
  const menu = rsvp.menu ?? [];
  const primeiroNome = r.nome.trim().split(/\s+/)[0] ?? "";

  // o desenho abre com "Sim" marcado
  const { vai, setVai } = r;
  useEffect(() => {
    if (vai === null) setVai(true);
  }, [vai, setVai]);

  function enviar() {
    if (!r.nome.trim()) {
      setSemNome(true);
      return;
    }
    if (r.vai && r.acompanhantes.some((a) => !a.nome.trim())) {
      setAcompSemNome(true);
      return;
    }
    void r.enviar();
  }

  const feito = r.pronto;
  const sim = r.vai !== false;

  return (
    <section id={ancora} data-sec={ancora} data-revelar="up" className="k-cartao k-rsvp">
      <div className="k-rsvp-esq">
        <Rotulo className="k-rotulo--acento">Confirmação de presença</Rotulo>
        <h2 className="k-h2 k-h2--balance">Você vem celebrar com a gente?</h2>
        {rsvp.aberto && rsvp.prazo && <div className="k-mudo">Confirme sua presença até {formatarPrazo(rsvp.prazo)}.</div>}
      </div>

      <div className="k-rsvp-dir">
        {!rsvp.aberto && (
          <div className="k-rsvp-fim">
            <div className="k-rsvp-fim-titulo k-rsvp-fim-titulo--nao">As confirmações foram encerradas.</div>
          </div>
        )}

        {rsvp.aberto && !feito && (
          <form
            className="k-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
          >
            <input
              className="k-campo"
              data-erro={semNome ? "" : undefined}
              aria-invalid={semNome || undefined}
              value={r.nome}
              placeholder="Seu nome, como está no convite"
              aria-label="Seu nome, como está no convite"
              autoComplete="name"
              onChange={(e) => {
                r.setNome(e.target.value);
                if (semNome) setSemNome(false);
              }}
            />
            <input
              className="k-campo"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={r.email}
              placeholder="Seu e-mail"
              aria-label="Seu e-mail"
              onChange={(e) => r.setEmail(e.target.value)}
            />
            <div className="k-escolhas">
              <button type="button" className="k-escolha" aria-pressed={sim} onClick={() => r.setVai(true)}>
                Sim, estarei lá
              </button>
              <button type="button" className="k-escolha" aria-pressed={!sim} onClick={() => r.setVai(false)}>
                Não poderei ir
              </button>
            </div>

            {sim && (
              <>
                <div className="k-acomp">
                  <div className="k-acomp-topo">
                    <span className="k-acomp-rotulo">Acompanhantes</span>
                    <div className="k-acomp-conta">
                      <button
                        type="button"
                        className="k-redondo"
                        aria-label="Um acompanhante a menos"
                        disabled={r.acompanhantes.length === 0}
                        onClick={() => {
                          r.removerAcompanhante(r.acompanhantes.length - 1);
                          setAcompSemNome(false);
                        }}
                      >
                        −
                      </button>
                      <span className="k-acomp-n">{r.acompanhantes.length}</span>
                      <button type="button" className="k-redondo" aria-label="Mais um acompanhante" onClick={r.adicionarAcompanhante}>
                        +
                      </button>
                    </div>
                  </div>
                  {r.acompanhantes.map((a, i) => (
                    <div key={i} className="k-acomp-linha">
                      <input
                        className="k-campo k-campo--claro"
                        data-erro={acompSemNome && !a.nome.trim() ? "" : undefined}
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
                        className="k-escolha k-escolha--pequena"
                        aria-pressed={a.crianca}
                        onClick={() => r.mudarAcompanhante(i, { crianca: !a.crianca })}
                      >
                        Criança
                      </button>
                      <button
                        type="button"
                        className="k-redondo k-redondo--pequeno"
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
                  {acompSemNome && <span className="k-erro">Escreva o nome de cada acompanhante.</span>}
                </div>

                {menu.length > 0 && (
                  <div className="k-menu">
                    <span className="k-acomp-rotulo">Menu</span>
                    <div className="k-escolhas k-escolhas--soltas">
                      {menu.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="k-escolha"
                          aria-pressed={r.menuEscolhido === m}
                          onClick={() => r.setMenuEscolhido(r.menuEscolhido === m ? "" : m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  className="k-campo"
                  value={r.restricao}
                  placeholder="Restrição alimentar (opcional)"
                  aria-label="Restrição alimentar (opcional)"
                  onChange={(e) => r.setRestricao(e.target.value)}
                />
              </>
            )}

            <textarea
              className="k-campo k-campo--texto"
              rows={3}
              value={r.recado}
              placeholder="Um recado para os noivos (opcional)"
              aria-label="Um recado para os noivos (opcional)"
              onChange={(e) => r.setRecado(e.target.value)}
            />

            {r.erro && (
              <p className="k-erro" role="alert">
                {r.erro}
              </p>
            )}

            <button type="submit" className="k-botao k-botao--enviar" disabled={r.enviando}>
              {r.enviando ? "Enviando…" : "Enviar confirmação"}
            </button>
          </form>
        )}

        {rsvp.aberto && feito && sim && (
          <Entrada className="k-rsvp-fim">
            <span className="k-rsvp-coracao" aria-hidden>
              <Icone nome="coracao" className="k-rsvp-coracao-icone" />
            </span>
            <div className="k-rsvp-fim-titulo">Que alegria ter você com a gente! ❤️</div>
            <div className="k-mudo k-rsvp-fim-p">
              {primeiroNome ? `${primeiroNome}, sua presença está confirmada.` : "Sua presença está confirmada."} Nos vemos no
              dia {diaEMes(evento.data)}.
            </div>
            {r.credencial && (
              <div className="k-rsvp-entrada">
                <CredencialEntrada credencial={r.credencial} />
              </div>
            )}
            <LinkDeVolta onClick={r.alterarResposta}>Alterar resposta</LinkDeVolta>
          </Entrada>
        )}

        {rsvp.aberto && feito && !sim && (
          <Entrada className="k-rsvp-fim k-rsvp-fim--nao">
            <div className="k-rsvp-fim-titulo k-rsvp-fim-titulo--nao">Vamos sentir sua falta.</div>
            <div className="k-mudo k-rsvp-fim-p">
              Obrigado por nos avisar{primeiroNome ? `, ${primeiroNome}` : ""}. Você estará no nosso coração nesse dia.
            </div>
            <LinkDeVolta onClick={r.alterarResposta}>Alterar resposta</LinkDeVolta>
          </Entrada>
        )}
      </div>

      {rsvp.aberto && feito && sim && <Petalas />}
    </section>
  );
}

const CORES_DAS_PETALAS = ["#e3a47f", "#c9774f", "#d9b36a", "#b5562f", "#e8c7a8"];

/** As 34 pétalas de outono do "sim": 4200–6800ms, delay até 1600ms, giro
 *  e desvio sorteados no navegador. Fora do público e com reduced-motion,
 *  nada cai (o protótipo esqueceu o reduced-motion). */
function Petalas() {
  const ref = useRef<HTMLDivElement>(null);
  const { modo } = useModoDoSite();
  useEffect(() => {
    const el = ref.current;
    if (!el || modo !== "publico" || movimentoReduzido()) return;
    const A: Animation[] = [];
    Array.from(el.children).forEach((k) => {
      if (typeof (k as HTMLElement).animate !== "function") return;
      const x = (Math.random() * 2 - 1) * 80;
      const g = Math.random() * 600 - 300;
      A.push(
        (k as HTMLElement).animate(
          [
            { transform: "translate(0,-30px) rotate(0deg)", opacity: 0 },
            { opacity: 0.95, offset: 0.12 },
            { transform: `translate(${x}px,640px) rotate(${g}deg)`, opacity: 0 },
          ],
          {
            duration: 4200 + Math.random() * 2600,
            delay: Math.random() * 1600,
            easing: "cubic-bezier(.3,.1,.4,1)",
            fill: "both",
          }
        )
      );
    });
    return () => A.forEach((a) => a.cancel());
  }, [modo]);
  if (modo !== "publico") return null;
  return (
    <div ref={ref} className="k-petalas" aria-hidden>
      {Array.from({ length: 34 }, (_, i) => (
        <span
          key={i}
          className="k-petala"
          style={{
            left: `${(i * 31 + 5) % 100}%`,
            width: 8 + (i % 3) * 3,
            height: 12 + (i % 3) * 4,
            background: CORES_DAS_PETALAS[i % CORES_DAS_PETALAS.length],
          }}
        />
      ))}
    </div>
  );
}
