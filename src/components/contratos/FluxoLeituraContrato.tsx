"use client";

// O fluxo de leitura de um contrato: ler no navegador → prévia redigida
// → enviar para extração. SEM moldura — quem embala (caixa âmbar da aba
// Fornecedores, linha expandida da tela de Contratos) decide a roupa.
//
// O PDF nunca viaja; o texto sai redigido e ela VÊ o que será enviado.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lerContratoNoNavegador } from "@/lib/pdf-texto-cliente";
import {
  redigirParaExtracao,
  type PropostaExtracao,
} from "@/lib/contrato-extracao-core";

type Fase =
  | { nome: "inicio" }
  | { nome: "lendo" }
  | { nome: "previa"; texto: string; redigidos: number }
  | { nome: "enviando"; texto: string };

export function FluxoLeituraContrato({
  eventId,
  solicitacaoId,
  arquivoPath,
  aoProposta,
}: {
  eventId: string;
  solicitacaoId: string;
  arquivoPath: string;
  /** chamada quando a proposta nasce (o pai decide como renderizá-la) */
  aoProposta: (id: string, payload: PropostaExtracao) => void;
}) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>({ nome: "inicio" });
  const [erro, setErro] = useState<string | null>(null);

  async function ler() {
    setErro(null);
    setFase({ nome: "lendo" });
    try {
      const bruto = await lerContratoNoNavegador(arquivoPath);
      if (bruto.trim().length < 50) {
        setFase({ nome: "inicio" });
        setErro(
          "Este PDF parece ser digitalizado (imagem, sem camada de texto). Nada foi enviado — lance os dados à mão."
        );
        return;
      }
      const { texto, redigidos } = redigirParaExtracao(bruto);
      setFase({ nome: "previa", texto, redigidos });
    } catch {
      setFase({ nome: "inicio" });
      setErro("Não consegui ler este arquivo. Abra o contrato e lance à mão.");
    }
  }

  async function enviar(texto: string) {
    setErro(null);
    setFase({ nome: "enviando", texto });
    try {
      const resp = await fetch("/api/ai/extrair-contrato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, solicitacaoId, texto }),
      });
      const data = (await resp.json()) as {
        id?: string;
        proposta?: PropostaExtracao;
        error?: string;
      };
      if (!resp.ok || !data.id || !data.proposta) {
        setFase({ nome: "inicio" });
        setErro(data.error ?? "A leitura não respondeu agora. Tente de novo.");
        return;
      }
      setFase({ nome: "inicio" });
      aoProposta(data.id, data.proposta);
      router.refresh();
    } catch {
      setFase({ nome: "inicio" });
      setErro("A leitura não respondeu agora. Tente de novo.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {fase.nome === "inicio" && (
          <button
            onClick={ler}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-amber-700"
          >
            Ler o contrato
          </button>
        )}
        {fase.nome === "lendo" && (
          <span className="text-[12px] text-gray-500">Lendo o PDF aqui no navegador…</span>
        )}
        {fase.nome === "enviando" && (
          <span className="text-[12px] text-gray-500">Extraindo…</span>
        )}
      </div>

      {erro && <p className="mt-1.5 text-[12px] text-red-600">{erro}</p>}

      {fase.nome === "previa" && (
        <div className="mt-2.5 space-y-2">
          <p className="text-[12px] text-gray-600">
            O PDF ficou nesta máquina. O texto abaixo é o que será enviado para
            a leitura
            {fase.redigidos > 0
              ? ` — ${fase.redigidos} dado(s) sensível(is) já removido(s):`
              : ":"}
          </p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-2 text-[11px] leading-relaxed text-gray-700">
            {fase.texto}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={() => enviar(fase.texto)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-amber-700"
            >
              Enviar para leitura
            </button>
            <button
              onClick={() => setFase({ nome: "inicio" })}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12.5px] font-medium text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
