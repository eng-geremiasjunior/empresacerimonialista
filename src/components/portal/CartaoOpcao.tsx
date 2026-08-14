"use client";

// A opção curada, como a cliente vê.
//
// Dois estados que não podem se confundir: RECOMENDADA é a opinião da
// profissional (borda superior e rótulo); ESCOLHIDA é a decisão da
// cliente (borda inteira em champagne). Os dois podem coexistir.
//
// Enquanto não escolhida, o cartão SEMPRE mostra o botão "Escolher
// esta" — rótulo nunca faz papel de botão. Se a pessoa precisa adivinhar
// se algo é etiqueta ou ação, está errado.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OpcaoCurada } from "@/lib/supabase/curadoria";
import { escolherOpcao } from "@/app/(portal)/portal/[eventoId]/escolhas/actions";
import { brl } from "@/components/planejamento/celebra";
import { Rotulo } from "./Nucleo";
import { diaEMes } from "./datas";

export function CartaoOpcao({
  eventoId,
  curadoriaId,
  opcao,
  escolhida,
  respondida,
  cerimonialista,
}: {
  eventoId: string;
  curadoriaId: string;
  opcao: OpcaoCurada;
  escolhida: boolean;
  /** a rodada já foi respondida: os outros cartões só mostram */
  respondida: boolean;
  cerimonialista: string | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function escolher() {
    iniciar(async () => {
      const r = await escolherOpcao(eventoId, curadoriaId, opcao.id);
      if (r.error) setErro(r.error);
      else router.refresh();
    });
  }

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--esp-3)",
        padding: "var(--esp-5)",
        background: "var(--cor-card)",
        borderRadius: "var(--raio-card)",
        border: escolhida
          ? "1px solid var(--cor-ouro)"
          : "1px solid var(--cor-borda)",
        borderTop: opcao.recomendada
          ? "3px solid var(--cor-borda-ouro)"
          : escolhida
            ? "1px solid var(--cor-ouro)"
            : "1px solid var(--cor-borda)",
      }}
    >
      {opcao.recomendada && (
        <Rotulo cor="var(--cor-texto-forte)" style={{ letterSpacing: "0.18em" }}>
          {cerimonialista ? `Recomendada pela ${cerimonialista.split(" ")[0]}` : "Recomendada"}
        </Rotulo>
      )}

      {/* espaço da foto: quando não há imagem, o contorno honesto */}
      <div
        style={{
          height: 132,
          borderRadius: "var(--raio-botao)",
          border: "1px solid var(--cor-borda)",
          background: opcao.fotoPath
            ? "var(--cor-chip)"
            : "repeating-linear-gradient(122deg,#EDE6DA 0 10px,#F5F0E7 10px 20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--fonte-mono)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "#8B8072",
        }}
      >
        {opcao.fotoPath ? "" : "foto do fornecedor"}
      </div>

      <div
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontWeight: 500,
          fontSize: "var(--ts-titulo-lateral)",
          lineHeight: 1.35,
          color: "var(--cor-texto-forte)",
        }}
      >
        {opcao.nome}
      </div>

      {opcao.descricao && (
        <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
          {opcao.descricao}
        </p>
      )}

      {opcao.inclui.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {opcao.inclui.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: "var(--ts-desc)",
                lineHeight: 1.6,
                color: "var(--cor-texto-secundario)",
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}

      {opcao.valor !== null && (
        <div style={{ fontSize: "var(--ts-meta)", color: "var(--cor-texto-forte)" }}>
          {brl(opcao.valor)}
        </div>
      )}

      {/* a nota da cerimonialista: por que ela pôs isso na mesa */}
      {opcao.nota && (
        <p
          style={{
            fontSize: "var(--ts-desc)",
            lineHeight: 1.55,
            color: "var(--cor-texto-suave)",
            fontStyle: "italic",
            borderLeft: "1px solid var(--cor-borda-ouro)",
            paddingLeft: "var(--esp-3)",
          }}
        >
          {opcao.nota}
        </p>
      )}

      {opcao.prazoReserva && (
        <div
          style={{
            borderTop: "1px solid var(--cor-borda-linha)",
            paddingTop: "var(--esp-3)",
            fontSize: "var(--ts-desc)",
            color: "var(--cor-texto-suave)",
          }}
        >
          Reserva até {diaEMes(opcao.prazoReserva)}
        </div>
      )}

      {escolhida ? (
        <div
          style={{
            borderTop: "1px solid var(--cor-borda-linha)",
            paddingTop: "var(--esp-4)",
          }}
        >
          <Rotulo cor="var(--cor-ouro-texto)" style={{ letterSpacing: "0.16em" }}>
            Escolhida por vocês
          </Rotulo>
        </div>
      ) : respondida ? null : (
        <button
          type="button"
          onClick={escolher}
          disabled={pendente}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minHeight: "var(--toque-min)",
            border: "1px solid var(--cor-borda-botao)",
            borderRadius: "var(--raio-botao)",
            background: "var(--cor-card-suave)",
            padding: "12px 16px",
            fontSize: "var(--ts-botao)",
            fontFamily: "var(--fonte-corpo)",
            color: "var(--cor-texto-secundario)",
            cursor: "pointer",
          }}
        >
          {pendente ? "Registrando…" : "Escolher esta"}
        </button>
      )}

      {erro && (
        <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-atencao)" }} role="alert">
          {erro}
        </p>
      )}
    </section>
  );
}
