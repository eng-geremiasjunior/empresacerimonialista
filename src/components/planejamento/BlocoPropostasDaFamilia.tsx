"use client";

// "A família propôs" (177), dentro do drawer da decisão: a opção que a
// família trouxe pelo portal — foto, link, fornecedor, texto — com
// Aceitar e Responder. Carrega sozinho quando a decisão abre; some
// quando não há proposta.

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  carregarPropostas,
  responderProposta,
  type PropostaParaEquipe,
} from "@/app/(app)/eventos/[id]/planejamento/proposta-actions";
import { C, F_TITLE, F_UI } from "./celebra";

const botao = (primario = false): React.CSSProperties => ({
  height: 34,
  padding: "0 12px",
  borderRadius: 8,
  border: primario ? "none" : `1px solid ${C.bordaMedia}`,
  background: primario ? C.ameixa : "#fff",
  color: primario ? "#fff" : C.corpo,
  fontFamily: F_TITLE,
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
});

export function BlocoPropostasDaFamilia({ eventId, decisaoId }: { eventId: string; decisaoId: string }) {
  const [propostas, setPropostas] = useState<PropostaParaEquipe[]>([]);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const recarregar = useCallback(async () => {
    setPropostas(await carregarPropostas(decisaoId));
  }, [decisaoId]);

  useEffect(() => {
    let vivo = true;
    carregarPropostas(decisaoId).then((p) => vivo && setPropostas(p));
    return () => {
      vivo = false;
    };
  }, [decisaoId]);

  if (propostas.length === 0) return null;

  function responder(p: PropostaParaEquipe, estado: "aceita" | "recusada") {
    setErro(null);
    iniciar(async () => {
      const r = await responderProposta(eventId, p.id, estado, texto);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setRespondendo(null);
      setTexto("");
      await recarregar();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 10, border: `1px dashed ${C.ameixaClara}`, background: C.tint }}>
      <div style={{ fontFamily: F_TITLE, fontWeight: 600, fontSize: 13, color: C.tinta }}>A família propôs</div>
      {propostas.map((p) => (
        <div key={p.id} style={{ display: "flex", gap: 12, padding: 10, borderRadius: 8, background: "#fff", border: `1px solid ${C.bordaSutil}` }}>
          {p.fotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.fotoUrl} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, flex: "none" }} />
          )}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, fontFamily: F_UI, fontSize: 13, color: C.corpo }}>
            <div style={{ fontFamily: F_TITLE, fontWeight: 600, fontSize: 14, color: C.tinta }}>{p.titulo}</div>
            {p.link && (
              <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: C.ameixa, wordBreak: "break-all" }}>
                {p.link.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            )}
            {p.texto && !p.texto.startsWith(p.titulo) && <div>{p.texto}</div>}
            <div style={{ fontSize: 12, color: C.meta }}>
              {p.autor ? `${p.autor.split(" ")[0]} propôs` : "Proposta da família"}
              {p.fornecedor ? ` · fornecedor: ${p.fornecedor}` : ""}
            </div>
            {p.estado !== "aguardando" ? (
              <div style={{ fontSize: 12, color: C.secundario }}>
                {p.estado === "aceita" ? "Você aceitou" : "Você respondeu"}
                {p.resposta ? `: ${p.resposta}` : ""}
              </div>
            ) : respondendo === p.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={2}
                  placeholder="Sua resposta para a família"
                  style={{ padding: 8, borderRadius: 6, border: `1px solid ${C.bordaSutil}`, fontFamily: F_UI, fontSize: 12, color: C.tinta, resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" disabled={pendente} onClick={() => responder(p, "recusada")} style={botao(true)}>
                    Enviar resposta
                  </button>
                  <button type="button" onClick={() => setRespondendo(null)} style={botao()}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" disabled={pendente} onClick={() => responder(p, "aceita")} style={botao(true)}>
                  Aceitar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTexto("");
                    setRespondendo(p.id);
                  }}
                  style={botao()}
                >
                  Responder
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      {erro && <div style={{ fontFamily: F_UI, fontSize: 12, color: C.atrasadaFg }}>{erro}</div>}
    </div>
  );
}
