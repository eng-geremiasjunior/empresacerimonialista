"use client";

// O termo do responsável (175, pedido do dono em 25/09/2026). A debutante
// tem 14 ou 15 anos: num evento dela, quem abre e administra o portal é o
// pai, a mãe ou o responsável legal. Esta tela aparece no lugar do portal
// até isso estar confirmado — para o responsável, a caixa; para a
// debutante, a espera.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmarResponsavel } from "@/app/(portal)/portal/[eventoId]/termo-actions";
import { Cartao, TituloSecao } from "./Nucleo";
import { SairDoPortal } from "./SairDoPortal";

const botaoStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
  minWidth: 200,
  minHeight: "var(--toque-min)",
  border: "1px solid var(--cor-texto-forte)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-texto-forte)",
  color: "var(--cor-superficie)",
  padding: "10px 18px",
  fontSize: "var(--ts-botao)",
  fontFamily: "var(--fonte-corpo)",
  cursor: "pointer",
};

const textoStyle: React.CSSProperties = {
  fontSize: "var(--ts-desc)",
  color: "var(--cor-texto-secundario)",
  lineHeight: 1.6,
};

export function TermoDoResponsavel({
  eventoId,
  modo,
  marcaNome,
}: {
  eventoId: string;
  /** "confirmar" = pai, mãe ou responsável; "esperar" = a própria debutante */
  modo: "confirmar" | "esperar";
  marcaNome: string | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [marcado, setMarcado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const quem = marcaNome?.trim() || "A cerimonialista";

  if (modo === "esperar") {
    return (
      <Cartao padding="var(--esp-8)">
        <TituloSecao titulo="Quase lá" />
        <p style={textoStyle}>
          Quem abre o portal primeiro é o pai, a mãe ou o responsável. Assim que
          um deles entrar e confirmar, o portal abre para você.
        </p>
        <button
          type="button"
          style={{ ...botaoStyle, opacity: pendente ? 0.55 : 1 }}
          disabled={pendente}
          onClick={() => iniciar(() => router.refresh())}
        >
          Tentar de novo
        </button>
        <SairDoPortal variante="texto" />
      </Cartao>
    );
  }

  return (
    <Cartao padding="var(--esp-8)">
      <TituloSecao titulo="Antes de começar" />
      <p style={textoStyle}>
        {quem} preparou este portal para organizar os 15 anos com a família. Como a
        debutante é menor de idade, quem abre e administra o acesso é o pai, a mãe
        ou o responsável legal.
      </p>
      <label
        style={{
          display: "flex",
          gap: "var(--esp-3)",
          alignItems: "flex-start",
          cursor: "pointer",
          ...textoStyle,
          color: "var(--cor-texto)",
        }}
      >
        <input
          type="checkbox"
          checked={marcado}
          onChange={(e) => setMarcado(e.target.checked)}
          style={{ marginTop: 4, width: 18, height: 18, flexShrink: 0 }}
        />
        <span>
          Sou pai, mãe ou responsável legal pela debutante e autorizo que ela e a
          família usem este portal para organizar a festa com a cerimonialista.
        </span>
      </label>
      {erro && (
        <p role="alert" style={{ ...textoStyle, color: "var(--cor-atencao)" }}>
          {erro}
        </p>
      )}
      <button
        type="button"
        style={{ ...botaoStyle, opacity: !marcado || pendente ? 0.55 : 1 }}
        disabled={!marcado || pendente}
        onClick={() => {
          setErro(null);
          iniciar(async () => {
            const r = await confirmarResponsavel(eventoId);
            if ("error" in r) {
              setErro(r.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pendente ? "Confirmando…" : "Continuar"}
      </button>
      <p style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-suave)" }}>
        A confirmação fica registrada com a data de hoje.
      </p>
      <SairDoPortal variante="texto" />
    </Cartao>
  );
}
