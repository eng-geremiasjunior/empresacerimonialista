"use client";

// A rodada de confirmação (21/10/2026, RSVP como prioridade): o trabalho
// que no mercado se chama "RSVP ativo" — cobrar cada convidado até ele
// responder. Um convidado por vez: abre o WhatsApp DELA com a mensagem
// pessoal (o nome e o link dele), ela manda, volta e marca a resposta
// com um toque, e segue. Quem já recebeu o pedido recebe o lembrete.
// Sem API: funciona com o WhatsApp que ela já usa. Quem só tem e-mail
// vai no lote por e-mail, no fim.

import { useMemo, useState } from "react";
import type { ConvidadoNaFicha } from "@/components/rsvp/RsvpPrograma";

type Resposta = "confirmado" | "nao_vai";

const PRIORIDADE = /famil|padrinh|madrinh|pais|avó|avô|irm/i;

/** a ordem da rodada: família e padrinhos; quem nunca recebeu; quem recebeu há mais tempo */
export function filaDaRodada(lista: ConvidadoNaFicha[]): ConvidadoNaFicha[] {
  return lista
    .filter((c) => c.confirmacao === "aguardando" && c.whatsPedido)
    .sort((a, b) => {
      const pa = PRIORIDADE.test(a.grupo ?? "") ? 0 : 1;
      const pb = PRIORIDADE.test(b.grupo ?? "") ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const ea = a.pedido?.em ?? "";
      const eb = b.pedido?.em ?? "";
      if (!ea !== !eb) return ea ? 1 : -1;
      return ea.localeCompare(eb) || a.nome.localeCompare(b.nome);
    });
}

const dia = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

export function RodadaDeConfirmacao({
  convidados,
  soEmail,
  aoAbrir,
  aoResponder,
  aoMandarEmails,
  aoFechar,
}: {
  convidados: ConvidadoNaFicha[];
  /** quantos aguardam e só têm e-mail */
  soEmail: number;
  aoAbrir: (c: ConvidadoNaFicha, link: string) => void;
  aoResponder: (c: ConvidadoNaFicha, r: Resposta) => void;
  aoMandarEmails: () => void;
  aoFechar: () => void;
}) {
  // a fila é fixada ao abrir: responder não reordena o que ela está vendo
  const fila = useMemo(() => filaDaRodada(convidados), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [placar, setPlacar] = useState({ abertas: 0, respostas: 0 });

  const atual = fila[i] ?? null;
  const lembrete = !!atual?.pedido;
  const link = atual ? (lembrete && atual.whatsLembrete ? atual.whatsLembrete : atual.whatsPedido!) : "";

  function proximo() {
    setAberto(false);
    setI((x) => x + 1);
  }

  function abrir() {
    if (!atual) return;
    aoAbrir(atual, link);
    setAberto(true);
    setPlacar((p) => ({ ...p, abertas: p.abertas + 1 }));
  }

  function responder(r: Resposta) {
    if (!atual) return;
    aoResponder(atual, r);
    setPlacar((p) => ({ ...p, respostas: p.respostas + 1 }));
    proximo();
  }

  return (
    <>
      <div className="rp-veu" onClick={aoFechar} aria-hidden />
      <div className="rp-modal" role="dialog" aria-modal="true" aria-label="Rodada de confirmação">
        <header>
          <h3>Rodada de confirmação</h3>
          {fila.length > 0 && (
            <span className="rp-mono" style={{ fontSize: 12, color: "var(--cinza)" }}>
              {Math.min(i + 1, fila.length)} de {fila.length}
            </span>
          )}
          <button type="button" className="rp-btn" style={{ marginLeft: "auto" }} onClick={aoFechar}>
            Fechar
          </button>
        </header>

        <div className="rp-corpo">
          {atual ? (
            <>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--tinta)" }}>{atual.nome}</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--cinza)" }}>
                  {[atual.grupo, atual.telefone].filter(Boolean).join(" · ")}
                  {" · "}
                  {atual.pedido ? `pedido aberto em ${dia(atual.pedido.em)}: vai o lembrete` : "primeiro pedido"}
                </p>
              </div>

              {!aberto ? (
                <div className="rp-par" style={{ alignItems: "center" }}>
                  <button type="button" className="rp-btn p" onClick={abrir}>
                    Abrir no WhatsApp
                  </button>
                  <button type="button" className="rp-btn" onClick={proximo}>
                    Pular
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--cinza)" }}>Mandou? Se já respondeu, marque:</p>
                  <div className="rp-par" style={{ alignItems: "center" }}>
                    <button type="button" className="rp-btn" onClick={() => responder("confirmado")}>
                      Vai
                    </button>
                    <button type="button" className="rp-btn" onClick={() => responder("nao_vai")}>
                      Não vai
                    </button>
                    <button type="button" className="rp-btn p" onClick={proximo}>
                      Ainda não respondeu · próximo
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: "var(--tinta)" }}>
              {fila.length ? "Fim da rodada." : "Ninguém com WhatsApp está sem resposta."}
            </p>
          )}

          <p className="rp-mono" style={{ margin: 0, fontSize: 12, color: "var(--cinza)" }}>
            nesta rodada: {placar.abertas} {placar.abertas === 1 ? "mensagem aberta" : "mensagens abertas"} · {placar.respostas}{" "}
            {placar.respostas === 1 ? "resposta marcada" : "respostas marcadas"}
          </p>

          {soEmail > 0 && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--cinza)" }}>
              {soEmail} {soEmail === 1 ? "convidado só tem" : "convidados só têm"} e-mail.{" "}
              <button type="button" className="rp-btn" onClick={aoMandarEmails}>
                Mandar o pedido por e-mail
              </button>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
