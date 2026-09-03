"use client";

// Colar o briefing: a conversa da noiva vira proposta de campos.
//
// O fluxo espelha a extração de contrato: ela cola → a prévia mostra
// EXATAMENTE o que sai (contatos já como marcadores) → envia → os
// campos do wizard nascem preenchidos e ela caminha os passos
// conferindo. O telefone real nunca viaja: vai [TELEFONE_1], volta
// [TELEFONE_1], e é trocado pelo número verdadeiro aqui, localmente.
//
// Da proposta v2, só a IDENTIDADE preenche o wizard; dinheiro de
// terceiro, quantidade e estilo esperam a conferência item a item. A
// volta dos contatos é feita pelo walker (restaurarProposta): marcador
// em campo que não é contato é vazamento e vira nulo, e trecho nenhum
// é restaurado.

import { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import {
  pseudonimizar,
  restaurarProposta,
  type MapaPseudonimos,
  type PropostaBriefingV2,
} from "@/lib/briefing-core";

type Fase =
  | { nome: "fechado" }
  | { nome: "colando" }
  | { nome: "previa"; texto: string; mapa: MapaPseudonimos; marcados: number }
  | { nome: "enviando" };

export function ColarBriefing({
  aoProposta,
}: {
  /** telefone/e-mail já restaurados localmente */
  aoProposta: (p: PropostaBriefingV2) => void;
}) {
  const [fase, setFase] = useState<Fase>({ nome: "fechado" });
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function preparar() {
    setErro(null);
    if (texto.trim().length < 20) {
      setErro("Cole a conversa ou o briefing (algumas linhas).");
      return;
    }
    const { texto: seguro, mapa } = pseudonimizar(texto);
    setFase({
      nome: "previa",
      texto: seguro,
      mapa,
      marcados: Object.keys(mapa).length,
    });
  }

  async function enviar(seguro: string, mapa: MapaPseudonimos) {
    setErro(null);
    setFase({ nome: "enviando" });
    try {
      const resp = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: seguro }),
      });
      const data = (await resp.json()) as {
        proposta?: PropostaBriefingV2;
        error?: string;
      };
      if (!resp.ok || !data.proposta) {
        setFase({ nome: "previa", texto: seguro, mapa, marcados: Object.keys(mapa).length });
        setErro(data.error ?? "A leitura não respondeu agora. Tente de novo.");
        return;
      }
      // os marcadores voltam a ser dado REAL aqui, localmente
      aoProposta(restaurarProposta(data.proposta, mapa));
      setFase({ nome: "fechado" });
      setTexto("");
    } catch {
      setFase({ nome: "previa", texto: seguro, mapa, marcados: Object.keys(mapa).length });
      setErro("A leitura não respondeu agora. Tente de novo.");
    }
  }

  if (fase.nome === "fechado") {
    return (
      <button
        onClick={() => setFase({ nome: "colando" })}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-left text-sm text-stone-600 hover:border-stone-400"
      >
        <ClipboardPaste size={16} className="shrink-0 text-stone-400" />
        <span>
          <span className="font-medium text-stone-800">Tem a conversa da cliente?</span>{" "}
          Cole aqui e os campos nascem preenchidos — você só confere.
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      {fase.nome === "colando" && (
        <>
          <textarea
            rows={6}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              "Cole a conversa de WhatsApp ou o briefing…\n" +
              "Ex.: 'Oi! Sou a Mariana, meu casamento é 15/03 na Fazenda Santa Clara, em Muriaé. Uns 180 convidados, orçamento até 45 mil.'"
            }
            className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          />
          {erro && <p className="mt-1.5 text-sm text-red-600">{erro}</p>}
          <div className="mt-2 flex gap-2">
            <button
              onClick={preparar}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={!texto.trim()}
            >
              Ler o briefing
            </button>
            <button
              onClick={() => {
                setFase({ nome: "fechado" });
                setErro(null);
              }}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {fase.nome === "previa" && (
        <div className="space-y-2">
          <p className="text-sm text-stone-600">
            O texto abaixo é o que será enviado para a leitura
            {fase.marcados > 0
              ? ` — ${fase.marcados} contato(s) já viraram marcadores; os números reais ficam nesta máquina e voltam aos campos sozinhos:`
              : ":"}
          </p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-stone-200 bg-stone-50 p-2 text-[11.5px] leading-relaxed text-stone-700">
            {fase.texto}
          </pre>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => enviar(fase.texto, fase.mapa)}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white"
            >
              Enviar para leitura
            </button>
            <button
              onClick={() => setFase({ nome: "colando" })}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {fase.nome === "enviando" && (
        <p className="text-sm text-stone-500">Lendo o briefing…</p>
      )}
    </div>
  );
}
