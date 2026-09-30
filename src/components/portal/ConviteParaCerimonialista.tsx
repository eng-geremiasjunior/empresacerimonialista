"use client";

// O convite para a cerimonialista (188), na mão da noiva, em dois passos:
//   1. o link: copiar, mandar pelo WhatsApp, trocar (o anterior morre);
//   2. o pedido: quem abriu o link e pediu para organizar aparece aqui
//      com o nome do negócio, e a família confirma — ou diz que não é ela
//      (o link é cancelado).
//
// Uma frase só diz o que acontece quando ela confirmar — é a informação
// que evita o erro, não explicação do sistema.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cartao } from "./Nucleo";
import {
  linkDoConvite,
  responderPedido,
  type PedidoDaCerimonialista,
} from "@/app/(portal)/portal/[eventoId]/cerimonialista/actions";

const botao: React.CSSProperties = {
  minHeight: "var(--toque-min)",
  padding: "10px 16px",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  color: "var(--cor-texto-secundario)",
  fontFamily: "inherit",
  fontSize: "var(--ts-botao)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
};

const botaoForte: React.CSSProperties = {
  ...botao,
  border: "1px solid var(--cor-texto)",
  background: "var(--cor-texto)",
  color: "var(--cor-card)",
};

export function ConviteParaCerimonialista({
  eventoId,
  base,
  tokenInicial,
  pedido,
  festa,
}: {
  eventoId: string;
  /** o endereço do app (a cerimonialista entra pelo domínio principal) */
  base: string;
  tokenInicial: string | null;
  pedido: PedidoDaCerimonialista | null;
  festa: string;
}) {
  const router = useRouter();
  const [token, setToken] = useState(tokenInicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const link = token ? `${base}/convite-cerimonialista/${token}` : null;
  const texto = link
    ? `Oi! Quero que você organize ${festa} comigo pelo eorganizei. É só abrir este link: ${link}`
    : "";

  function gerar(novo: boolean) {
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const r = await linkDoConvite(eventoId, novo);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setToken(r.token);
      if (novo) setAviso("Link novo pronto. O anterior não abre mais.");
    });
  }

  function responder(confirmar: boolean) {
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const r = await responderPedido(eventoId, confirmar);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      if (r.estado === "aceito") {
        router.replace(`/portal/${eventoId}`);
        router.refresh();
        return;
      }
      setToken(null);
      setAviso("Pedido recusado. O link foi cancelado; pegue outro quando quiser.");
      router.refresh();
    });
  }

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setAviso("Link copiado.");
    } catch {
      setAviso("Não deu para copiar. Selecione o link e copie.");
    }
  }

  const quemPediu = pedido?.empresa?.trim() || pedido?.quem?.trim() || "Uma cerimonialista";

  return (
    <>
      {pedido && (
        <Cartao padding="var(--esp-6)">
          <p style={{ margin: 0, fontSize: "var(--ts-desc)", color: "var(--cor-texto)", lineHeight: 1.55 }}>
            <strong style={{ fontWeight: 500 }}>{quemPediu}</strong>
            {pedido.quem && pedido.empresa ? ` (${pedido.quem})` : ""} pediu para organizar a festa com você.
          </p>
          <p style={{ margin: 0, fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)", lineHeight: 1.55 }}>
            Confirmando, o evento passa a ser organizado por ela, com tudo o que você já fez, e você continua
            acompanhando e decidindo por aqui.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={botaoForte} disabled={pendente} onClick={() => responder(true)}>
              {pendente ? "Um instante…" : "Confirmar"}
            </button>
            <button type="button" style={botao} disabled={pendente} onClick={() => responder(false)}>
              Não é ela
            </button>
          </div>
        </Cartao>
      )}

      {!pedido && (
        <Cartao padding="var(--esp-6)">
          <p style={{ margin: 0, fontSize: "var(--ts-desc)", color: "var(--cor-texto)", lineHeight: 1.55 }}>
            Mande este link para a sua cerimonialista. Ela pede para organizar, e você confirma aqui.
          </p>

          {link ? (
            <>
              <p
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  border: "1px solid var(--cor-borda)",
                  borderRadius: "var(--raio-botao)",
                  background: "var(--cor-card-suave)",
                  fontSize: "var(--ts-nota)",
                  color: "var(--cor-texto-secundario)",
                  wordBreak: "break-all",
                }}
              >
                {link}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={botao} onClick={copiar}>
                  Copiar o link
                </button>
                <a style={botao} href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener">
                  Mandar pelo WhatsApp
                </a>
                <button
                  type="button"
                  style={{ ...botao, border: "none", background: "none" }}
                  disabled={pendente}
                  onClick={() => gerar(true)}
                >
                  {pendente ? "Gerando…" : "Trocar o link"}
                </button>
              </div>
            </>
          ) : (
            <div>
              <button type="button" style={botao} disabled={pendente} onClick={() => gerar(false)}>
                {pendente ? "Abrindo…" : "Pegar o link do convite"}
              </button>
            </div>
          )}
        </Cartao>
      )}

      {(erro || aviso) && (
        <p
          role={erro ? "alert" : "status"}
          style={{ margin: 0, fontSize: "var(--ts-nota)", color: erro ? "var(--cor-atencao)" : "var(--cor-texto-suave)" }}
        >
          {erro ?? aviso}
        </p>
      )}
    </>
  );
}
