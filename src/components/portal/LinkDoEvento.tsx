"use client";

// O link que a cliente espalha — o caminho principal da lista.
//
// Fica no topo da tela de convidados porque é o que ela vai usar toda
// vez: manda no WhatsApp, põe no convite de papel, e cada pessoa se
// cadastra sozinha. A lista abaixo é o resultado disso, mais quem ela
// adicionou na mão.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fecharOuAbrirLink } from "@/app/(portal)/portal/[eventoId]/convidados/actions";
import { rotuloPublico } from "@/lib/capacidades";
import { CartaoOuro, Rotulo } from "./Nucleo";

export function LinkDoEvento({
  eventoId,
  tipo,
  url,
  aberto,
}: {
  eventoId: string;
  /** tipo do evento — numa empresa a lista é de participantes */
  tipo: string;
  url: string;
  aberto: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const [confirmandoFechar, setConfirmandoFechar] = useState(false);

  function copiar() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    });
  }

  async function compartilhar() {
    // no celular, o menu nativo — é como ela vai mandar no WhatsApp
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: "Confirme sua presença",
          text: "Ficaremos felizes com você lá. Confirme sua presença:",
          url,
        });
        return;
      } catch {
        /* cancelou: cai no copiar */
      }
    }
    copiar();
  }

  const botao: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "1px solid var(--cor-borda-botao-ouro)",
    borderRadius: "var(--raio-botao)",
    background: "var(--cor-superficie)",
    padding: "11px 16px",
    minHeight: "var(--toque-min)",
    fontSize: "var(--ts-botao)",
    color: "var(--cor-ouro-texto-hover)",
    cursor: "pointer",
    fontFamily: "var(--fonte-corpo)",
  };

  return (
    <CartaoOuro fio="contagem" padding="var(--esp-6)">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--esp-3)" }}>
        <Rotulo>Link de confirmação</Rotulo>

        {aberto ? (
          <>
            <p
              style={{
                fontSize: "var(--ts-item-desc)",
                lineHeight: 1.55,
                color: "var(--cor-texto-secundario)",
              }}
            >
              Mande este link para os {rotuloPublico(tipo)}. Cada pessoa preenche
              o próprio nome e recebe a confirmação por e-mail — e entra na lista
              abaixo sozinha.
            </p>

            <code
              style={{
                display: "block",
                fontFamily: "var(--fonte-mono)",
                fontSize: 11,
                color: "var(--cor-texto-suave)",
                background: "var(--cor-superficie)",
                border: "1px solid var(--cor-borda)",
                borderRadius: "var(--raio-botao)",
                padding: "10px 12px",
                overflowWrap: "anywhere",
              }}
            >
              {url}
            </code>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={botao} onClick={compartilhar}>
                {copiado ? "Link copiado" : "Enviar o link"}
              </button>
              <button
                type="button"
                style={{ ...botao, borderColor: "var(--cor-borda-botao)", color: "var(--cor-texto-suave)" }}
                onClick={copiar}
              >
                Copiar
              </button>
              {confirmandoFechar ? (
                <>
                  <button
                    type="button"
                    style={{ ...botao, borderColor: "var(--cor-borda-botao)", color: "var(--cor-atencao)" }}
                    disabled={pendente}
                    onClick={() =>
                      iniciar(async () => {
                        await fecharOuAbrirLink(eventoId, false);
                        setConfirmandoFechar(false);
                        router.refresh();
                      })
                    }
                  >
                    Sim, encerrar
                  </button>
                  <button
                    type="button"
                    style={{ ...botao, borderColor: "var(--cor-borda-botao)", color: "var(--cor-texto-suave)" }}
                    onClick={() => setConfirmandoFechar(false)}
                  >
                    Deixar aberto
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  style={{
                    ...botao,
                    borderColor: "transparent",
                    background: "transparent",
                    color: "var(--cor-texto-suave)",
                    marginLeft: "auto",
                  }}
                  onClick={() => setConfirmandoFechar(true)}
                >
                  Encerrar confirmações
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: "var(--ts-item-desc)",
                lineHeight: 1.55,
                color: "var(--cor-texto-secundario)",
              }}
            >
              As confirmações estão encerradas. Quem abrir o link agora vê um
              recado pedindo para falar com vocês.
            </p>
            <button
              type="button"
              style={{ ...botao, alignSelf: "flex-start" }}
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  await fecharOuAbrirLink(eventoId, true);
                  router.refresh();
                })
              }
            >
              Reabrir confirmações
            </button>
          </>
        )}
      </div>
    </CartaoOuro>
  );
}
