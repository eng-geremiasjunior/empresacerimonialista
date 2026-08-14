"use client";

// Uma rodada de escolhas: as opções lado a lado e, no fim, a saída
// honesta — "nenhuma dessas". Recusar exige motivo porque é isso que
// permite à cerimonialista buscar melhor da próxima vez.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Curadoria } from "@/lib/supabase/curadoria";
import { recusarTodas } from "@/app/(portal)/portal/[eventoId]/escolhas/actions";
import { CartaoOpcao } from "./CartaoOpcao";
import { Cartao, Rotulo, TituloSecao } from "./Nucleo";

export function SelecaoCurada({
  eventoId,
  curadoria,
  cerimonialista,
}: {
  eventoId: string;
  curadoria: Curadoria;
  cerimonialista: string | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const respondida = curadoria.estado !== "publicada";
  const escolhida = curadoria.opcoes.find((o) => o.id === curadoria.escolhidaOpcaoId);

  function recusar() {
    iniciar(async () => {
      const r = await recusarTodas(eventoId, curadoria.id, motivo);
      if (r.error) setErro(r.error);
      else {
        setRecusando(false);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--esp-4)" }}>
      <TituloSecao
        titulo={curadoria.objetivoNome ?? curadoria.decisaoTitulo}
        apoio={
          curadoria.estado === "escolhida" && escolhida
            ? `Vocês escolheram ${escolhida.nome}.`
            : curadoria.estado === "recusada"
              ? "Vocês pediram outras opções."
              : `${curadoria.opcoes.length} opções separadas para vocês`
        }
      />

      {curadoria.estado === "recusada" ? (
        <Cartao padding="var(--esp-6)">
          <Rotulo>O que vocês disseram</Rotulo>
          <p
            style={{
              fontSize: "var(--ts-item-desc)",
              lineHeight: 1.55,
              color: "var(--cor-texto-secundario)",
            }}
          >
            {curadoria.motivoRecusa}
          </p>
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
            {cerimonialista?.split(" ")[0] ?? "Sua cerimonialista"} está buscando
            outras opções.
          </p>
        </Cartao>
      ) : (
        <div className="portal-grade-opcoes">
          {curadoria.opcoes.map((o) => (
            <CartaoOpcao
              key={o.id}
              eventoId={eventoId}
              curadoriaId={curadoria.id}
              opcao={o}
              escolhida={o.id === curadoria.escolhidaOpcaoId}
              respondida={respondida}
              cerimonialista={cerimonialista}
            />
          ))}
        </div>
      )}

      {/* a saída honesta: nenhuma serviu */}
      {!respondida && (
        <div style={{ maxWidth: 520 }}>
          {recusando ? (
            <Cartao padding="var(--esp-6)">
              <Rotulo>Nenhuma dessas</Rotulo>
              <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
                Conte o que não agradou — assim a busca seguinte já vem mais perto
                do que vocês querem.
              </p>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                maxLength={600}
                placeholder="Ex.: gostamos do estilo, mas está acima do que queremos gastar"
                style={{
                  width: "100%",
                  border: "1px solid var(--cor-borda-botao)",
                  borderRadius: "var(--raio-botao)",
                  background: "var(--cor-card-suave)",
                  padding: "11px 14px",
                  fontSize: "var(--ts-item-desc)",
                  fontFamily: "var(--fonte-corpo)",
                  color: "var(--cor-texto)",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={recusar}
                  disabled={pendente || !motivo.trim()}
                  style={{
                    minHeight: "var(--toque-min)",
                    border: "1px solid var(--cor-borda-botao)",
                    borderRadius: "var(--raio-botao)",
                    background: "var(--cor-card-suave)",
                    padding: "11px 18px",
                    fontSize: "var(--ts-botao)",
                    fontFamily: "var(--fonte-corpo)",
                    color: "var(--cor-texto-secundario)",
                    cursor: "pointer",
                    opacity: pendente || !motivo.trim() ? 0.55 : 1,
                  }}
                >
                  Enviar
                </button>
                <button
                  type="button"
                  onClick={() => setRecusando(false)}
                  style={{
                    minHeight: "var(--toque-min)",
                    border: "none",
                    background: "transparent",
                    fontSize: "var(--ts-botao)",
                    fontFamily: "var(--fonte-corpo)",
                    color: "var(--cor-texto-suave)",
                    cursor: "pointer",
                  }}
                >
                  Voltar
                </button>
              </div>
              {erro && (
                <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-atencao)" }}>
                  {erro}
                </p>
              )}
            </Cartao>
          ) : (
            <button
              type="button"
              onClick={() => setRecusando(true)}
              style={{
                border: "none",
                background: "transparent",
                padding: "12px 0",
                fontSize: "var(--ts-acao)",
                fontFamily: "var(--fonte-corpo)",
                color: "var(--cor-ouro-texto)",
                cursor: "pointer",
              }}
            >
              Nenhuma dessas nos agradou
            </button>
          )}
        </div>
      )}
    </div>
  );
}
