"use client";

// O formulário de candidatura da página /parceiras. Curto: nome, e-mail,
// Instagram, o que ensina e o WhatsApp; a frase sobre o que ensina é
// opcional.

import { useState, useTransition } from "react";
import { candidatarParceira } from "./actions";

const ENSINA: [string, string][] = [
  ["curso", "Curso"],
  ["mentoria", "Mentoria"],
  ["conteudo", "Conteúdo para colegas"],
  ["outro", "Outro"],
];

const CSS = `
.fp{display:flex;flex-direction:column;gap:18px;max-width:560px;width:100%}
.fp label{display:flex;flex-direction:column;gap:7px;font-size:13px;letter-spacing:.04em;color:#6B6259}
.fp input,.fp textarea{font:inherit;font-size:16px;font-weight:300;color:#221E1B;background:#fff;border:1px solid rgba(34,30,27,.2);border-radius:2px;padding:13px 14px;outline:none}
.fp input:focus,.fp textarea:focus{border-color:#6E2E34}
.fp textarea{resize:vertical;min-height:84px}
.fp-grupo{display:flex;flex-direction:column;gap:7px}
.fp-rotulo{font-size:13px;letter-spacing:.04em;color:#6B6259}
.fp-ensina{display:flex;flex-wrap:wrap;gap:8px}
.fp-ensina button{font:inherit;font-size:14px;padding:10px 16px;border:1px solid rgba(34,30,27,.25);background:#fff;color:#221E1B;border-radius:2px;cursor:pointer}
.fp-ensina button[aria-pressed="true"]{background:#6E2E34;border-color:#6E2E34;color:#FAF8F5}
.fp-escondido{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.fp-enviar{align-self:flex-start;font:inherit;font-size:15px;letter-spacing:.03em;background:#6E2E34;color:#FAF8F5;border:0;border-radius:2px;padding:16px 28px;cursor:pointer}
.fp-enviar:disabled{opacity:.6;cursor:default}
.fp-erro{font-size:14px;color:#A5544B}
.fp-pronto{border-top:2px solid #6E2E34;padding-top:18px;max-width:560px}
.fp-pronto b{display:block;font:400 28px/1.15 var(--eo-serif)}
.fp-pronto p{margin-top:10px;font-size:16px;line-height:1.6;color:#4A443F}
`;

export function FormParceira() {
  const [ensina, setEnsina] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [enviando, iniciar] = useTransition();

  if (pronto) {
    return (
      <div className="fp-pronto" role="status">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <b>Recebemos a sua candidatura.</b>
        <p>A gente responde pelo WhatsApp ou pelo e-mail que você deixou.</p>
      </div>
    );
  }

  return (
    <form
      className="fp"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        dados.set("ensina", ensina ?? "");
        setErro(null);
        iniciar(async () => {
          const r = await candidatarParceira(dados);
          if (r.ok) setPronto(true);
          else setErro(r.erro);
        });
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <label>
        Seu nome
        <input name="nome" autoComplete="name" required maxLength={120} />
      </label>
      <label>
        E-mail
        <input name="email" type="email" autoComplete="email" required maxLength={200} />
      </label>
      <label>
        Instagram
        <input name="instagram" placeholder="@seuperfil" required maxLength={80} />
      </label>
      <div className="fp-grupo">
        <span className="fp-rotulo">O que você ensina</span>
        <div className="fp-ensina" role="group" aria-label="O que você ensina">
        {ENSINA.map(([v, r]) => (
          <button key={v} type="button" aria-pressed={ensina === v} onClick={() => setEnsina(v)}>
            {r}
          </button>
        ))}
        </div>
      </div>
      <label>
        WhatsApp
        <input name="whatsapp" type="tel" autoComplete="tel" maxLength={30} />
      </label>
      <label>
        Em uma frase, o que você ensina (opcional)
        <textarea name="sobre" maxLength={600} />
      </label>
      {/* o campo que só robô preenche */}
      <div className="fp-escondido" aria-hidden>
        <label>
          Site
          <input name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {erro ? <p className="fp-erro">{erro}</p> : null}
      <button type="submit" className="fp-enviar" disabled={enviando}>
        {enviando ? "Enviando…" : "Quero ser parceira"}
      </button>
    </form>
  );
}
