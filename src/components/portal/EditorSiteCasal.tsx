"use client";

// O casal escreve a parte deles do site: a mensagem, a história e o que
// vestir. Nada vai ao ar na hora — a cerimonialista publica. O aviso é
// uma linha, não um manual.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarSiteCasal } from "@/app/(portal)/portal/[eventoId]/site/actions";
import { Cartao, Rotulo } from "./Nucleo";

const campoStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 12px",
  fontSize: "var(--ts-item-desc)",
  fontFamily: "var(--fonte-corpo)",
  color: "var(--cor-texto)",
};

const botaoStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 18px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-botao)",
  color: "var(--cor-texto-secundario)",
  cursor: "pointer",
  fontFamily: "var(--fonte-corpo)",
};

export function EditorSiteCasal({
  eventoId,
  inicial,
  publicado,
  urlSite,
}: {
  eventoId: string;
  inicial: { mensagem: string; historia: string; dressCode: string };
  publicado: boolean;
  urlSite: string | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [form, setForm] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const r = await salvarSiteCasal(eventoId, form);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setSalvo(true);
      router.refresh();
    });
  }

  return (
    <>
      {publicado && urlSite && (
        <Cartao padding="var(--esp-5) var(--esp-6)">
          <p style={{ margin: 0, fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>
            O site está no ar:{" "}
            <a href={urlSite} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cor-texto)" }}>
              {urlSite}
            </a>
          </p>
        </Cartao>
      )}

      <Cartao padding="var(--esp-6)">
        <Rotulo>Mensagem aos convidados</Rotulo>
        <textarea
          style={campoStyle}
          rows={3}
          maxLength={2000}
          value={form.mensagem}
          onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
          placeholder="Uma frase de vocês — sai logo abaixo dos nomes."
        />

        <Rotulo style={{ marginTop: "var(--esp-5)" }}>Nossa história</Rotulo>
        <textarea
          style={campoStyle}
          rows={5}
          maxLength={4000}
          value={form.historia}
          onChange={(e) => setForm({ ...form, historia: e.target.value })}
          placeholder="Como vocês se conheceram, o pedido… do jeito de vocês."
        />

        <Rotulo style={{ marginTop: "var(--esp-5)" }}>O que vestir</Rotulo>
        <textarea
          style={campoStyle}
          rows={2}
          maxLength={400}
          value={form.dressCode}
          onChange={(e) => setForm({ ...form, dressCode: e.target.value })}
          placeholder="Ex.: traje social completo. Evitem branco e off-white."
        />

        {erro && (
          <p style={{ marginTop: 10, fontSize: "var(--ts-item-desc)", color: "var(--cor-atencao)" }}>
            {erro}
          </p>
        )}
        {salvo && !erro && (
          <p style={{ marginTop: 10, fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-suave)" }}>
            Salvo. {publicado ? "Vai ao ar quando sua cerimonialista publicar a alteração." : "Vai ao ar quando sua cerimonialista publicar o site."}
          </p>
        )}

        <div style={{ marginTop: "var(--esp-5)" }}>
          <button type="button" style={botaoStyle} onClick={salvar} disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </Cartao>
    </>
  );
}
