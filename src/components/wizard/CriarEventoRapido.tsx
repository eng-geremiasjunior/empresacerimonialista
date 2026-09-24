"use client";

// Criar evento numa tela só (24/09/2026): tipo, cliente e data, e um botão.
//
// Eram quatro etapas (Tipo, Cliente, Dados, Configuração) — contra a regra
// do produto de no máximo 3 cliques para criar um evento. A conta criada às
// 18:55 de 24/09 passou 4 minutos nelas e caiu num evento vazio; na maioria
// das contas, o formulário foi a tela mais longa do primeiro dia.
//
// O que ficou de fora daqui NÃO some: local, convidados, valor, responsável
// e as perguntas de configuração estão no assistente completo, a um clique
// ("Preencher mais detalhes"), e todos podem ser ditos depois, no evento.
//
// O evento nasce COM o roteiro padrão do tipo (o mesmo do assistente
// completo): o primeiro evento vai direto para o Roteiro do dia, e roteiro
// vazio não mostra nada.

import { useEffect, useState } from "react";
import { EventTypeIcon } from "@/components/EventTypeIcon";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { ORDEM_DOS_TIPOS } from "./StepTipoEvento";
import type { ClienteEscolhido, ClientOption } from "./StepCliente";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 sm:text-sm";

type Props = {
  tipo: EventType | null;
  onTipo: (t: EventType) => void;
  clients: ClientOption[];
  cliente: ClienteEscolhido | null;
  onCliente: (c: ClienteEscolhido | null) => void;
  data: string;
  onData: (d: string) => void;
  creating: boolean;
  error: string | null;
  onCriar: () => void;
  onMaisDetalhes: () => void;
};

function nomeDo(c: ClienteEscolhido | null): string {
  if (!c) return "";
  return c.kind === "existing" ? c.client.name : c.name;
}

export function CriarEventoRapido({
  tipo,
  onTipo,
  clients,
  cliente,
  onCliente,
  data,
  onData,
  creating,
  error,
  onCriar,
  onMaisDetalhes,
}: Props) {
  const [nome, setNome] = useState(nomeDo(cliente));
  // O briefing (ou a cliente vinda da URL) pode preencher o nome depois.
  // Só troca quando o nome de fora é OUTRO: o que ela digita volta aparado
  // de onCliente, e sobrescrever comeria o espaço entre as palavras.
  useEffect(() => {
    const vindo = nomeDo(cliente);
    setNome((atual) => (atual.trim() === vindo.trim() ? atual : vindo));
  }, [cliente]);

  // Um campo só para a cliente: o nome que bate com uma cliente cadastrada
  // usa a cadastrada; qualquer outro vira cliente nova. O telefone que o
  // briefing trouxe continua junto.
  function mudarNome(v: string) {
    setNome(v);
    const limpo = v.trim();
    if (!limpo) {
      onCliente(null);
      return;
    }
    const existente = clients.find((c) => c.name.trim().toLowerCase() === limpo.toLowerCase());
    if (existente) {
      onCliente({ kind: "existing", client: existente });
      return;
    }
    onCliente({ kind: "new", name: limpo, phone: cliente?.kind === "new" ? cliente.phone : "" });
  }

  const pronto = tipo !== null && nome.trim().length > 0 && data !== "";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Novo evento</h2>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-stone-700">Tipo</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ORDEM_DOS_TIPOS.map((t) => {
            const ativo = tipo === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={ativo}
                onClick={() => onTipo(t)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  ativo
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-800 hover:border-stone-400"
                }`}
              >
                <EventTypeIcon type={t} size={16} className={ativo ? "text-white" : "text-stone-600"} />
                <span className="truncate">{EVENT_TYPE_LABELS[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rap_cliente" className="mb-1 block text-sm font-medium text-stone-700">
            Cliente
          </label>
          <input
            id="rap_cliente"
            type="text"
            list="rap_clientes"
            autoComplete="off"
            value={nome}
            onChange={(e) => mudarNome(e.target.value)}
            placeholder="Ex.: Marina e Pedro"
            className={inputClass}
          />
          {clients.length > 0 && (
            <datalist id="rap_clientes">
              {clients.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          )}
        </div>
        <div>
          <label htmlFor="rap_data" className="mb-1 block text-sm font-medium text-stone-700">
            Data
          </label>
          <input
            id="rap_data"
            type="date"
            value={data}
            onChange={(e) => onData(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-900" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={onCriar}
          disabled={!pronto || creating}
          className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-40"
        >
          {creating ? "Criando…" : "Criar evento"}
        </button>
        <button
          type="button"
          onClick={onMaisDetalhes}
          disabled={creating}
          className="text-sm text-stone-600 underline underline-offset-2 hover:text-stone-900"
        >
          Preencher mais detalhes antes de criar
        </button>
      </div>
    </div>
  );
}
