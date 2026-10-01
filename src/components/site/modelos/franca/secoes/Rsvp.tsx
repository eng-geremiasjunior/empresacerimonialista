"use client";

// 12 · Répondez s'il vous plaît (#rsvp), fundo alt: o cartão de papel
// (max 640px) com as molduras de ouro em 12px e 17px. O formulário é o
// REAL do produto (useRsvp: POST /api/rsvp/[hash], e-mail, acompanhantes
// com nome e marca de criança, menu, recado, QR de entrada) vestido no
// desenho: campos só com a linha de baixo (a do nome fica #a63b3f no
// erro), "Sim, estarei lá" / "Não poderei ir" em 2 colunas que invertem
// para ink, os botões redondos de 44px no "−  n  +" dos acompanhantes
// (cada um ganha a linha do nome) e "Enviar confirmação". Sai o contador
// anônimo de 0 a 6.
//
// No "sim": o carimbo do selo de cera (112px, −8deg) cai de scale 2.4 e
// −28deg em 900ms; o texto entra 350ms depois, com a entrada (QR). No
// "não": "Vamos sentir sua falta.". Os dois com "Alterar resposta", que
// volta ao formulário preenchido (o mesmo e-mail atualiza a resposta).
//
// O T06 importa e põe as notas musicais por `festa`.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CredencialEntrada } from "@/components/rsvp/ConfirmacaoConvidado";
import { formatarPrazo, useRsvp } from "@/components/site/pecas/useRsvp";
import { useModoDoSite } from "@/components/site/pecas/contexto";
import { movimentoReduzido } from "@/components/site/pecas/useRevelar";
import { diaEMes, Entrada, LinkDeVolta, MolduraDupla, SeloDeCera, type CasalDoSite, type PropsDaSecao } from "../comum";

const useLayoutNoCliente = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** O carimbo do "sim": cai girando sobre o cartão. Só no público. */
function Carimbo({ casal }: { casal: CasalDoSite }) {
  const ref = useRef<HTMLDivElement>(null);
  const { modo } = useModoDoSite();
  useLayoutNoCliente(() => {
    const el = ref.current?.firstElementChild as HTMLElement | null;
    if (!el || modo !== "publico" || movimentoReduzido() || typeof el.animate !== "function") return;
    const a = el.animate(
      [
        { transform: "scale(2.4) rotate(-28deg)", opacity: 0 },
        { transform: "scale(.9) rotate(-8deg)", opacity: 1, offset: 0.7 },
        { transform: "scale(1) rotate(-8deg)", opacity: 1 },
      ],
      { duration: 900, easing: "cubic-bezier(.3,.7,.3,1)", fill: "both" }
    );
    return () => a.cancel();
  }, [modo]);
  return (
    <div ref={ref} className="f-carimbo">
      <SeloDeCera casal={casal} className="f-cera--carimbo" />
    </div>
  );
}

export function Rsvp({
  dados,
  casal,
  ancora,
  festa,
}: PropsDaSecao & {
  /** o que cai (ou sobe) sobre o cartão no "sim" (as notas do T06) */
  festa?: ReactNode;
}) {
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
    if (r.vai === null) return;
    if (r.vai && r.acompanhantes.some((a) => !a.nome.trim())) {
      setAcompSemNome(true);
      return;
    }
    void r.enviar();
  }

  const feito = r.pronto;

  return (
    <section id={ancora} className="f-secao f-alt f-rsvp">
      <div data-revelar="up" className="f-papel f-rsvp-cartao">
        <MolduraDupla />
        {feito && r.vai !== false && festa}
        <div className="f-papel-miolo f-rsvp-miolo">
          <div className="f-eyebrow">Répondez s&apos;il vous plaît</div>

          {!rsvp.aberto && (
            <>
              <h2 className="f-h2 f-h2--sm f-h2--balance">Você vem celebrar com a gente?</h2>
              <p className="f-cabeca-p">As confirmações foram encerradas.</p>
            </>
          )}

          {rsvp.aberto && !feito && (
            <>
              <h2 className="f-h2 f-h2--sm f-h2--balance">Você vem celebrar com a gente?</h2>
              {rsvp.prazo && <p className="f-cabeca-p">Confirme sua presença até {formatarPrazo(rsvp.prazo)}.</p>}
              <div className="f-form">
                <label className="f-campo">
                  <span className="f-campo-rotulo">Seu nome</span>
                  <input
                    className="f-campo-entrada f-campo-entrada--grande"
                    value={r.nome}
                    placeholder="Como está no convite"
                    autoComplete="name"
                    aria-invalid={semNome ? true : undefined}
                    onChange={(e) => {
                      r.setNome(e.target.value);
                      if (semNome) setSemNome(false);
                    }}
                  />
                  {semNome && <span className="f-campo-erro">Conte para a gente quem você é.</span>}
                </label>

                <label className="f-campo">
                  <span className="f-campo-rotulo">Seu e-mail</span>
                  <input
                    className="f-campo-entrada"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={r.email}
                    placeholder="voce@email.com"
                    onChange={(e) => r.setEmail(e.target.value)}
                  />
                </label>

                <div className="f-escolhas">
                  <button type="button" className="f-escolha" aria-pressed={r.vai !== false} onClick={() => r.setVai(true)}>
                    Sim, estarei lá
                  </button>
                  <button type="button" className="f-escolha" aria-pressed={r.vai === false} onClick={() => r.setVai(false)}>
                    Não poderei ir
                  </button>
                </div>

                {r.vai !== false && (
                  <>
                    <div className="f-acomp">
                      <div className="f-acomp-topo">
                        <span className="f-campo-rotulo">Acompanhantes</span>
                        <div className="f-acomp-conta">
                          <button
                            type="button"
                            className="f-redondo"
                            aria-label="Um acompanhante a menos"
                            disabled={r.acompanhantes.length === 0}
                            onClick={() => {
                              r.removerAcompanhante(r.acompanhantes.length - 1);
                              setAcompSemNome(false);
                            }}
                          >
                            −
                          </button>
                          <span className="f-acomp-n">{r.acompanhantes.length}</span>
                          <button type="button" className="f-redondo" aria-label="Mais um acompanhante" onClick={r.adicionarAcompanhante}>
                            +
                          </button>
                        </div>
                      </div>
                      {r.acompanhantes.map((a, i) => (
                        <div key={i} className="f-acomp-linha">
                          <input
                            className="f-campo-entrada"
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
                            className="f-escolha f-escolha--pequena"
                            aria-pressed={a.crianca}
                            onClick={() => r.mudarAcompanhante(i, { crianca: !a.crianca })}
                          >
                            Criança
                          </button>
                          <button
                            type="button"
                            className="f-tirar"
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
                      {acompSemNome && <span className="f-campo-erro">Escreva o nome de cada acompanhante.</span>}
                    </div>

                    {menu.length > 0 && (
                      <div className="f-campo">
                        <span className="f-campo-rotulo">Menu</span>
                        <div className="f-escolhas">
                          {menu.map((m) => (
                            <button
                              key={m}
                              type="button"
                              className="f-escolha"
                              aria-pressed={r.menuEscolhido === m}
                              onClick={() => r.setMenuEscolhido(r.menuEscolhido === m ? "" : m)}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <label className="f-campo">
                      <span className="f-campo-rotulo">Restrição alimentar (opcional)</span>
                      <input
                        className="f-campo-entrada"
                        value={r.restricao}
                        placeholder="Vegetariano, alergias..."
                        onChange={(e) => r.setRestricao(e.target.value)}
                      />
                    </label>
                  </>
                )}

                <label className="f-campo">
                  <span className="f-campo-rotulo">Um recado para os noivos (opcional)</span>
                  <textarea
                    className="f-campo-entrada f-campo-texto"
                    rows={3}
                    value={r.recado}
                    onChange={(e) => r.setRecado(e.target.value)}
                  />
                </label>

                {r.erro && (
                  <p className="f-campo-erro" role="alert">
                    {r.erro}
                  </p>
                )}

                <button type="button" className="f-btn f-btn--cheio f-btn--grande f-form-enviar" onClick={enviar} disabled={r.enviando}>
                  {r.enviando ? "Enviando…" : "Enviar confirmação"}
                </button>
              </div>
            </>
          )}

          {feito && r.vai !== false && (
            <>
              <Carimbo casal={casal} />
              <Entrada className="f-rsvp-fim">
                <h2 className="f-h2 f-h2--sm f-h2--balance">Que alegria ter você com a gente! ❤️</h2>
                <p className="f-rsvp-fim-p">
                  {primeiroNome ? `${primeiroNome}, sua presença está confirmada.` : "Sua presença está confirmada."} Nos vemos no
                  dia {diaEMes(evento.data)}.
                </p>
                {r.credencial && (
                  <div className="f-rsvp-entrada">
                    <CredencialEntrada credencial={r.credencial} />
                  </div>
                )}
                <LinkDeVolta onClick={r.alterarResposta}>Alterar resposta</LinkDeVolta>
              </Entrada>
            </>
          )}

          {feito && r.vai === false && (
            <Entrada className="f-rsvp-fim">
              <h2 className="f-h2 f-h2--sm">Vamos sentir sua falta.</h2>
              <p className="f-rsvp-fim-p">
                Obrigado por nos avisar{primeiroNome ? `, ${primeiroNome}` : ""}. Você estará no nosso coração nesse dia.
              </p>
              <LinkDeVolta onClick={r.alterarResposta}>Alterar resposta</LinkDeVolta>
            </Entrada>
          )}
        </div>
      </div>
    </section>
  );
}
