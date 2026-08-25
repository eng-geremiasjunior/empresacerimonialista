"use client";

// A resposta do convidado. Duas escolhas grandes e, para quem vem, três
// perguntas curtas. Nada de formulário longo: quem abre isso está no
// celular, provavelmente no meio de outra coisa.
//
// Chama a RPC pública com a chave anônima — o hash é a credencial, e o
// servidor não aceita mais nada (nem id, nem evento).

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Confirmacao = "aguardando" | "confirmado" | "nao_vai";

export function ConfirmacaoConvidado({
  hash,
  nome,
  anfitrioes,
  convitePara,
  quando,
  onde,
  confirmacaoInicial,
  acompanhantesIniciais,
  criancasIniciais,
  restricaoInicial,
}: {
  hash: string;
  nome: string;
  anfitrioes: string;
  /** "o casamento de", "os 15 anos de"… — vem do tipo do evento */
  convitePara: string;
  quando: string;
  onde: string | null;
  confirmacaoInicial: Confirmacao;
  acompanhantesIniciais: number;
  criancasIniciais: number;
  restricaoInicial: string | null;
}) {
  const [resposta, setResposta] = useState<Confirmacao>(confirmacaoInicial);
  const [acompanhantes, setAcompanhantes] = useState(acompanhantesIniciais);
  const [criancas, setCriancas] = useState(criancasIniciais);
  const [restricao, setRestricao] = useState(restricaoInicial ?? "");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(confirmacaoInicial !== "aguardando");
  const [erro, setErro] = useState<string | null>(null);

  async function responder(valor: "confirmado" | "nao_vai") {
    setEnviando(true);
    setErro(null);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data, error } = await supabase.rpc("responder_convite_convidado", {
      p_hash: hash,
      p_confirmacao: valor,
      p_acompanhantes: valor === "confirmado" ? acompanhantes : 0,
      p_criancas: valor === "confirmado" ? criancas : 0,
      p_restricao: valor === "confirmado" ? restricao : null,
    });
    setEnviando(false);

    const r = data as { ok?: boolean } | null;
    if (error || !r?.ok) {
      setErro("Não conseguimos registrar agora. Tente de novo em instantes.");
      return;
    }
    setResposta(valor);
    setPronto(true);
  }

  // depois de responder, a tela agradece — e deixa mudar de ideia
  if (pronto) {
    return (
      <div className="rsvp-cartao">
        <h1 className="rsvp-titulo">
          {resposta === "confirmado" ? "Que alegria!" : "Obrigado por avisar."}
        </h1>
        <p className="rsvp-texto">
          {resposta === "confirmado"
            ? `Sua presença está confirmada${
                acompanhantes + criancas > 0
                  ? ` para ${1 + acompanhantes + criancas} pessoas`
                  : ""
              }. Nos vemos lá.`
            : "Vamos sentir sua falta. Obrigado por responder."}
        </p>
        <div className="rsvp-meta">
          <span className="rsvp-texto">{quando}</span>
          {onde && <span className="rsvp-texto">{onde}</span>}
        </div>
        <button
          type="button"
          className="rsvp-botao"
          onClick={() => setPronto(false)}
        >
          Mudar minha resposta
        </button>
      </div>
    );
  }

  return (
    <div className="rsvp-cartao">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="rsvp-nome">{nome},</span>
        <h1 className="rsvp-titulo">
          você foi convidado para {convitePara} {anfitrioes}
        </h1>
      </div>

      <div className="rsvp-meta">
        <span className="rsvp-texto">{quando}</span>
        {onde && <span className="rsvp-texto">{onde}</span>}
      </div>

      <p className="rsvp-texto">Você vai poder ir?</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          className="rsvp-botao"
          data-escolhido={resposta === "confirmado"}
          onClick={() => setResposta("confirmado")}
          disabled={enviando}
        >
          Sim, eu vou
        </button>
        <button
          type="button"
          className="rsvp-botao"
          data-escolhido={resposta === "nao_vai"}
          onClick={() => responder("nao_vai")}
          disabled={enviando}
        >
          Infelizmente não posso
        </button>
      </div>

      {/* as três perguntas só aparecem para quem vem */}
      {resposta === "confirmado" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--esp-4)" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="rsvp-texto">Vai levar acompanhante?</span>
            <select
              className="rsvp-campo"
              value={acompanhantes}
              onChange={(e) => setAcompanhantes(Number(e.target.value))}
            >
              <option value={0}>Vou sozinho(a)</option>
              <option value={1}>Mais 1 pessoa</option>
              <option value={2}>Mais 2 pessoas</option>
              <option value={3}>Mais 3 pessoas</option>
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

          <button
            type="button"
            className="rsvp-botao"
            data-escolhido="true"
            onClick={() => responder("confirmado")}
            disabled={enviando}
          >
            {enviando ? "Confirmando…" : "Confirmar presença"}
          </button>
        </div>
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
