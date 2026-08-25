"use client";

// O convidado que chegou pelo link geral: ele mesmo diz quem é.
//
// Ordem das perguntas pensada para quem está no celular, no meio de
// outra coisa: primeiro se vai ou não, e só depois os dados. Quem não
// vai responde em dois toques e sai.
//
// O e-mail é pedido porque a confirmação volta por ele — e é por ele
// que a pessoa muda de ideia depois.

import { useState } from "react";

type Passo = "escolha" | "dados" | "pronto";

export function AutocadastroConvidado({
  hash,
  anfitrioes,
  convitePara,
  quando,
  onde,
}: {
  hash: string;
  anfitrioes: string;
  convitePara: string;
  quando: string;
  onde: string | null;
}) {
  const [passo, setPasso] = useState<Passo>("escolha");
  const [vai, setVai] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [acompanhantes, setAcompanhantes] = useState(0);
  const [criancas, setCriancas] = useState(0);
  const [restricao, setRestricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [emailChegou, setEmailChegou] = useState(true);

  const ERROS: Record<string, string> = {
    nome_obrigatorio: "Precisamos do seu nome.",
    email_invalido: "Confira o e-mail — é por ele que a confirmação chega.",
    link_fechado: "As confirmações já foram encerradas.",
    link_invalido: "Este link não está mais válido.",
    lista_cheia: "A lista está completa. Fale direto com os anfitriões.",
    muitas_tentativas: "Muitas tentativas seguidas. Aguarde um minuto.",
  };

  async function enviar() {
    if (!nome.trim()) return setErro(ERROS.nome_obrigatorio);
    if (!email.trim()) return setErro(ERROS.email_invalido);

    setEnviando(true);
    setErro(null);

    try {
      const res = await fetch(`/api/rsvp/${hash}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          confirmacao: vai ? "confirmado" : "nao_vai",
          acompanhantes: vai ? acompanhantes : 0,
          criancas: vai ? criancas : 0,
          restricao: vai ? restricao : null,
        }),
      });
      const r = (await res.json()) as { ok?: boolean; erro?: string; emailEnviado?: boolean };
      setEnviando(false);

      if (!r.ok) {
        setErro(ERROS[r.erro ?? ""] ?? "Não conseguimos registrar agora. Tente de novo.");
        return;
      }
      setEmailChegou(r.emailEnviado !== false);
      setPasso("pronto");
    } catch {
      setEnviando(false);
      setErro("Não conseguimos registrar agora. Tente de novo.");
    }
  }

  if (passo === "pronto") {
    return (
      <div className="rsvp-cartao">
        <h1 className="rsvp-titulo">{vai ? "Que alegria!" : "Obrigado por avisar."}</h1>
        <p className="rsvp-texto">
          {vai
            ? `Sua presença está confirmada${
                acompanhantes + criancas > 0
                  ? ` para ${1 + acompanhantes + criancas} pessoas`
                  : ""
              }. Nos vemos lá.`
            : "Vamos sentir sua falta."}
        </p>
        <div className="rsvp-meta">
          <span className="rsvp-texto">{quando}</span>
          {onde && <span className="rsvp-texto">{onde}</span>}
        </div>
        <p className="rsvp-texto">
          {emailChegou
            ? `Mandamos um e-mail para ${email} com esses detalhes. Se precisar mudar alguma coisa, é por lá.`
            : "Guarde esta página: se precisar mudar alguma coisa, fale com os anfitriões."}
        </p>
      </div>
    );
  }

  return (
    <div className="rsvp-cartao">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="rsvp-nome">Você foi convidado para</span>
        <h1 className="rsvp-titulo">
          {convitePara} {anfitrioes}
        </h1>
      </div>

      <div className="rsvp-meta">
        <span className="rsvp-texto">{quando}</span>
        {onde && <span className="rsvp-texto">{onde}</span>}
      </div>

      {passo === "escolha" ? (
        <>
          <p className="rsvp-texto">Você vai poder ir?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              className="rsvp-botao"
              data-escolhido="true"
              onClick={() => {
                setVai(true);
                setPasso("dados");
              }}
            >
              Sim, eu vou
            </button>
            <button
              type="button"
              className="rsvp-botao"
              onClick={() => {
                setVai(false);
                setPasso("dados");
              }}
            >
              Infelizmente não posso
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="rsvp-texto">
            {vai ? "Só falta dizer quem é você." : "Quem está avisando?"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--esp-4)" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="rsvp-texto">Seu nome</span>
              <input
                className="rsvp-campo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome e sobrenome"
                maxLength={120}
                autoFocus
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="rsvp-texto">Seu e-mail</span>
              <input
                className="rsvp-campo"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="para receber a confirmação"
                maxLength={160}
              />
            </label>

            {vai && (
              <>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="rsvp-texto">Vai levar mais alguém?</span>
                  <select
                    className="rsvp-campo"
                    value={acompanhantes}
                    onChange={(e) => setAcompanhantes(Number(e.target.value))}
                  >
                    <option value={0}>Vou sozinho(a)</option>
                    <option value={1}>Mais 1 pessoa</option>
                    <option value={2}>Mais 2 pessoas</option>
                    <option value={3}>Mais 3 pessoas</option>
                    <option value={4}>Mais 4 pessoas</option>
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="rsvp-texto">Crianças?</span>
                  <select
                    className="rsvp-campo"
                    value={criancas}
                    onChange={(e) => setCriancas(Number(e.target.value))}
                  >
                    <option value={0}>Nenhuma</option>
                    <option value={1}>1 criança</option>
                    <option value={2}>2 crianças</option>
                    <option value={3}>3 crianças</option>
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="rsvp-texto">Alguma restrição alimentar?</span>
                  <input
                    className="rsvp-campo"
                    value={restricao}
                    onChange={(e) => setRestricao(e.target.value)}
                    placeholder="Ex.: sem glúten, vegetariano"
                    maxLength={200}
                  />
                </label>
              </>
            )}

            <button
              type="button"
              className="rsvp-botao"
              data-escolhido="true"
              onClick={enviar}
              disabled={enviando}
            >
              {enviando ? "Enviando…" : vai ? "Confirmar presença" : "Enviar resposta"}
            </button>

            <button
              type="button"
              className="rsvp-botao"
              onClick={() => setPasso("escolha")}
              disabled={enviando}
            >
              Voltar
            </button>
          </div>
        </>
      )}

      {erro && (
        <p className="rsvp-texto" style={{ color: "var(--cor-atencao)" }} role="alert">
          {erro}
        </p>
      )}

      {/* LGPD: a política precisa aparecer ONDE o convidado entrega o dado
          — inclusive restrição alimentar, que é dado sensível. Discreto de
          propósito: uma linha, sem caixa. */}
      <p className="rsvp-texto" style={{ fontSize: 12, opacity: 0.7, marginTop: 16 }}>
        Seus dados são usados só para este evento.{" "}
        <a href="/privacidade" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
          Política de privacidade
        </a>
      </p>
    </div>
  );
}
